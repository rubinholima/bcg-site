import { Prisma } from '@prisma/client';
import { parseSpreadsheetMoney } from './finance-import-money.util';
import { parseSpreadsheetDate } from './finance-import-date.util';
import { parseReconciliation } from './finance-import-validate.util';
import { mappingKey, isMappingResolved, type MappingRowLike } from './finance-import-readiness.util';
import { normalizeMappingKey } from './finance-import-nd.util';
import { moneyDecimal } from '../finance-money.util';

export const FINANCE_IMPORT_RECORD_ORIGIN = 'finance_historical_import';
export const FINANCE_IMPORT_SOURCE_MODULE = 'finance_import';
export const FINANCE_IMPORT_SOURCE_TYPE = 'staging_row';

export type ExecutionRowContext = {
  stagingRowId: string;
  batchId: string;
  tenantId: string;
  sheetName: string;
  sourceRowNumber: number;
  fingerprint: string | null;
  classification: string | null;
  duplicateState: string;
  duplicateDecision: string | null;
  rowDecision: string | null;
  validationStatus: string;
  normalizedValues: Record<string, unknown>;
  possibleDuplicateLancamentoId: string | null;
};

export function shouldSkipExecution(ctx: ExecutionRowContext): { skip: true; reason: string } | { skip: false } {
  if (ctx.rowDecision === 'SKIP') return { skip: true, reason: 'row_excluded' };
  if (ctx.validationStatus === 'invalid') return { skip: true, reason: 'invalid_row' };
  if (ctx.duplicateState === 'exact_file_reprocess' || ctx.duplicateState === 'exact_in_batch') {
    return { skip: true, reason: 'confirmed_duplicate' };
  }
  if (ctx.duplicateDecision === 'LINK_AND_SKIP') return { skip: true, reason: 'link_and_skip' };
  if (ctx.duplicateDecision === 'KEEP_FOR_REVIEW') return { skip: true, reason: 'keep_for_review' };
  if (ctx.classification === 'OTHER_REVIEW' && ctx.rowDecision !== 'READY') {
    return { skip: true, reason: 'review_required' };
  }
  return { skip: false };
}

export function resolveFinanceAccountId(
  sem: Record<string, unknown>,
  mappings: Map<string, MappingRowLike>,
): string | null {
  const account = normalizeMappingKey(String(sem.accountLabel ?? ''));
  if (!account) return null;
  const m = mappings.get(mappingKey('finance_account', account));
  if (!m || !isMappingResolved(m)) return null;
  return m.targetId;
}

export function resolveFinanceCategoryId(
  sem: Record<string, unknown>,
  mappings: Map<string, MappingRowLike>,
): string | null {
  const sub = normalizeMappingKey(String(sem.category ?? ''));
  if (sub) {
    const sm = mappings.get(mappingKey('subcategory', sub));
    if (sm && isMappingResolved(sm)) return sm.targetId;
  }
  const grupo = normalizeMappingKey(String(sem.grupo ?? ''));
  if (grupo) {
    const gm = mappings.get(mappingKey('category', grupo));
    if (gm && isMappingResolved(gm)) return gm.targetId;
  }
  return null;
}

export function buildLancamentoPayload(
  ctx: ExecutionRowContext,
  mappings: Map<string, MappingRowLike>,
): {
  tipo: string;
  status: string;
  transactionKind: string;
  valor: Prisma.Decimal;
  dueDate: Date;
  settledAt: Date | null;
  reconciliationStatus: string;
  contraparte: string;
  descricao: string;
  financeAccountId: string | null;
  financeAccountSettledId: string | null;
  financeCategoryId: string | null;
  originalAmount: Prisma.Decimal | null;
  interestAmount: Prisma.Decimal | null;
  penaltyAmount: Prisma.Decimal | null;
  discountAmount: Prisma.Decimal | null;
  settlementAmount: Prisma.Decimal | null;
  documentType: string | null;
  documentNumber: string | null;
} | null {
  const sem = ctx.normalizedValues;
  const accountId = resolveFinanceAccountId(sem, mappings);
  if (!accountId) return null;

  const paid = parseSpreadsheetMoney(sem.valorPago ?? sem.paidAmount).amount;
  const original = parseSpreadsheetMoney(sem.valorConta ?? sem.originalAmount).amount;
  const amount = paid ?? original;
  if (!amount) return null;

  const dueIso = parseSpreadsheetDate(sem.dueDate ?? sem.dataVencimento);
  const payIso = parseSpreadsheetDate(sem.paymentDate ?? sem.settlementDate ?? sem.dataPagamento);
  const dueDate = dueIso ? new Date(dueIso) : payIso ? new Date(payIso) : new Date();
  const settledAt = payIso ? new Date(payIso) : null;

  const reconciliation = parseReconciliation(sem.conciliado);
  const reconciliationStatus =
    reconciliation === 'reconciled'
      ? 'reconciled'
      : reconciliation === 'not_reconciled'
        ? 'not_reconciled'
        : 'not_reconciled';

  const interest = parseSpreadsheetMoney(sem.juros).amount;
  const penalty = parseSpreadsheetMoney(sem.multa).amount;
  const discount = parseSpreadsheetMoney(sem.desconto).amount;

  const classification = ctx.classification;
  let transactionKind = 'operating_expense';
  if (classification === 'INTERNAL_TRANSFER') {
    transactionKind = 'internal_transfer';
  }

  return {
    tipo: 'pagar',
    status: 'pago',
    transactionKind,
    valor: moneyDecimal(Math.abs(amount.toNumber())),
    dueDate,
    settledAt,
    reconciliationStatus,
    contraparte: String(sem.counterpartyName ?? '—').trim() || '—',
    descricao: String(sem.history ?? sem.descricao ?? sem.documentNumber ?? 'Importação histórica').trim(),
    financeAccountId: accountId,
    financeAccountSettledId: accountId,
    financeCategoryId: resolveFinanceCategoryId(sem, mappings),
    originalAmount: original,
    interestAmount: interest,
    penaltyAmount: penalty,
    discountAmount: discount,
    settlementAmount: paid,
    documentType: sem.documentType ? String(sem.documentType) : null,
    documentNumber: sem.documentNumber ? String(sem.documentNumber) : null,
  };
}

export function settlementIdempotencyKey(batchId: string, stagingRowId: string): string {
  return `finance_import:${batchId}:${stagingRowId}`;
}
