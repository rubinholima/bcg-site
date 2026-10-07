import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseDateOnlyBrazil } from '../common/brazil-time.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_VENUE_SLUG,
  VENUE_PAYMENT_METHODS,
  type VenueFinanceOverviewKpis,
  type VenueInstallmentComputedStatus,
  type VenueReceivableComputedStatus,
  type VenueReceivableDetailDto,
  type VenueReceivableInstallmentDto,
  type VenueReceivableListDto,
  type VenueReceivablePaymentDto,
  type VenueReceivableSummaryDto,
} from './boston-city-hall.constants';

function moneyToString(value: Prisma.Decimal | number | string): string {
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

function parseMoney(value: number | string, field = 'Valor'): Prisma.Decimal {
  const n =
    typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) {
    throw new BadRequestException(`${field} inválido.`);
  }
  return new Prisma.Decimal(n.toFixed(2));
}

function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

type PaymentRow = {
  id: string;
  installmentId: string;
  amount: Prisma.Decimal;
  paidAt: Date;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  voidedAt: Date | null;
  createdAt: Date;
};

type InstallmentRow = {
  id: string;
  sequence: number;
  label: string | null;
  dueDate: Date;
  amount: Prisma.Decimal;
  notes: string | null;
  cancelledAt: Date | null;
  payments: PaymentRow[];
};

