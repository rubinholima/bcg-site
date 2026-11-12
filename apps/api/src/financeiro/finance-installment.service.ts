import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceAuditService } from './finance-audit.service';
import { moneyDecimal, moneyToNumber, splitInstallmentAmounts } from './finance-money.util';
import { cadastroUpperRequired } from '../common/cadastro-text';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

@Injectable()
export class FinanceInstallmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  async generate(
    tenantId: string,
    input: {
      tipo: 'pagar' | 'receber';
      descricao: string;
      totalAmount: number;
      installmentCount: number;
      firstDueDate: string;
      employeeId?: string;
      currency?: string;
      reference?: string;
      basePayload?: Record<string, unknown>;
      idempotencyKey: string;
    },
    actorUserId?: string | null,
  ) {
    const dup = await this.prisma.financeInstallmentGroup.findFirst({
      where: { tenantId, reference: input.idempotencyKey.trim() },
    });
    if (dup) {
      return this.prisma.financeiroLancamento.findMany({
        where: { tenantId, installmentGroupId: dup.id },
        orderBy: { installmentNumber: 'asc' },
      });
    }

    const count = input.installmentCount;
    if (count < 1 || count > 120) throw new BadRequestException('Número de parcelas inválido.');
    const total = moneyDecimal(input.totalAmount);
    const parts = splitInstallmentAmounts(total, count);
    const firstDue = new Date(input.firstDueDate);

    const group = await this.prisma.financeInstallmentGroup.create({
      data: {
        tenantId,
        reference: input.idempotencyKey.trim(),
        totalAmount: total,
        installmentCount: count,
        currency: input.currency ?? 'BRL',
        tipo: input.tipo,
        employeeId: input.employeeId ?? null,
        createdByUserId: actorUserId ?? null,
      },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const out: Prisma.FinanceiroLancamentoGetPayload<object>[] = [];
      for (let i = 0; i < count; i++) {
        const due = addMonths(firstDue, i);
        const row = await tx.financeiroLancamento.create({
          data: {
            tenantId,
            tipo: input.tipo,
            status: 'pendente',
            ownershipKind: 'native',
            sourceModule: 'financeiro',
            sourceType: 'installment',
            sourceId: `${group.id}-${i + 1}`,
            recordOrigin: 'manual_cup360',
            descricao: cadastroUpperRequired(`${input.descricao} (${i + 1}/${count})`),
            valor: parts[i],
            originalAmount: parts[i],
            dueDate: due,
            currency: input.currency ?? 'BRL',
            installmentGroupId: group.id,
            installmentNumber: i + 1,
            installmentCount: count,
            employeeId: input.employeeId ?? null,
            ...(input.basePayload as object),
          },
        });
        out.push(row);
      }
      return out;
    });

    await this.audit.log({
      tenantId,
      eventType: 'installments_generated',
      actorUserId: actorUserId ?? null,
      metadata: { groupId: group.id, count },
    });

    return created.map((r) => ({ ...r, valor: moneyToNumber(r.valor) }));
  }

  async listByGroup(tenantId: string, groupId: string) {
    const rows = await this.prisma.financeiroLancamento.findMany({
      where: { tenantId, installmentGroupId: groupId },
      orderBy: { installmentNumber: 'asc' },
    });
    return rows.map((r) => ({
      ...r,
      valor: moneyToNumber(r.valor),
      amountSettledTotal: moneyToNumber(r.amountSettledTotal ?? 0),
    }));
  }

  async updateInstallmentDueDate(
    tenantId: string,
    lancamentoId: string,
    newDueDate: string,
    actorUserId?: string | null,
  ) {
    const row = await this.prisma.financeiroLancamento.findFirst({
      where: { id: lancamentoId, tenantId },
    });
    if (!row?.installmentGroupId) {
      throw new BadRequestException('Lançamento não pertence a um grupo de parcelas.');
    }
    if (row.status === 'pago' || row.status === 'cancelado') {
      throw new BadRequestException('Parcela quitada ou cancelada não pode ser alterada.');
    }
    const oldDue = row.dueDate;
    const updated = await this.prisma.financeiroLancamento.update({
      where: { id: lancamentoId },
      data: { dueDate: new Date(newDueDate) },
    });
    await this.audit.log({
      tenantId,
      financeiroLancamentoId: lancamentoId,
      eventType: 'installment_due_changed',
      actorUserId: actorUserId ?? null,
      metadata: { oldDueDate: oldDue.toISOString(), newDueDate },
    });
    return updated;
  }
}
