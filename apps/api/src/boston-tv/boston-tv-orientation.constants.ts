export const BOSTON_TV_ORIENTATION_LANDSCAPE = 'landscape';
export const BOSTON_TV_ORIENTATION_PORTRAIT = 'portrait';

const VALID = new Set<string>([
  BOSTON_TV_ORIENTATION_LANDSCAPE,
  BOSTON_TV_ORIENTATION_PORTRAIT,
]);

export function normalizeBostonTvDisplayOrientation(
  value: string | undefined | null,
): string {
  const v = value?.trim();
  if (v && VALID.has(v)) return v;
  return BOSTON_TV_ORIENTATION_LANDSCAPE;
}
