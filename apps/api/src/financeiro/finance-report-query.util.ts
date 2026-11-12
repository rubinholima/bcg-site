import type { Prisma } from '@prisma/client';
import type { FinanceReportDateBasis, FinanceReportDirection, FinanceReportFiltersInput } from './finance-report.types';
import { obligationAmount, moneyDecimal, moneyToNumber } from './finance-money.util';

export type AllocationSlice = {
  financeCategoryId: string | null;
  amount: Prisma.Decimal;
};

export type LancamentoObligationSlice = {
  originalAmount?: Prisma.Decimal | null;
  valor: Prisma.Decimal;
  financeCategoryId?: string | null;
  allocationLines?: AllocationSlice[];
};

export const LEGACY_CATEGORY_LABEL = 'Categoria legada / Não normalizada';

export function dateBasisField(basis: FinanceReportDateBasis): keyof Prisma.FinanceiroLancamentoWhereInput {
  switch (basis) {
    case 'competence':
      return 'competenceDate';
    case 'scheduled':
      return 'scheduledPaymentDate';
    case 'issue':
      return 'issueDate';
    case 'settlement':
      return 'settledAt';
    case 'due':
    default:
      return 'dueDate';
  }
}

export function baseOperatingWhere(input: FinanceReportFiltersInput): Prisma.FinanceiroLancamentoWhereInput {
  const where: Prisma.FinanceiroLancamentoWhereInput = {
    tenantId: input.tenantIds.length === 1 ? input.tenantIds[0] : { in: input.tenantIds },
    transactionKind: { not: 'internal_transfer' },
    status: { not: 'cancelado' },
  };

  if (input.direction === 'receitas') where.tipo = 'receber';
  else if (input.direction === 'despesas') where.tipo = 'pagar';

  if (input.financeAccountIds?.length) where.financeAccountId = { in: input.financeAccountIds };
  if (input.actualFinanceAccountIds?.length) {
    where.financeAccountSettledId = { in: input.actualFinanceAccountIds };
  }
  if (input.supplierId) where.supplierId = input.supplierId;
  if (input.customerId) where.customerId = input.customerId;
  if (input.employeeId) where.employeeId = input.employeeId;
  if (input.documentType) where.documentType = input.documentType;
  if (input.paymentMethodId) where.financePaymentMethodId = input.paymentMethodId;
  if (input.statuses?.length) where.status = { in: input.statuses };
  if (input.reconciliationStatus) where.reconciliationStatus = input.reconciliationStatus;
  if (input.recordOrigin) where.recordOrigin = input.recordOrigin;
  if (input.sourceModule) where.sourceModule = input.sourceModule;

  if (input.categoryIds?.length) {
    where.OR = [
      { financeCategoryId: { in: input.categoryIds } },
      {
        allocationLines: {
          some: { financeCategoryId: { in: input.categoryIds } },
        },
      },
    ];
  }

  if (input.accountTypes?.length) {
    where.financeAccount = { accountType: { in: input.accountTypes } };
  }

  return where;
}

export function applyPeriodToLancamento(
  where: Prisma.FinanceiroLancamentoWhereInput,
  input: FinanceReportFiltersInput,
  period: { start: Date; end: Date },
): Prisma.FinanceiroLancamentoWhereInput {
  if (input.view === 'cash' || input.dateBasis === 'settlement') {
    return {
      ...where,
      OR: [
        {
          settlements: {
            some: {
              settledAt: { gte: period.start, lte: period.end },
            },
          },
        },
        {
          settledAt: { gte: period.start, lte: period.end },
          settlements: { none: {} },
        },
      ],
    };
  }
  const field = dateBasisField(input.dateBasis);
  return {
    ...where,
    [field]: { gte: period.start, lte: period.end },
  };
}

export function remainingBalanceNum(lanc: {
  originalAmount?: Prisma.Decimal | null;
  valor: Prisma.Decimal;
  amountSettledTotal?: Prisma.Decimal | null;
}): number {
  const ob = moneyToNumber(obligationAmount(lanc));
  const settled = moneyToNumber(moneyDecimal(lanc.amountSettledTotal ?? 0));
  return Math.max(0, ob - settled);
}

export function legacyCategoryLabel(categoria: string | null | undefined): string {
  if (categoria?.trim()) return categoria.trim();
  return LEGACY_CATEGORY_LABEL;
}

export function directionForTipo(tipo: string): FinanceReportDirection {
  return tipo === 'receber' ? 'receitas' : 'despesas';
}

/** Valor operacional para obrigação — usa linhas de rateio quando existirem (sem somar o documento inteiro em cada categoria). */
export function obligationReportAmount(
  lanc: LancamentoObligationSlice,
  categoryIds?: string[],
): number {
  const lines = lanc.allocationLines ?? [];
  if (lines.length > 0) {
    let sum = 0;
    for (const line of lines) {
      if (categoryIds?.length) {
        const cid = line.financeCategoryId;
        if (!cid || !categoryIds.includes(cid)) continue;
      }
      sum += moneyToNumber(moneyDecimal(line.amount));
    }
    return sum;
  }
  if (categoryIds?.length) {
    const cid = lanc.financeCategoryId;
    if (!cid || !categoryIds.includes(cid)) return 0;
  }
  return moneyToNumber(obligationAmount(lanc));
}

export function categoryKeyForBreakdown(
  categoryId: string | null | undefined,
  legacyText: string | null | undefined,
): string {
  if (categoryId) return `cat:${categoryId}`;
  if (legacyText?.trim()) return `legacy:${legacyText.trim()}`;
  return 'legacy:__none__';
}
