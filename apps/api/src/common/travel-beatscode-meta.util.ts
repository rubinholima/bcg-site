/** Chaves editadas no dashboard que sync/import nunca deve sobrescrever. */
export const PRESERVED_TRAVEL_BEATSCODE_META_KEYS = [
  'pressKit',
  'logisticsCadastros',
  'expenseLines',
  'pointOfInterestIds',
] as const;

/**
 * Mescla metadados FMF/sync em viagem existente sem apagar press kit nem cadastros logísticos.
 */
export function mergeTravelBeatscodeMeta(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  const merged: Record<string, unknown> = { ...base, ...patch };

  for (const key of PRESERVED_TRAVEL_BEATSCODE_META_KEYS) {
    if (base[key] !== undefined && base[key] !== null) {
      merged[key] = base[key];
    }
  }

  return merged;
}
