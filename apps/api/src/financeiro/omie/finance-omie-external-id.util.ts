/**
 * Identificadores externos Omie — política STRING/TEXT (não aritmética INT32).
 */

export const OMIE_ID_UNSAFE_JS_INTEGER = 'OMIE_ID_UNSAFE_JS_INTEGER';
export const OMIE_ID_MALFORMED = 'OMIE_ID_MALFORMED';

export type OmieExternalIdNormalizeResult = {
  value: string | null;
  warning?: string;
};

/** Normaliza ID Omie para string exata (sem truncar, sem float). */
export function normalizeOmieExternalId(v: unknown): OmieExternalIdNormalizeResult {
  if (v == null || v === '') return { value: null };

  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return { value: null };
    return { value: s };
  }

  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v <= 0) return { value: null };
    if (!Number.isSafeInteger(v)) {
      return { value: null, warning: OMIE_ID_UNSAFE_JS_INTEGER };
    }
    return { value: String(v) };
  }

  if (typeof v === 'bigint') {
    const s = v.toString();
    if (!s || s === '0' || s.startsWith('-')) return { value: null };
    return { value: s };
  }

  const s = String(v).trim();
  if (!s) return { value: null };
  return { value: s };
}

/** @deprecated use normalizeOmieExternalId — mantido só onde ainda não é identidade persistida */
export function parsePositiveIntUnknown(v: unknown): number | null {
  const r = normalizeOmieExternalId(v);
  if (!r.value || r.warning) return null;
  if (!/^\d+$/.test(r.value)) return null;
  const n = Number(r.value);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}
