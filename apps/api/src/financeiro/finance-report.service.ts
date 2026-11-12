import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceAuditService } from './finance-audit.service';
import {
  computeSettlementFinal,
  moneyDecimal,
  moneyToNumber,
  obligationAmount,
} from './finance-money.util';
import { parseReportFiltersFromQuery } from './finance-report-filter.util';
import { resolveReportPeriod } from './finance-report-period.util';
import {
  applyPeriodToLancamento,
  baseOperatingWhere,
  categoryKeyForBreakdown,
  legacyCategoryLabel,
  obligationReportAmount,
  remainingBalanceNum,
} from './finance-report-query.util';
import type { FinanceReportFiltersInput, FinanceReportSummaryKpis } from './finance-report.types';

export const DETAILED_INCLUDE = {
  tenant: { select: { id: true, name: true, tradeName: true, legalName: true, taxId: true } },
  supplier: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
  financeAccount: { select: { id: true, name: true, accountType: true } },
  financeAccountSettled: { select: { id: true, name: true, accountType: true } },
  financeCategory: { select: { id: true, name: true, parentId: true } },
  financePaymentMethod: { select: { id: true, name: true, semanticKey: true } },
  allocationLines: {
    include: { financeCategory: { select: { id: true, name: true, parentId: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
  settlements: {
    orderBy: { settledAt: 'desc' as const },
    include: {
      actualFinanceAccount: { select: { id: true, name: true } },
      plannedFinanceAccount: { select: { id: true, name: true } },
      financePaymentMethod: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.FinanceiroLancamentoInclude;

type DetailedLancamento = Prisma.FinanceiroLancamentoGetPayload<{ include: typeof DETAILED_INCLUDE }>;

function decNum(v: Prisma.Decimal | null | undefined): number {
  return moneyToNumber(moneyDecimal(v ?? 0));
}

@Injectable()
export class FinanceReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  parseFilters(query: Record<string, string | undefined>, tenantIds: string[]) {
    return parseReportFiltersFromQuery(query, tenantIds);
  }

  private periodBounds(input: FinanceReportFiltersInput) {
    return resolveReportPeriod(input.periodPreset, input.startDate, input.endDate);
  }

  private lancWhereInPeriod(input: FinanceReportFiltersInput) {
    const period = this.periodBounds(input);
    const base = baseOperatingWhere(input);
    return { where: applyPeriodToLancamento(base, input, period), period };
  }

  private settlementWhere(input: FinanceReportFiltersInput) {
    const period = this.periodBounds(input);
    const lancBase = baseOperatingWhere(input);
    const where: Prisma.FinanceSettlementWhereInput = {
      tenantId: input.tenantIds.length === 1 ? input.tenantIds[0] : { in: input.tenantIds },
      settledAt: { gte: period.start, lte: period.end },
      financeiroLancamento: lancBase,
    };
    if (input.actualFinanceAccountIds?.length) {
      where.actualFinanceAccountId = { in: input.actualFinanceAccountIds };
    }
    return { where, period };
  }

  async getSummary(input: FinanceReportFiltersInput): Promise<FinanceReportSummaryKpis> {
    const { period } = this.lancWhereInPeriod(input);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let receitas = 0;
    let despesas = 0;
    let juros = 0;
    let multas = 0;
    let descontos = 0;
    let pagoRecebidoNoPeriodo = 0;

    if (input.view === 'cash' || input.dateBasis === 'settlement') {
      const { where } = this.settlementWhere(input);
      const settlements = await this.prisma.financeSettlement.findMany({
        where,
        include: {
          financeiroLancamento: { select: { tipo: true, transactionKind: true } },
        },
      });
      for (const s of settlements) {
        if (s.financeiroLancamento.transactionKind === 'internal_transfer') continue;
        const final = moneyToNumber(s.finalAmount);
        pagoRecebidoNoPeriodo += final;
        if (s.financeiroLancamento.tipo === 'receber') receitas += final;
        else despesas += final;
        juros += moneyToNumber(s.interestAmount);
        multas += moneyToNumber(s.penaltyAmount);
        descontos += moneyToNumber(s.discountAmount);
      }
    } else {
      const { where } = this.lancWhereInPeriod(input);
      const rows = await this.prisma.financeiroLancamento.findMany({
        where,
        include: { allocationLines: true },
      });
      for (const row of rows) {
        const amt = obligationReportAmount(row, input.categoryIds);
        if (amt <= 0) continue;
        if (row.tipo === 'receber') receitas += amt;
        else despesas += amt;
        juros += decNum(row.interestAmount);
        multas += decNum(row.penaltyAmount);
        descontos += decNum(row.discountAmount);
      }
    }

    const openWhere: Prisma.FinanceiroLancamentoWhereInput = {
      ...baseOperatingWhere(input),
      status: { in: ['pendente', 'parcial'] },
    };

    const openRows = await this.prisma.financeiroLancamento.findMany({
      where: openWhere,
      select: {
        tipo: true,
        dueDate: true,
        originalAmount: true,
        valor: true,
        amountSettledTotal: true,
      },
    });

    let contasAPagar = 0;
    let contasAReceber = 0;
    let vencidoAPagar = 0;
    let vencidoAReceber = 0;
  let pendenteCount = 0;
  let parcialCount = 0;

    for (const r of openRows) {
      const rem = remainingBalanceNum(r);
      if (rem <= 0) continue;
      if (r.tipo === 'pagar') contasAPagar += rem;
      else contasAReceber += rem;
      const overdue = r.dueDate < todayStart;
      if (overdue) {
        if (r.tipo === 'pagar') vencidoAPagar += rem;
        else vencidoAReceber += rem;
      }
    }

    const statusCounts = await this.prisma.financeiroLancamento.groupBy({
      by: ['status'],
      where: baseOperatingWhere(input),
      _count: true,
    });
    for (const g of statusCounts) {
      if (g.status === 'pendente') pendenteCount = g._count;
      if (g.status === 'parcial') parcialCount = g._count;
    }

    if (input.view === 'obligation' && input.dateBasis !== 'settlement') {
      const { where: cashWhere } = this.settlementWhere(input);
      const agg = await this.prisma.financeSettlement.aggregate({
        where: cashWhere,
        _sum: { finalAmount: true },
      });
      pagoRecebidoNoPeriodo = decNum(agg._sum.finalAmount);
    }

    const resultado = receitas - despesas;

    return {
      receitas,
      despesas,
      resultado,
      contasAPagar,
      contasAReceber,
      vencidoAPagar,
      vencidoAReceber,
      pagoRecebidoNoPeriodo,
      juros,
      multas,
      descontos,
      pendenteCount,
      parcialCount,
      dateBasis: input.dateBasis,
      view: input.view,
      periodStart: period.start.toISOString().slice(0, 10),
      periodEnd: period.end.toISOString().slice(0, 10),
    };
  }

  private mapDetailedRow(row: DetailedLancamento) {
    const ob = moneyToNumber(obligationAmount(row));
    const settled = moneyToNumber(row.amountSettledTotal);
    const rem = Math.max(0, ob - settled);
    const catName =
      row.financeCategory?.name ??
      (row.categoria?.trim() ? row.categoria.trim() : legacyCategoryLabel(null));
    const parentName = row.financeCategory?.parentId
      ? null
      : row.financeCategory?.name ?? null;

    return {
      id: row.id,
      empresa: row.tenant.tradeName ?? row.tenant.name,
      empresaLegal: row.tenant.legalName,
      cnpj: row.tenant.taxId,
      tipo: row.tipo,
      descricao: row.descricao,
      fornecedor: row.supplier?.name ?? null,
      cliente: row.customer?.name ?? null,
      colaborador: row.employee?.name ?? null,
      contraparte: row.contraparte,
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      referencia: row.referencia,
      emissao: row.issueDate?.toISOString().slice(0, 10) ?? null,
      competencia: row.competenceDate?.toISOString().slice(0, 10) ?? null,
      vencimento: row.dueDate.toISOString().slice(0, 10),
      dataProgramada: row.scheduledPaymentDate?.toISOString().slice(0, 10) ?? null,
      dataBaixa: row.settledAt?.toISOString().slice(0, 10) ?? null,
      valorOriginal: ob,
      juros: decNum(row.interestAmount),
      multa: decNum(row.penaltyAmount),
      desconto: decNum(row.discountAmount),
      valorLiquidado: settled,
      saldo: rem,
      categoria: catName,
      subcategoria: parentName ? catName : null,
      categoriaLegada: !row.financeCategoryId && row.categoria ? row.categoria : null,
      contaProgramada: row.financeAccount?.name ?? null,
      contaUtilizada: row.financeAccountSettled?.name ?? null,
      formaPagamento: row.financePaymentMethod?.name ?? null,
      status: row.status,
      conciliacao: row.reconciliationStatus,
      origem: row.recordOrigin,
      moduloOrigem: row.sourceModule,
      transactionKind: row.transactionKind,
      rateio: row.allocationLines.map((a) => ({
        id: a.id,
        categoria: a.financeCategory?.name ?? legacyCategoryLabel(null),
        valor: moneyToNumber(a.amount),
      })),
      baixas: row.settlements.map((s) => ({
        id: s.id,
        data: s.settledAt.toISOString(),
        valor: moneyToNumber(s.finalAmount),
        conta: s.actualFinanceAccount.name,
        conciliacao: null,
      })),
    };
  }

  async getDetailed(input: FinanceReportFiltersInput) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;
    const { where, period } = this.lancWhereInPeriod(input);

    const [total, rows] = await Promise.all([
      this.prisma.financeiroLancamento.count({ where }),
      this.prisma.financeiroLancamento.findMany({
        where,
        orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: DETAILED_INCLUDE,
      }),
    ]);

    return {
      items: rows.map((r) => this.mapDetailedRow(r)),
      total,
      page,
      pageSize,
      periodStart: period.start.toISOString().slice(0, 10),
      periodEnd: period.end.toISOString().slice(0, 10),
      dateBasis: input.dateBasis,
      view: input.view,
    };
  }

  async getCategoryAnalysis(input: FinanceReportFiltersInput) {
    const { where } = this.lancWhereInPeriod(input);
    const rows = await this.prisma.financeiroLancamento.findMany({
      where,
      include: {
        allocationLines: { include: { financeCategory: { select: { id: true, name: true, parentId: true } } } },
        financeCategory: { select: { id: true, name: true, parentId: true } },
      },
    });

    const buckets = new Map<string, { key: string; label: string; parentLabel: string | null; amount: number }>();
    let incomeBase = 0;
    let expenseBase = 0;

    for (const row of rows) {
      const lines = row.allocationLines;
      if (lines.length > 0) {
        for (const line of lines) {
          if (input.categoryIds?.length) {
            const cid = line.financeCategoryId;
            if (!cid || !input.categoryIds.includes(cid)) continue;
          }
          const amt = moneyToNumber(line.amount);
          const key = categoryKeyForBreakdown(line.financeCategoryId, null);
          const label = line.financeCategory?.name ?? legacyCategoryLabel(null);
          const parent =
            line.financeCategory?.parentId != null
              ? line.financeCategory?.name ?? label
              : null;
          const prev = buckets.get(key) ?? { key, label, parentLabel: parent, amount: 0 };
          prev.amount += amt;
          buckets.set(key, prev);
          if (row.tipo === 'receber') incomeBase += amt;
          else expenseBase += amt;
        }
      } else {
        const amt = obligationReportAmount(row, input.categoryIds);
        if (amt <= 0) continue;
        const key = categoryKeyForBreakdown(row.financeCategoryId, row.categoria);
        const label =
          row.financeCategory?.name ?? legacyCategoryLabel(row.categoria);
        const prev = buckets.get(key) ?? { key, label, parentLabel: null, amount: 0 };
        prev.amount += amt;
        buckets.set(key, prev);
        if (row.tipo === 'receber') incomeBase += amt;
        else expenseBase += amt;
      }
    }

    const base =
      input.direction === 'receitas'
        ? incomeBase
        : input.direction === 'despesas'
          ? expenseBase
          : incomeBase + expenseBase;

    const items = [...buckets.values()]
      .map((b) => ({
        ...b,
        percent: base > 0 ? (b.amount / base) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { items, incomeBase, expenseBase, dateBasis: input.dateBasis, view: input.view };
  }

  async getAccountAnalysis(input: FinanceReportFiltersInput) {
    const { where } = this.lancWhereInPeriod(input);
    const rows = await this.prisma.financeiroLancamento.findMany({
      where,
      select: {
        tipo: true,
        financeAccountId: true,
        financeAccount: { select: { id: true, name: true, accountType: true } },
        originalAmount: true,
        valor: true,
        amountSettledTotal: true,
        financeCategoryId: true,
        allocationLines: { select: { amount: true, financeCategoryId: true } },
      },
    });

    const planned = new Map<string, { id: string; name: string; tipo: string; obligation: number; settled: number }>();
    for (const row of rows) {
      const acc = row.financeAccount;
      if (!acc) continue;
      const prev = planned.get(acc.id) ?? {
        id: acc.id,
        name: acc.name,
        tipo: acc.accountType,
        obligation: 0,
        settled: 0,
      };
      prev.obligation += obligationReportAmount(row);
      prev.settled += moneyToNumber(row.amountSettledTotal);
      planned.set(acc.id, prev);
    }

    const { where: sw } = this.settlementWhere(input);
    const settlements = await this.prisma.financeSettlement.findMany({
      where: sw,
      select: {
        finalAmount: true,
        actualFinanceAccount: { select: { id: true, name: true, accountType: true } },
      },
    });
    const actual = new Map<string, { id: string; name: string; tipo: string; cash: number }>();
    for (const s of settlements) {
      const acc = s.actualFinanceAccount;
      const prev = actual.get(acc.id) ?? { id: acc.id, name: acc.name, tipo: acc.accountType, cash: 0 };
      prev.cash += moneyToNumber(s.finalAmount);
      actual.set(acc.id, prev);
    }

    const transfers = await this.getInternalTransfers(input);

    return {
      planned: [...planned.values()].sort((a, b) => b.obligation - a.obligation),
      actualCash: [...actual.values()].sort((a, b) => b.cash - a.cash),
      transfers: transfers.items,
      view: input.view,
      dateBasis: input.dateBasis,
    };
  }

  async getSupplierAnalysis(input: FinanceReportFiltersInput) {
    const { where } = this.lancWhereInPeriod(input);
    const rows = await this.prisma.financeiroLancamento.findMany({
      where: { ...where, supplierId: { not: null } },
      include: { supplier: { select: { id: true, name: true } } },
    });

    const map = new Map<
      string,
      { supplierId: string; name: string; obligation: number; paid: number; pending: number; overdue: number }
    >();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    for (const row of rows) {
      if (!row.supplier) continue;
      const prev = map.get(row.supplier.id) ?? {
        supplierId: row.supplier.id,
        name: row.supplier.name,
        obligation: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
      };
      const ob = obligationReportAmount(row);
      const paid = moneyToNumber(row.amountSettledTotal);
      const rem = Math.max(0, ob - paid);
      prev.obligation += ob;
      prev.paid += paid;
      if (rem > 0 && (row.status === 'pendente' || row.status === 'parcial')) {
        prev.pending += rem;
        if (row.dueDate < todayStart) prev.overdue += rem;
      }
      map.set(row.supplier.id, prev);
    }

    return { items: [...map.values()].sort((a, b) => b.obligation - a.obligation) };
  }

  async getReconciliationReport(input: FinanceReportFiltersInput) {
    const base = baseOperatingWhere(input);
    const period = this.periodBounds(input);
    const rows = await this.prisma.financeSettlement.findMany({
      where: {
        tenantId: input.tenantIds.length === 1 ? input.tenantIds[0] : { in: input.tenantIds },
        settledAt: { gte: period.start, lte: period.end },
        financeiroLancamento: {
          ...base,
          reconciliationStatus: input.reconciliationStatus ?? 'not_reconciled',
        },
      },
      orderBy: { settledAt: 'desc' },
      include: {
        financeiroLancamento: {
          select: { id: true, descricao: true, reconciliationStatus: true, referencia: true },
        },
        actualFinanceAccount: { select: { name: true } },
      },
      take: 500,
    });

    return {
      items: rows.map((r) => ({
        settlementId: r.id,
        lancamentoId: r.financeiroLancamentoId,
        descricao: r.financeiroLancamento.descricao,
        referencia: r.financeiroLancamento.referencia,
        conta: r.actualFinanceAccount.name,
        valor: moneyToNumber(r.finalAmount),
        data: r.settledAt.toISOString(),
        actor: r.performedByName,
        conciliacao: r.financeiroLancamento.reconciliationStatus,
      })),
    };
  }

  async getOverdue(input: FinanceReportFiltersInput) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const base = baseOperatingWhere(input);
    const rows = await this.prisma.financeiroLancamento.findMany({
      where: {
        ...base,
        status: { in: ['pendente', 'parcial'] },
        dueDate: { lt: todayStart },
      },
      orderBy: { dueDate: 'asc' },
      include: DETAILED_INCLUDE,
      take: 500,
    });
    return {
      items: rows
        .map((r) => this.mapDetailedRow(r))
        .filter((r) => r.saldo > 0),
    };
  }

  async getUpcoming(input: FinanceReportFiltersInput, days: number) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const end = new Date(todayStart);
    end.setUTCDate(end.getUTCDate() + days);
    const base = baseOperatingWhere(input);
    const rows = await this.prisma.financeiroLancamento.findMany({
      where: {
        ...base,
        status: { in: ['pendente', 'parcial'] },
        dueDate: { gte: todayStart, lte: end },
      },
      orderBy: { dueDate: 'asc' },
      include: DETAILED_INCLUDE,
      take: 500,
    });
    return {
      days,
      items: rows.map((r) => this.mapDetailedRow(r)).filter((r) => r.saldo > 0),
    };
  }

  async getInternalTransfers(input: FinanceReportFiltersInput) {
    const period = this.periodBounds(input);
    const rows = await this.prisma.financeInternalTransfer.findMany({
      where: {
        tenantId: input.tenantIds.length === 1 ? input.tenantIds[0] : { in: input.tenantIds },
        transferDate: { gte: period.start, lte: period.end },
        ...(input.financeAccountIds?.length
          ? {
              OR: [
                { sourceAccountId: { in: input.financeAccountIds } },
                { destAccountId: { in: input.financeAccountIds } },
              ],
            }
          : {}),
      },
      orderBy: { transferDate: 'desc' },
      include: {
        sourceAccount: { select: { name: true } },
        destAccount: { select: { name: true } },
      },
      take: 500,
    });
    return {
      items: rows.map((t) => ({
        id: t.id,
        origem: t.sourceAccount.name,
        destino: t.destAccount.name,
        valor: moneyToNumber(t.amount),
        data: t.transferDate.toISOString().slice(0, 10),
        descricao: t.description,
      })),
    };
  }

  async getSimple(input: FinanceReportFiltersInput) {
    const summary = await this.getSummary(input);
    const cats = await this.getCategoryAnalysis(input);
    const top = cats.items.slice(0, 5);
    return { summary, topCategories: top };
  }

  async exportCsv(input: FinanceReportFiltersInput): Promise<string> {
    const detailed = await this.getDetailed({ ...input, page: 1, pageSize: 10000 });
    const header = [
      'Empresa',
      'Tipo',
      'Descrição',
      'Fornecedor',
      'Cliente',
      'Documento',
      'Número',
      'Competência',
      'Vencimento',
      'Data baixa',
      'Valor original',
      'Juros',
      'Multa',
      'Desconto',
      'Valor liquidado',
      'Saldo',
      'Categoria',
      'Conta programada',
      'Conta utilizada',
      'Status',
      'Conciliação',
      'Origem',
    ];
    const escape = (v: string | number | null | undefined) => {
      const s = v == null ? '' : String(v);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines = [header.join(',')];
    for (const row of detailed.items) {
      lines.push(
        [
          row.empresa,
          row.tipo,
          row.descricao,
          row.fornecedor,
          row.cliente,
          row.documentType,
          row.documentNumber,
          row.competencia,
          row.vencimento,
          row.dataBaixa,
          row.valorOriginal,
          row.juros,
          row.multa,
          row.desconto,
          row.valorLiquidado,
          row.saldo,
          row.categoria,
          row.contaProgramada,
          row.contaUtilizada,
          row.status,
          row.conciliacao,
          row.origem,
        ]
          .map(escape)
          .join(','),
      );
    }
    return `\uFEFF${lines.join('\n')}`;
  }

  async exportDataset(input: FinanceReportFiltersInput) {
    const detailed = await this.getDetailed({ ...input, page: 1, pageSize: 10000 });
    return detailed;
  }

  async logExport(
    tenantId: string,
    actorUserId: string | null,
    actorName: string | null,
    reportType: string,
    meta: Record<string, unknown>,
  ) {
    await this.audit.log({
      tenantId,
      eventType: 'finance_report_export',
      actorUserId,
      actorName,
      metadata: { reportType, ...meta },
    });
  }

  /** Totais de caixa a partir de settlements — usado em testes e reconciliação resumo x detalhe. */
  async sumCashInScope(input: FinanceReportFiltersInput): Promise<number> {
    const { where } = this.settlementWhere(input);
    const agg = await this.prisma.financeSettlement.aggregate({
      where,
      _sum: { finalAmount: true },
    });
    return decNum(agg._sum.finalAmount);
  }

  dateBasisLabel(basis: FinanceReportFiltersInput['dateBasis']): string {
    const map: Record<string, string> = {
      competence: 'Competência',
      due: 'Vencimento',
      scheduled: 'Data programada',
      settlement: 'Data da baixa/pagamento',
      issue: 'Emissão',
    };
    return map[basis] ?? basis;
  }

  computeRowSettlementFinal(parts: {
    amountSettled: number;
    interestAmount?: number;
    penaltyAmount?: number;
    discountAmount?: number;
  }): number {
    return moneyToNumber(
      computeSettlementFinal({
        amountSettled: moneyDecimal(parts.amountSettled),
        interestAmount: moneyDecimal(parts.interestAmount ?? 0),
        penaltyAmount: moneyDecimal(parts.penaltyAmount ?? 0),
        discountAmount: moneyDecimal(parts.discountAmount ?? 0),
      }),
    );
  }
}
