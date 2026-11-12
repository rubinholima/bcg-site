import { normalizeMappingKey } from './finance-import-nd.util';
import { rowStructuralConflicts, type MappingRowLike, mappingKey } from './finance-import-readiness.util';

export type BulkMappingSection = {
  mappingKind: string;
  items: Array<{
    id: string;
    sourceValue: string;
    sourceValueNormalized: string;
    affectedRows: number;
    financialTotal: number | null;
    action: string;
    targetId: string | null;
    confirmed: boolean;
    status: 'resolved' | 'pending' | 'review_required';
    metadata?: Record<string, unknown> | null;
  }>;
};

export function buildBulkMappingSections(
  mappings: Array<{
    id: string;
    mappingKind: string;
    sourceValue: string;
    sourceValueNormalized: string;
    action: string;
    targetId: string | null;
    confirmed: boolean;
    metadata?: unknown;
  }>,
  rows: Array<{ normalizedValues: unknown }>,
): BulkMappingSection[] {
  const counts = new Map<string, number>();
  const totals = new Map<string, number>();

  for (const row of rows) {
    const sem = (row.normalizedValues ?? {}) as Record<string, unknown>;
    const paid = Number(sem.paidAmount ?? sem.valorPagoNumber ?? 0);
    const pushCount = (kind: string, raw: unknown) => {
      const n = normalizeMappingKey(String(raw ?? ''));
      if (!n) return;
      const key = `${kind}::${n}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!Number.isNaN(paid)) totals.set(key, (totals.get(key) ?? 0) + Math.abs(paid));
    };
    pushCount('company', sem.companyTaxIdNormalized ?? sem.companyTaxId);
    pushCount('finance_account', sem.accountLabel);
    pushCount('category', sem.grupo);
    pushCount('subcategory', sem.category);
    pushCount('counterparty', sem.counterpartyTaxId ?? sem.counterpartyName);
    pushCount('payment_method', sem.paymentMethod);
    pushCount('document_type', sem.documentType);
  }

  const byKind = new Map<string, BulkMappingSection['items']>();
  for (const m of mappings) {
    const key = mappingKey(m.mappingKind, m.sourceValueNormalized);
    const status: 'resolved' | 'pending' | 'review_required' =
      m.confirmed && m.targetId && m.action !== 'review_required'
        ? 'resolved'
        : m.action === 'review_required'
          ? 'review_required'
          : 'pending';
    const item = {
      id: m.id,
      sourceValue: m.sourceValue,
      sourceValueNormalized: m.sourceValueNormalized,
      affectedRows: counts.get(key) ?? 0,
      financialTotal: totals.has(key) ? totals.get(key)! : null,
      action: m.action,
      targetId: m.targetId,
      confirmed: m.confirmed,
      status,
      metadata: (m.metadata ?? null) as Record<string, unknown> | null,
    };
    const list = byKind.get(m.mappingKind) ?? [];
    list.push(item);
    byKind.set(m.mappingKind, list);
  }

  const order = [
    'company',
    'finance_account',
    'category',
    'subcategory',
    'counterparty',
    'payment_method',
    'document_type',
  ];
  return order
    .filter((k) => byKind.has(k))
    .map((mappingKind) => ({
      mappingKind,
      items: (byKind.get(mappingKind) ?? []).sort((a, b) => b.affectedRows - a.affectedRows),
    }));
}

export function buildDuplicateReviewItem(row: {
  id: string;
  sourceRowNumber: number;
  sheetName: string;
  duplicateState: string;
  duplicateFlagReason: string | null;
  duplicateDecision: string | null;
  normalizedValues: unknown;
  possibleDuplicateLancamentoId: string | null;
}, existing: {
  id: string;
  valor: unknown;
  contraparte: string | null;
  dueDate: Date;
  settledAt: Date | null;
  referencia: string | null;
  recordOrigin: string | null;
} | null) {
  const sem = (row.normalizedValues ?? {}) as Record<string, unknown>;
  const flagReason =
    row.duplicateFlagReason ??
    (row.duplicateState === 'exact_file_reprocess'
      ? 'Fingerprint já importado (proveniência spreadsheet_import).'
      : row.duplicateState === 'exact_in_batch'
        ? 'Mesma fingerprint duplicada dentro do lote.'
        : row.duplicateState === 'possible_duplicate_cup360'
          ? 'Possível correspondência com lançamento CUP360 existente.'
          : '—');

  return {
    stagingRowId: row.id,
    duplicateState: row.duplicateState,
    duplicateDecision: row.duplicateDecision,
    flagReason,
    source: {
      row: row.sourceRowNumber,
      sheet: row.sheetName,
      company: sem.companyName ?? sem.companyLegalName,
      counterparty: sem.counterpartyName,
      document: sem.documentNumber,
      amount: sem.paidAmount ?? sem.valorPago,
      dueDate: sem.dueDate,
      paymentDate: sem.paymentDate ?? sem.settlementDate,
      account: sem.accountLabel,
      category: sem.category,
      origin: sem.applicationOrigin ?? sem.origin,
    },
    existing: existing
      ? {
          recordId: existing.id,
          counterparty: existing.contraparte,
          document: existing.referencia,
          amount: existing.valor,
          dueDate: existing.dueDate,
          settlementDate: existing.settledAt,
          origin: existing.recordOrigin,
        }
      : null,
  };
}

export function listConflictRows(
  rows: Array<{
    id: string;
    sourceRowNumber: number;
    validationStatus: string;
    rowClassification: string | null;
    duplicateState: string;
    duplicateDecision: string | null;
    rowDecision: string | null;
    normalizedValues: unknown;
    possibleDuplicateLancamentoId: string | null;
  }>,
  mappings: MappingRowLike[],
) {
  const map = new Map<string, MappingRowLike>();
  for (const m of mappings) map.set(mappingKey(m.mappingKind, m.sourceValueNormalized), m);

  return rows
    .map((r) => {
      const codes = rowStructuralConflicts(r, map);
      if (!codes.length && r.validationStatus !== 'conflict') return null;
      return {
        stagingRowId: r.id,
        sourceRowNumber: r.sourceRowNumber,
        codes: codes.length ? codes : ['validation_conflict'],
        rowDecision: r.rowDecision,
        classification: r.rowClassification,
      };
    })
    .filter(Boolean);
}
