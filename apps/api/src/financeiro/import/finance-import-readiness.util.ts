import { normalizeMappingKey } from './finance-import-nd.util';
import { transferDestinationUnknown } from './finance-import-classification.util';
import type { FinanceImportRowClassification } from './finance-import.types';

export type MappingRowLike = {
  mappingKind: string;
  sourceValueNormalized: string;
  action: string;
  confirmed: boolean;
  targetId: string | null;
};

export type StagingRowLike = {
  id: string;
  validationStatus: string;
  rowClassification: string | null;
  duplicateState: string;
  duplicateDecision: string | null;
  rowDecision: string | null;
  normalizedValues: unknown;
  possibleDuplicateLancamentoId: string | null;
};

const REQUIRED_KINDS = ['company', 'finance_account'] as const;

export function mappingKey(kind: string, normalized: string): string {
  return `${kind}::${normalized}`;
}

export function isMappingResolved(m: MappingRowLike): boolean {
  if (m.action === 'ignore') return true;
  if (m.action === 'review_required' || m.action === 'unresolved') return false;
  if ((m.action === 'map_existing' || m.action === 'propose_create') && m.confirmed && m.targetId) {
    return true;
  }
  return false;
}

export function isPermutaBlocked(
  sem: Record<string, unknown>,
  classification: string | null,
  mappings: Map<string, MappingRowLike>,
): boolean {
  const account = normalizeMappingKey(String(sem.accountLabel ?? ''));
  if (account !== 'permuta' && classification !== 'OTHER_REVIEW') return false;
  if (account === 'permuta' || normalizeMappingKey(String(sem.accountTypeLabel ?? '')).includes('mutuo')) {
    const m = mappings.get(mappingKey('finance_account', 'permuta'));
    return !m || !isMappingResolved(m);
  }
  return false;
}

export function rowStructuralConflicts(
  row: StagingRowLike,
  mappings: Map<string, MappingRowLike>,
): string[] {
  const codes: string[] = [];
  const sem = (row.normalizedValues ?? {}) as Record<string, unknown>;

  if (row.validationStatus === 'invalid') {
    codes.push('invalid_monetary_row');
  }

  if (row.rowDecision === 'SKIP') return codes;

  const companyTax = normalizeMappingKey(String(sem.companyTaxIdNormalized ?? sem.companyTaxId ?? ''));
  if (companyTax) {
    const cm = mappings.get(mappingKey('company', companyTax.replace(/\D/g, '')));
    if (!cm || !isMappingResolved(cm)) codes.push('company_not_mapped');
  }

  const account = normalizeMappingKey(String(sem.accountLabel ?? ''));
  if (account) {
    const am = mappings.get(mappingKey('finance_account', account));
    if (!am || !isMappingResolved(am)) codes.push('account_not_mapped');
  }

  const grupo = normalizeMappingKey(String(sem.grupo ?? ''));
  if (grupo) {
    const gm = mappings.get(mappingKey('category', grupo));
    if (!gm || !isMappingResolved(gm)) codes.push('category_unresolved');
  }

  const sub = normalizeMappingKey(String(sem.category ?? ''));
  if (sub) {
    const sm = mappings.get(mappingKey('subcategory', sub));
    if (!sm || !isMappingResolved(sm)) codes.push('subcategory_unresolved');
  }

  if (isPermutaBlocked(sem, row.rowClassification, mappings)) {
    codes.push('permuta_unresolved');
  }

  if (
    transferDestinationUnknown(
      row.rowClassification as FinanceImportRowClassification,
      {
        accountLabel: sem.accountLabel as string,
        transferDestAccount: sem.transferDestAccount as string,
        category: sem.category as string,
      },
    )
  ) {
    codes.push('transfer_missing_destination');
  }

  if (row.duplicateState === 'possible_duplicate_cup360' && !row.duplicateDecision) {
    codes.push('possible_duplicate_unreviewed');
  }

  if (row.duplicateState === 'exact_file_reprocess' || row.duplicateState === 'exact_in_batch') {
    codes.push('confirmed_duplicate');
  }

  if (row.rowClassification === 'OTHER_REVIEW' && row.rowDecision !== 'READY' && row.rowDecision !== 'SKIP') {
    const cardHint = normalizeMappingKey(String(sem.accountLabel ?? '')).includes('cartao');
    if (cardHint) codes.push('credit_card_ambiguity');
    else if (!codes.includes('permuta_unresolved')) codes.push('other_review_required');
  }

  return codes;
}

export function batchReadiness(input: {
  mappings: MappingRowLike[];
  rows: StagingRowLike[];
  simulationStale: boolean;
  simulationSummary: unknown;
  controlTotalsMismatch: boolean;
}): {
  readyForReview: boolean;
  readyForImport: boolean;
  blockingReasons: string[];
} {
  const map = new Map<string, MappingRowLike>();
  for (const m of input.mappings) {
    map.set(mappingKey(m.mappingKind, m.sourceValueNormalized), m);
  }

  const blockingReasons: string[] = [];

  for (const kind of REQUIRED_KINDS) {
    const pending = input.mappings.filter((m) => m.mappingKind === kind && !isMappingResolved(m));
    if (pending.length) blockingReasons.push(`${kind}_mapping_required`);
  }

  const conflicts = input.rows.flatMap((r) => rowStructuralConflicts(r, map));
  const uniqueConflicts = [...new Set(conflicts)];
  if (uniqueConflicts.includes('possible_duplicate_unreviewed')) {
    blockingReasons.push('duplicates_pending');
  }
  if (uniqueConflicts.includes('confirmed_duplicate')) {
    blockingReasons.push('confirmed_duplicates_present');
  }
  if (uniqueConflicts.some((c) => c.endsWith('_not_mapped') || c.endsWith('_unresolved'))) {
    blockingReasons.push('mapping_or_conflict_unresolved');
  }

  if (input.simulationStale || !input.simulationSummary) {
    blockingReasons.push('simulation_stale_or_missing');
  }
  if (input.controlTotalsMismatch) {
    blockingReasons.push('control_total_mismatch');
  }

  const readyForReview = blockingReasons.length === 0 || blockingReasons.every((b) => b === 'simulation_stale_or_missing');
  const readyForImport =
    blockingReasons.length === 0 &&
    !input.simulationStale &&
    input.simulationSummary != null &&
    !input.controlTotalsMismatch;

  return { readyForReview, readyForImport, blockingReasons: [...new Set(blockingReasons)] };
}
