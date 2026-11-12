import type { FinanceImportMappingKind } from './finance-import.types';
import { asTextOrNull, normalizeMappingKey, isNdValue } from './finance-import-nd.util';

export type MappingCandidate = {
  mappingKind: FinanceImportMappingKind;
  sourceValue: string;
  sourceValueNormalized: string;
};

export function collectMappingCandidates(
  semanticRows: Array<Record<string, unknown>>,
): MappingCandidate[] {
  const buckets = new Map<string, MappingCandidate>();

  const push = (kind: FinanceImportMappingKind, raw: unknown) => {
    if (isNdValue(raw)) return;
    const sourceValue = String(raw).trim();
    const sourceValueNormalized = normalizeMappingKey(sourceValue);
    if (!sourceValueNormalized) return;
    const key = `${kind}::${sourceValueNormalized}`;
    if (!buckets.has(key)) {
      buckets.set(key, { mappingKind: kind, sourceValue, sourceValueNormalized });
    }
  };

  for (const row of semanticRows) {
    push('company', row.companyTaxId);
    push('finance_account', row.accountLabel);
    push('category', row.grupo);
    push('subcategory', row.category);
    push('counterparty', row.counterpartyTaxId ?? row.counterpartyName);
    push('payment_method', row.paymentMethod);
    push('document_type', row.documentType);
  }

  return [...buckets.values()];
}

export function mappingKindBlockedForAutoConfirm(kind: FinanceImportMappingKind): boolean {
  return kind === 'finance_account' || kind === 'subcategory' || kind === 'company';
}
