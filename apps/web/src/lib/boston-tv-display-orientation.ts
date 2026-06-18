export const BOSTON_TV_ORIENTATION_LANDSCAPE = "landscape";
export const BOSTON_TV_ORIENTATION_PORTRAIT = "portrait";

export const BOSTON_TV_ORIENTATION_OPTIONS = [
  { value: BOSTON_TV_ORIENTATION_LANDSCAPE, label: "Horizontal" },
  { value: BOSTON_TV_ORIENTATION_PORTRAIT, label: "Vertical" },
] as const;

export function normalizeBostonTvDisplayOrientation(
  value: string | undefined | null,
): string {
  const v = value?.trim();
  if (v === BOSTON_TV_ORIENTATION_PORTRAIT) return BOSTON_TV_ORIENTATION_PORTRAIT;
  return BOSTON_TV_ORIENTATION_LANDSCAPE;
}

export function bostonTvMediaObjectClass(orientation: string | undefined | null): string {
  void orientation;
  return "h-full w-full object-contain";
}

export function bostonTvOrientationLabel(orientation: string | undefined | null): string {
  return orientation === BOSTON_TV_ORIENTATION_PORTRAIT ? "Vertical" : "Horizontal";
}
