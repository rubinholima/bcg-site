import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceAuditService } from './finance-audit.service';
import { moneyDecimal, moneyToNumber } from './finance-money.util';

@Injectable()
export class FinancePayrollDeductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  async getLinkForLancamento(tenantId: string, lancamentoId: string) {
    return this.prisma.financePayrollDeductionLink.findFirst({
      where: { tenantId, financeiroLancamentoId: lancamentoId },
    });
  }

  async scheduleForReceivable(
    tenantId: string,
    lancamentoId: string,
    input: {
      employmentId: string;
      employeeId: string;
      competenceMonth: string;
      idempotencyKey: string;
      amount: number;
    },
    actorUserId?: string | null,
  ) {
    const lanc = await this.prisma.financeiroLancamento.findFirst({
      where: { id: lancamentoId, tenantId, tipo: 'receber' },
    });
    if (!lanc) throw new NotFoundException('Conta a receber não encontrada.');

    const employment = await this.prisma.employment.findFirst({
      where: { id: input.employmentId, tenantId, employeeId: input.employeeId },
    });
    if (!employment) throw new BadRequestException('Vínculo inválido para desconto em folha.');

    const existing = await this.prisma.financePayrollDeductionLink.findFirst({
      where: { tenantId, idempotencyKey: input.idempotencyKey.trim() },
    });
    if (existing) return existing;

    const link = await this.prisma.financePayrollDeductionLink.create({
      data: {
        tenantId,
        financeiroLancamentoId: lancamentoId,
        employmentId: input.employmentId,
        employeeId: input.employeeId,
        competenceMonth: new Date(input.competenceMonth),
        amount: moneyDecimal(input.amount),
        status: 'scheduled',
        idempotencyKey: input.idempotencyKey.trim(),
      },
    });

    await this.prisma.financeiroLancamento.update({
      where: { id: lancamentoId },
      data: { payrollDeductionStatus: 'scheduled' },
    });

    await this.tryAttachToOpenClosing(tenantId, link.id);

    await this.audit.log({
      tenantId,
      financeiroLancamentoId: lancamentoId,
      eventType: 'payroll_deduction_scheduled',
      actorUserId: actorUserId ?? null,
      metadata: { linkId: link.id, competenceMonth: input.competenceMonth },
    });

    return link;
  }

  async tryAttachToOpenClosing(tenantId: string, linkId: string) {
    const link = await this.prisma.financePayrollDeductionLink.findFirst({
      where: { id: linkId, tenantId },
    });
    if (!link || link.status !== 'scheduled') return link;

    const month = link.competenceMonth;
    const closing = await this.prisma.rhPayrollClosing.findFirst({
      where: {
        tenantId,
        referenceMonth: month,
        status: { in: ['em_preparacao', 'em_conferencia', 'RH_APPROVED', 'correction'] },
      },
    });
    if (!closing) return link;

    const adjustment = await this.prisma.rhPayrollAdjustment.create({
      data: {
        tenantId,
        payrollClosingId: closing.id,
        employmentId: link.employmentId,
        adjustmentType: 'finance_receivable_deduction',
        amount: link.amount,
        reason: `Desconto CUP360 Finance — parcela ${link.financeiroLancamentoId}`,
        notes: JSON.stringify({ financeLancamentoId: link.financeiroLancamentoId, linkId: link.id }),
      },
    });

    return this.prisma.financePayrollDeductionLink.update({
      where: { id: link.id },
      data: {
        rhPayrollAdjustmentId: adjustment.id,
        status: 'linked',
      },
    });
  }

  async cancelForCashSettlement(tenantId: string, lancamentoId: string, actorUserId?: string | null) {
    const link = await this.prisma.financePayrollDeductionLink.findFirst({
      where: { tenantId, financeiroLancamentoId: lancamentoId },
    });
    if (!link) return;

    if (link.status === 'confirmed') {
      throw new BadRequestException(
        'Desconto em folha já confirmado. Use fluxo corretivo explícito.',
      );
    }

    if (link.rhPayrollAdjustmentId && (link.status === 'linked' || link.status === 'included')) {
      const adj = await this.prisma.rhPayrollAdjustment.findUnique({
        where: { id: link.rhPayrollAdjustmentId },
      });
      if (adj && adj.status === 'registrado') {
        await this.prisma.rhPayrollAdjustment.delete({ where: { id: adj.id } });
      } else if (adj) {
        throw new BadRequestException(
          'Ajuste de folha já processado. Reversão automática bloqueada.',
        );
      }
    }

    await this.prisma.financePayrollDeductionLink.update({
      where: { id: link.id },
      data: { status: 'cancelled' },
    });
    await this.prisma.financeiroLancamento.update({
      where: { id: lancamentoId },
      data: { payrollDeductionStatus: 'cancelled' },
    });
    await this.audit.log({
      tenantId,
      financeiroLancamentoId: lancamentoId,
      eventType: 'payroll_deduction_cancelled',
      actorUserId: actorUserId ?? null,
    });
  }

  async confirmFromPayroll(tenantId: string, lancamentoId: string, actorUserId?: string | null) {
    const link = await this.prisma.financePayrollDeductionLink.findFirst({
      where: { tenantId, financeiroLancamentoId: lancamentoId },
    });
    if (!link) throw new NotFoundException('Vínculo de desconto não encontrado.');
    if (link.status !== 'linked' && link.status !== 'included') {
      throw new BadRequestException('Desconto ainda não elegível para confirmação.');
    }
    await this.prisma.financePayrollDeductionLink.update({
      where: { id: link.id },
      data: { status: 'confirmed' },
    });
    await this.prisma.financeiroLancamento.update({
      where: { id: lancamentoId },
      data: { payrollDeductionStatus: 'confirmed' },
    });
    await this.audit.log({
      tenantId,
      financeiroLancamentoId: lancamentoId,
      eventType: 'payroll_deduction_confirmed',
      actorUserId: actorUserId ?? null,
    });
    return { ok: true, amount: moneyToNumber(link.amount) };
  }
}
