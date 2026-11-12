import type { FinanceOmieNormalizedTitulo } from './finance-omie.types';

export type SpreadsheetOmieCrosscheck = {
  flag: 'none' | 'OMIE_MATCH' | 'OMIE_POSSIBLE';
  reason: string;
  omieExternalId: string | null;
  mirrorRecordId: string | null;
};

function normDoc(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function crosscheckSpreadsheetRowAgainstOmie(
  semantic: Record<string, unknown>,
  mirrors: Array<{
    id: string;
    omieExternalId: string;
    normalizedData: unknown;
    financeiroLancamentoId: string | null;
  }>,
): SpreadsheetOmieCrosscheck {
  const doc = normDoc(semantic.documentNumber ?? semantic.numero_documento);
  const tax = normDoc(semantic.counterpartyTaxId ?? semantic.companyTaxIdNormalized);
  const paid = Number(semantic.paidAmount ?? semantic.valorPagoNumber ?? NaN);

  for (const m of mirrors) {
    const n = (m.normalizedData ?? {}) as FinanceOmieNormalizedTitulo;
    const omieDoc = normDoc(n.documentNumber);
    const omieTax = normDoc(n.counterpartyTaxId);
    const omiePaid = n.paidAmount ?? n.originalAmount ?? 0;

    if (doc && omieDoc && doc === omieDoc) {
      return {
        flag: 'OMIE_MATCH',
        reason: 'Documento coincide com espelho Omie — não importar evento canônico duplicado.',
        omieExternalId: m.omieExternalId,
        mirrorRecordId: m.id,
      };
    }

    if (
      tax &&
      omieTax &&
      tax === omieTax &&
      !Number.isNaN(paid) &&
      Math.abs(paid - omiePaid) <= 0.05
    ) {
      return {
        flag: 'OMIE_POSSIBLE',
        reason: 'Contraparte e valor compatíveis com registro Omie — revisar.',
        omieExternalId: m.omieExternalId,
        mirrorRecordId: m.id,
      };
    }
  }

  return { flag: 'none', reason: '—', omieExternalId: null, mirrorRecordId: null };
}
