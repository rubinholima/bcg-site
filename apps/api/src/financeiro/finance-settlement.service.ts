import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceAuditService } from './finance-audit.service';
import { FinanceDelegationService } from './finance-delegation.service';
import { FinancePayrollDeductionService } from './finance-payroll-deduction.service';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { hasFinanceCapability } from './finance-access.util';
import { ModulesService } from '../modules/modules.service';
import {
  computeSettlementFinal,
  moneyDecimal,
  moneyToNumber,
  moneyZero,
  obligationAmount,
} from './finance-money.util';

export type CreateSettlementInput = {
  tenantId: string;
  financeiroLancamentoId: string;
  idempotencyKey: string;
  settledAt: string;
  amountSettled: number;
  interestAmount?: number;
  penaltyAmount?: number;
  discountAmount?: number;
  abatementAmount?: number;
  otherAdjustmentAmount?: number;
  financePaymentMethodId?: string;
  actualFinanceAccountId: string;
  manualSettlement?: boolean;
  manualReason?: string;
  accountOverrideReason?: string;
  referenceNotes?: string;
};

@Injectable()
export class FinanceSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
    private readonly delegations: FinanceDelegationService,
    private readonly payrollDeduction: FinancePayrollDeductionService,
    private readonly modulesService: ModulesService,
  ) {}

  private async assertPayPermission(
    user: CognitoJwtPayload,
    tenantId: string,
    opts: { manual?: boolean; accountOverride?: boolean },
  ) {
    const role = user.role ?? user['cognito:groups']?.[0] ?? 'user';
    if (role === 'super_admin' || role === 'company_admin') return;
    const slugs = await this.modulesService.getSlugsForActor(user.sub, role);
    const userId = user.sub;
    const canPay =
      hasFinanceCapability(slugs, 'finance_pay', role) ||
      (await this.delegations.hasActiveDelegation(tenantId, userId, 'finance_pay'));
    if (!canPay) throw new ForbiddenException('Sem permissão para registrar pagamento.');

    if (opts.manual) {
      const canManual =
        hasFinanceCapability(slugs, 'finance_manual_settlement', role) ||
        (await this.delegations.hasActiveDelegation(tenantId, userId, 'finance_manual_settlement'));
      if (!canManual) throw new ForbiddenException('Sem permissão para baixa manual.');
    }
    if (opts.accountOverride) {
      const canOverride =
        hasFinanceCapability(slugs, 'finance_payment_account_override', role) ||
        (await this.delegations.hasActiveDelegation(
          tenantId,
          userId,
          'finance_payment_account_override',
        ));
      if (!canOverride) throw new ForbiddenException('Sem permissão para alterar conta de pagamento.');
    }
  }

  async createSettlement(
    user: CognitoJwtPayload,
    actorUserId: string | null,
    actorName: string | null,
    input: CreateSettlementInput,
  ) {
    const existing = await this.prisma.financeSettlement.findFirst({
      where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey.trim() },
    });
    if (existing) return this.serializeSettlement(existing);

    const lanc = await this.prisma.financeiroLancamento.findFirst({
      where: { id: input.financeiroLancamentoId, tenantId: input.tenantId },
    });
    if (!lanc) throw new NotFoundException('Lançamento não encontrado.');
    if (lanc.status === 'cancelado') {
      throw new BadRequestException('Lançamento cancelado não pode ser baixado.');
    }
    const legacyCount = await this.prisma.financeSettlement.count({
      where: { financeiroLancamentoId: lanc.id },
    });
    if (legacyCount === 0 && lanc.status === 'pago' && lanc.settledAt) {
      throw new BadRequestException(
        'Registro com baixa legada. Use fluxo de correção ou conciliação.',
      );
    }

    const plannedId = lanc.financeAccountId;
    const actualId = input.actualFinanceAccountId.trim();
    const accountOverride = Boolean(plannedId && plannedId !== actualId);
    if (accountOverride && !input.accountOverrideReason?.trim()) {
      throw new BadRequestException('Informe o motivo da conta efetiva diferente da planejada.');
    }

    await this.assertPayPermission(user, input.tenantId, {
      manual: input.manualSettlement,
      accountOverride,
    });

    const account = await this.prisma.financeAccount.findFirst({
      where: { id: actualId, tenantId: input.tenantId, active: true },
    });
    if (!account) throw new BadRequestException('Conta financeira efetiva inválida.');
    if (account.currency !== lanc.currency) {
      throw new BadRequestException('Moeda da conta incompatível com o lançamento.');
    }

    const amountSettled = moneyDecimal(input.amountSettled);
    if (amountSettled.lte(0)) throw new BadRequestException('Valor da baixa deve ser positivo.');

    const finalAmount = computeSettlementFinal({
      amountSettled,
      interestAmount: moneyDecimal(input.interestAmount ?? 0),
      penaltyAmount: moneyDecimal(input.penaltyAmount ?? 0),
      discountAmount: moneyDecimal(input.discountAmount ?? 0),
      abatementAmount: moneyDecimal(input.abatementAmount ?? 0),
      otherAdjustmentAmount: moneyDecimal(input.otherAdjustmentAmount ?? 0),
    });

    const ob = obligationAmount(lanc);
    const already = moneyDecimal(lanc.amountSettledTotal);
    const remaining = ob.sub(already);
    if (finalAmount.gt(remaining)) {
      throw new BadRequestException('Baixa excede o saldo em aberto do lançamento.');
    }

    const isPayrollMethod =
      input.financePaymentMethodId != null
        ? (
            await this.prisma.financePaymentMethod.findFirst({
              where: { id: input.financePaymentMethodId, tenantId: input.tenantId },
            })
          )?.semanticKey === 'PAYROLL_DEDUCTION'
        : false;

    try {
      const settlement = await this.prisma.$transaction(async (tx) => {
        const row = await tx.financeSettlement.create({
          data: {
            tenantId: input.tenantId,
            financeiroLancamentoId: lanc.id,
            idempotencyKey: input.idempotencyKey.trim(),
            settledAt: new Date(input.settledAt),
            amountSettled,
            interestAmount: moneyDecimal(input.interestAmount ?? 0),
            penaltyAmount: moneyDecimal(input.penaltyAmount ?? 0),
            discountAmount: moneyDecimal(input.discountAmount ?? 0),
            abatementAmount: moneyDecimal(input.abatementAmount ?? 0),
            otherAdjustmentAmount: moneyDecimal(input.otherAdjustmentAmount ?? 0),
            finalAmount,
            financePaymentMethodId: input.financePaymentMethodId ?? null,
            plannedFinanceAccountId: plannedId,
            actualFinanceAccountId: actualId,
            manualSettlement: input.manualSettlement ?? false,
            manualReason: input.manualReason?.trim() || null,
            accountOverride,
            accountOverrideReason: accountOverride
              ? input.accountOverrideReason?.trim() || null
              : null,
            referenceNotes: input.referenceNotes?.trim() || null,
            performedByUserId: actorUserId,
            performedByName: actorName,
          },
        });

        const newTotal = already.add(finalAmount);
        const fullySettled = newTotal.gte(ob);
        const nextStatus = fullySettled ? 'pago' : 'parcial';

        await tx.financeiroLancamento.update({
          where: { id: lanc.id },
          data: {
            amountSettledTotal: newTotal,
            financeAccountSettledId: actualId,
            status: nextStatus,
            settledAt: fullySettled ? new Date(input.settledAt) : lanc.settledAt,
            settlementAmount: fullySettled ? finalAmount : lanc.settlementAmount,
          },
        });

        return row;
      });

      await this.audit.log({
        tenantId: input.tenantId,
        financeiroLancamentoId: lanc.id,
        eventType: input.manualSettlement ? 'manual_settlement' : 'settled',
        actorUserId,
        actorName,
        metadata: {
          settlementId: settlement.id,
          plannedFinanceAccountId: plannedId,
          actualFinanceAccountId: actualId,
          accountOverride,
          finalAmount: moneyToNumber(finalAmount),
        },
      });

      if (accountOverride) {
        await this.audit.log({
          tenantId: input.tenantId,
          financeiroLancamentoId: lanc.id,
          eventType: 'payment_account_override',
          actorUserId,
          actorName,
          metadata: {
            plannedFinanceAccountId: plannedId,
            actualFinanceAccountId: actualId,
            reason: input.accountOverrideReason,
          },
        });
      }

      if (isPayrollMethod && lanc.tipo === 'receber') {
        // handled by payroll deduction scheduler — cash settlement cancels link
      } else if (lanc.payrollDeductionStatus !== 'none') {
        await this.payrollDeduction.cancelForCashSettlement(
          input.tenantId,
          lanc.id,
          actorUserId,
        );
      }

      return this.serializeSettlement(settlement);
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') {
        const dup = await this.prisma.financeSettlement.findFirst({
          where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey.trim() },
        });
        if (dup) return this.serializeSettlement(dup);
      }
      throw e;
    }
  }

  async listSettlements(tenantId: string, lancamentoId: string) {
    const rows = await this.prisma.financeSettlement.findMany({
      where: { tenantId, financeiroLancamentoId: lancamentoId },
      orderBy: { settledAt: 'asc' },
    });
    return rows.map((r) => this.serializeSettlement(r));
  }

  async pendingByPlannedAccount(
    tenantId: string,
    financeAccountId: string,
    tipo: 'pagar' | 'receber',
  ) {
    const rows = await this.prisma.financeiroLancamento.findMany({
      where: {
        tenantId,
        tipo,
        financeAccountId,
        status: { in: ['pendente', 'parcial'] },
        transactionKind: { not: 'internal_transfer' },
      },
      orderBy: { dueDate: 'asc' },
      take: 500,
    });
    return rows.map((r) => ({
      ...r,
      valor: moneyToNumber(r.valor),
      amountSettledTotal: moneyToNumber(r.amountSettledTotal),
      remainingBalance: moneyToNumber(obligationAmount(r).sub(r.amountSettledTotal)),
      legacySettled:
        r.status === 'pago' &&
        r.settledAt != null &&
        !(r as { settlements?: unknown[] }).settlements,
    }));
  }

  serializeSettlement(row: {
    id: string;
    tenantId: string;
    financeiroLancamentoId: string;
    settledAt: Date;
    amountSettled: Prisma.Decimal;
    finalAmount: Prisma.Decimal;
    manualSettlement: boolean;
    accountOverride: boolean;
    [key: string]: unknown;
  }) {
    return {
      ...row,
      amountSettled: moneyToNumber(row.amountSettled as Prisma.Decimal),
      finalAmount: moneyToNumber(row.finalAmount as Prisma.Decimal),
    };
  }

  legacyInfo(lanc: {
    status: string;
    settledAt: Date | null;
    settlements?: { length: number } | unknown[];
  }) {
    const count = Array.isArray(lanc.settlements) ? lanc.settlements.length : 0;
    return {
      isLegacySettled: lanc.status === 'pago' && lanc.settledAt != null && count === 0,
      label: 'Baixa legada',
    };
  }

  remainingBalance(lanc: {
    originalAmount?: Prisma.Decimal | null;
    valor: Prisma.Decimal;
    amountSettledTotal: Prisma.Decimal;
  }): number {
    return moneyToNumber(obligationAmount(lanc).sub(lanc.amountSettledTotal));
  }
}