function sumPayments(installment: InstallmentRow): Prisma.Decimal {
  return installment.payments
    .filter((p) => !p.voidedAt)
    .reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function computeInstallmentStatus(
  installment: InstallmentRow,
  receivableCancelled: boolean,
): VenueInstallmentComputedStatus {
  if (receivableCancelled || installment.cancelledAt) return 'cancelled';
  const paid = sumPayments(installment);
  const balance = installment.amount.sub(paid).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (balance.lte(0)) return 'paid';
  const today = startOfTodayLocal();
  if (paid.gt(0)) {
    return installment.dueDate < today ? 'overdue' : 'partial';
  }
  return installment.dueDate < today ? 'overdue' : 'pending';
}

function computeReceivableTotals(
  originalAmount: Prisma.Decimal,
  installments: InstallmentRow[],
  receivableCancelled: boolean,
) {
  let totalPaid = new Prisma.Decimal(0);
  let openBalance = new Prisma.Decimal(0);
  let overdueBalance = new Prisma.Decimal(0);
  let hasOverdue = false;
  let nextDue: Date | null = null;
  let nextDueAmount: Prisma.Decimal | null = null;
  const today = startOfTodayLocal();

  for (const inst of installments) {
    if (inst.cancelledAt) continue;
    const paid = sumPayments(inst);
    totalPaid = totalPaid.add(paid);
    const balance = inst.amount.sub(paid).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (balance.lte(0)) continue;
    openBalance = openBalance.add(balance);
    const st = computeInstallmentStatus(inst, receivableCancelled);
    if (st === 'overdue') {
      hasOverdue = true;
      overdueBalance = overdueBalance.add(balance);
    }
    if (inst.dueDate >= today && (nextDue === null || inst.dueDate < nextDue)) {
      nextDue = inst.dueDate;
      nextDueAmount = balance;
    }
  }

  totalPaid = totalPaid.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  openBalance = openBalance.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  overdueBalance = overdueBalance.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  let status: VenueReceivableComputedStatus = 'unpaid';
  if (receivableCancelled) status = 'cancelled';
  else if (openBalance.lte(0)) status = 'paid';
  else if (totalPaid.gt(0)) status = hasOverdue ? 'overdue' : 'partial';
  else if (hasOverdue) status = 'overdue';

  return {
    totalPaid,
    openBalance,
    overdueBalance,
    status,
    nextDue,
    nextDueAmount,
  };
}

const receivableInclude = {
  contract: {
    select: {
      contractNumber: true,
      contactName: true,
      companyName: true,
      title: true,
      eventDate: true,
      bookingId: true,
      total: true,
      status: true,
    },
  },
  installments: {
    orderBy: [{ sequence: 'asc' as const }],
    include: {
      payments: {
        where: { voidedAt: null },
        orderBy: [{ paidAt: 'asc' as const }],
      },
    },
  },
};

@Injectable()
export class BostonCityHallFinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant do venue "${venueSlug}" não encontrado.`);
    }
    return tenant.id;
  }

  private toPaymentDto(p: PaymentRow): VenueReceivablePaymentDto {
    return {
      id: p.id,
      installmentId: p.installmentId,
      amount: moneyToString(p.amount),
      paidAt: p.paidAt.toISOString(),
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    };
  }

  private toInstallmentDto(
    inst: InstallmentRow,
    receivableCancelled: boolean,
  ): VenueReceivableInstallmentDto {
    const paid = sumPayments(inst);
    const balance = inst.amount.sub(paid).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return {
      id: inst.id,
      sequence: inst.sequence,
      label: inst.label,
      dueDate: inst.dueDate.toISOString(),
      amount: moneyToString(inst.amount),
      paidAmount: moneyToString(paid),
      balance: moneyToString(balance.lte(0) ? new Prisma.Decimal(0) : balance),
      status: computeInstallmentStatus(inst, receivableCancelled),
      notes: inst.notes,
      payments: inst.payments.filter((p) => !p.voidedAt).map((p) => this.toPaymentDto(p)),
    };
  }

  /** Resumo a partir de receivable já carregado (evita N+1 na operação BCH). */
  receivableToSummary(
    row: {
      id: string;
      contractId: string;
      originalAmount: Prisma.Decimal;
      status: string;
      cancelledAt: Date | null;
      installments: InstallmentRow[];
    } | null | undefined,
  ): VenueReceivableSummaryDto | null {
    if (!row) return null;
    return this.buildSummary(row);
  }

  private buildSummary(
    row: {
      id: string;
      contractId: string;
      originalAmount: Prisma.Decimal;
      status: string;
      cancelledAt: Date | null;
      installments: InstallmentRow[];
    },
  ): VenueReceivableSummaryDto {
    const cancelled = row.status === 'cancelled' || !!row.cancelledAt;
    const totals = computeReceivableTotals(row.originalAmount, row.installments, cancelled);
    return {
      id: row.id,
      contractId: row.contractId,
      originalAmount: moneyToString(row.originalAmount),
      totalPaid: moneyToString(totals.totalPaid),
      balance: moneyToString(totals.openBalance),
      status: totals.status,
      nextDueDate: totals.nextDue?.toISOString() ?? null,
      nextDueAmount: totals.nextDueAmount ? moneyToString(totals.nextDueAmount) : null,
    };
  }

  private toListDto(
    row: Awaited<ReturnType<typeof this.loadReceivableRow>>,
  ): VenueReceivableListDto {
    const summary = this.buildSummary(row);
    return {
      ...summary,
      contractNumber: row.contract.contractNumber,
      contactName: row.contract.contactName,
      companyName: row.contract.companyName,
      title: row.contract.title,
      eventDate: row.contract.eventDate?.toISOString() ?? null,
      bookingId: row.contract.bookingId,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetailDto(
    row: Awaited<ReturnType<typeof this.loadReceivableRow>>,
  ): VenueReceivableDetailDto {
    const cancelled = row.status === 'cancelled' || !!row.cancelledAt;
    return {
      ...this.toListDto(row),
      notes: row.notes,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      installments: row.installments.map((i) => this.toInstallmentDto(i, cancelled)),
    };
  }

  private async loadReceivableRow(id: string, tenantId: string) {
    const row = await this.prisma.venueReceivable.findFirst({
      where: { id, tenantId },
      include: receivableInclude,
    });
    if (!row) throw new NotFoundException('Financeiro não encontrado');
    return row;
  }

  async getSummaryByContractId(
    contractId: string,
    tenantId?: string,
  ): Promise<VenueReceivableSummaryDto | null> {
    const tid = tenantId ?? (await this.resolveTenantId());
    const row = await this.prisma.venueReceivable.findFirst({
      where: { contractId, tenantId: tid },
      include: {
        installments: {
          orderBy: [{ sequence: 'asc' }],
          include: {
            payments: { where: { voidedAt: null }, orderBy: [{ paidAt: 'asc' }] },
          },
        },
      },
    });
    if (!row) return null;
    return this.buildSummary(row);
  }

  async getOverviewKpisForVenue(): Promise<VenueFinanceOverviewKpis> {
    const tenantId = await this.resolveTenantId();
    return this.getOverviewKpis(tenantId);
  }

  async getOverviewKpis(tenantId: string): Promise<VenueFinanceOverviewKpis> {
    const rows = await this.prisma.venueReceivable.findMany({
      where: { tenantId, status: { not: 'cancelled' } },
      include: {
        installments: {
          include: { payments: { where: { voidedAt: null } } },
        },
      },
    });

    let totalContracted = new Prisma.Decimal(0);
    let totalReceived = new Prisma.Decimal(0);
    let openBalance = new Prisma.Decimal(0);
    let overdueBalance = new Prisma.Decimal(0);
    let dueSoonBalance = new Prisma.Decimal(0);
    const today = startOfTodayLocal();
    const soon = addDays(today, 14);

    for (const row of rows) {
      totalContracted = totalContracted.add(row.originalAmount);
      const totals = computeReceivableTotals(row.originalAmount, row.installments, false);
      totalReceived = totalReceived.add(totals.totalPaid);
      openBalance = openBalance.add(totals.openBalance);
      overdueBalance = overdueBalance.add(totals.overdueBalance);
      for (const inst of row.installments) {
        if (inst.cancelledAt) continue;
        const paid = sumPayments(inst);
        const balance = inst.amount.sub(paid);
        if (balance.lte(0)) continue;
        if (inst.dueDate >= today && inst.dueDate <= soon) {
          dueSoonBalance = dueSoonBalance.add(balance);
        }
      }
    }

    return {
      totalContracted: moneyToString(totalContracted),
      totalReceived: moneyToString(totalReceived),
      openBalance: moneyToString(openBalance),
      overdueBalance: moneyToString(overdueBalance),
      dueSoonBalance: moneyToString(dueSoonBalance),
    };
  }

  async listReceivables(filters: {
    q?: string;
    status?: VenueReceivableComputedStatus | 'all';
    overdueOnly?: boolean;
    updatedFrom?: string;
  } = {}): Promise<VenueReceivableListDto[]> {
    const tenantId = await this.resolveTenantId();
    const rows = await this.prisma.venueReceivable.findMany({
      where: { tenantId },
      include: receivableInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });

    let list = rows.map((r) => this.toListDto(r));

    const q = filters.q?.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.contractNumber.toLowerCase().includes(q) ||
          r.contactName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.companyName?.toLowerCase().includes(q) ?? false),
      );
    }

    if (filters.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.overdueOnly) {
      list = list.filter((r) => r.status === 'overdue');
    }

    if (filters.updatedFrom?.trim()) {
      const d = new Date(filters.updatedFrom.trim());
      if (!Number.isNaN(d.getTime())) {
        list = list.filter((r) => new Date(r.updatedAt) >= d);
      }
    }

    return list;
  }

  async getReceivable(id: string): Promise<VenueReceivableDetailDto> {
    const tenantId = await this.resolveTenantId();
    const row = await this.loadReceivableRow(id, tenantId);
    return this.toDetailDto(row);
  }

  async createReceivable(dto: {
    contractId: string;
    notes?: string;
    installments: Array<{
      label?: string;
      dueDate: string;
      amount: number | string;
      notes?: string;
    }>;
  }): Promise<VenueReceivableDetailDto> {
    const tenantId = await this.resolveTenantId();
    const contractId = dto.contractId?.trim();
    if (!contractId) throw new BadRequestException('Contrato é obrigatório.');

    const contract = await this.prisma.venueContract.findFirst({
      where: { id: contractId, tenantId },
      include: { venueReceivable: { select: { id: true } } },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    if (contract.status !== 'signed') {
      throw new BadRequestException('Financeiro só pode ser criado para contrato assinado.');
    }
    if (contract.venueReceivable) {
      throw new ConflictException('Este contrato já possui financeiro.');
    }

    const items = dto.installments ?? [];
    if (items.length === 0) {
      throw new BadRequestException('Informe ao menos uma parcela.');
    }

    const parsed = items.map((it, idx) => ({
      sequence: idx + 1,
      label: it.label?.trim() || null,
      dueDate: parseDateOnlyBrazil(it.dueDate.trim()),
      amount: parseMoney(it.amount, `Parcela ${idx + 1}`),
      notes: it.notes?.trim() || null,
    }));

    const sum = parsed.reduce(
      (acc, it) => acc.add(it.amount),
      new Prisma.Decimal(0),
    );
    const expected = contract.total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const sumFixed = sum.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (!sumFixed.equals(expected)) {
      throw new BadRequestException(
        `Soma das parcelas (${moneyToString(sumFixed)}) deve ser igual ao total do contrato (${moneyToString(expected)}).`,
      );
    }

    const row = await this.prisma.$transaction(async (tx) => {
      return tx.venueReceivable.create({
        data: {
          tenantId,
          contractId,
          originalAmount: expected,
          status: 'active',
          notes: dto.notes?.trim() || null,
          installments: {
            create: parsed.map((p) => ({
              sequence: p.sequence,
              label: p.label,
              dueDate: p.dueDate,
              amount: p.amount,
              notes: p.notes,
            })),
          },
        },
        include: receivableInclude,
      });
    });

    return this.toDetailDto(row);
  }

  async registerPayment(
    receivableId: string,
    dto: {
      installmentId: string;
      amount: number | string;
      paidAt: string;
      paymentMethod: string;
      reference?: string;
      notes?: string;
    },
  ): Promise<VenueReceivableDetailDto> {
    const tenantId = await this.resolveTenantId();
    const row = await this.loadReceivableRow(receivableId, tenantId);
    if (row.status === 'cancelled' || row.cancelledAt) {
      throw new ForbiddenException('Financeiro cancelado.');
    }

    const installmentId = dto.installmentId?.trim();
    if (!installmentId) throw new BadRequestException('Parcela é obrigatória.');

    const inst = row.installments.find((i) => i.id === installmentId);
    if (!inst || inst.cancelledAt) {
      throw new BadRequestException('Parcela inválida.');
    }

    const method = dto.paymentMethod?.trim();
    if (!method || !VENUE_PAYMENT_METHODS.includes(method as (typeof VENUE_PAYMENT_METHODS)[number])) {
      throw new BadRequestException('Forma de pagamento inválida.');
    }

    const amount = parseMoney(dto.amount, 'Pagamento');
    const paidAtRaw = dto.paidAt?.trim();
    if (!paidAtRaw) throw new BadRequestException('Data do pagamento é obrigatória.');
    const paidAt = parseDateOnlyBrazil(paidAtRaw);

    const paid = sumPayments(inst);
    const balance = inst.amount.sub(paid).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (amount.gt(balance)) {
      throw new BadRequestException(
        `Pagamento excede o saldo da parcela (saldo: ${moneyToString(balance)}).`,
      );
    }

    await this.prisma.venueReceivablePayment.create({
      data: {
        tenantId,
        installmentId,
        amount,
        paidAt,
        paymentMethod: method,
        reference: dto.reference?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });

    await this.prisma.venueReceivable.update({
      where: { id: receivableId },
      data: { updatedAt: new Date() },
    });

    return this.getReceivable(receivableId);
  }

  async updateInstallment(
    receivableId: string,
    installmentId: string,
    dto: Partial<{
      label: string | null;
      dueDate: string;
      amount: number | string;
      notes: string | null;
    }>,
  ): Promise<VenueReceivableDetailDto> {
    const tenantId = await this.resolveTenantId();
    const row = await this.loadReceivableRow(receivableId, tenantId);
    if (row.status === 'cancelled') {
      throw new ForbiddenException('Financeiro cancelado.');
    }

    const inst = row.installments.find((i) => i.id === installmentId);
    if (!inst || inst.cancelledAt) throw new NotFoundException('Parcela não encontrada');

    const paid = sumPayments(inst);
    const data: Prisma.VenueReceivableInstallmentUpdateInput = {};

    if (dto.label !== undefined) data.label = dto.label?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.dueDate !== undefined) {
      data.dueDate = parseDateOnlyBrazil(dto.dueDate.trim());
    }
    if (dto.amount !== undefined) {
      if (paid.gt(0)) {
        throw new ForbiddenException(
          'Parcela com pagamento: não é permitido alterar o valor.',
        );
      }
      const newAmount = parseMoney(dto.amount, 'Valor da parcela');
      data.amount = newAmount;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.venueReceivableInstallment.update({ where: { id: installmentId }, data });
      if (dto.amount !== undefined) {
        const all = await tx.venueReceivableInstallment.findMany({
          where: { receivableId, cancelledAt: null },
        });
        const sum = all.reduce(
          (acc, i) => acc.add(i.amount),
          new Prisma.Decimal(0),
        );
        if (!sum.toDecimalPlaces(2).equals(row.originalAmount.toDecimalPlaces(2))) {
          throw new BadRequestException(
            'Ajuste de parcelas deve manter a soma igual ao total contratado.',
          );
        }
      }
      await tx.venueReceivable.update({
        where: { id: receivableId },
        data: { updatedAt: new Date() },
      });
    });

    return this.getReceivable(receivableId);
  }
}
