import { Prisma } from '@prisma/client';
import { parseSpreadsheetMoney } from './finance-import-money.util';

export type FinanceImportControlTotals = {
  sourceOriginalTotal: number;
  sourceInterestTotal: number;
  sourcePenaltyTotal: number;
  sourcePaidTotal: number;
  projectedPaidTotal: number;
  mismatch: boolean;
  mismatchDelta: number;
};

type StagingSemantic = Record<string, unknown>;

export function aggregateControlTotals(rows: Array<{ normalizedValues: unknown; rowDecision?: string | null; validationStatus: string }>): FinanceImportControlTotals {
  let sourceOriginalTotal = 0;
  let sourceInterestTotal = 0;
  let sourcePenaltyTotal = 0;
  let sourcePaidTotal = 0;
  let projectedPaidTotal = 0;

  for (const row of rows) {
    if (row.rowDecision === 'SKIP') continue;
    if (row.validationStatus === 'invalid') continue;
    const sem = (row.normalizedValues ?? {}) as StagingSemantic;
    const original = parseSpreadsheetMoney(sem.valorConta ?? sem.originalAmount).amount;
    const interest = parseSpreadsheetMoney(sem.juros).amount;
    const penalty = parseSpreadsheetMoney(sem.multa).amount;
    const paid = parseSpreadsheetMoney(sem.valorPago ?? sem.paidAmount).amount;

    if (original) sourceOriginalTotal += original.toNumber();
    if (interest) sourceInterestTotal += interest.toNumber();
    if (penalty) sourcePenaltyTotal += penalty.toNumber();
    if (paid) {
      const n = paid.toNumber();
      sourcePaidTotal += Math.abs(n);
      projectedPaidTotal += Math.abs(n);
    }
  }

  const mismatchDelta = Math.round((sourcePaidTotal - projectedPaidTotal) * 100) / 100;
  return {
    sourceOriginalTotal,
    sourceInterestTotal,
    sourcePenaltyTotal,
    sourcePaidTotal,
    projectedPaidTotal,
    mismatch: Math.abs(mismatchDelta) > 0.05,
    mismatchDelta,
  };
}

export function moneySummaryFromDecimal(d: Prisma.Decimal | null | undefined): number {
  return d ? d.toNumber() : 0;
}
