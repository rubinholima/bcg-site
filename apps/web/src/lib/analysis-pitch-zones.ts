export const ANALYSIS_PITCH_ZONE_KEYS = [
  "esq_ultimo",
  "cent_ultimo",
  "dir_ultimo",
  "esq_meio",
  "cent_meio",
  "dir_meio",
  "esq_primeira",
  "cent_primeira",
  "dir_primeira",
] as const;

export type AnalysisPitchZoneKey = (typeof ANALYSIS_PITCH_ZONE_KEYS)[number];

export const ANALYSIS_PITCH_ZONE_LABELS: Record<AnalysisPitchZoneKey, string> = {
  esq_ultimo: "Último terço · Esquerdo",
  cent_ultimo: "Último terço · Central",
  dir_ultimo: "Último terço · Direito",
  esq_meio: "Zona central · Esquerdo",
  cent_meio: "Zona central · Central",
  dir_meio: "Zona central · Direito",
  esq_primeira: "1ª zona · Esquerdo",
  cent_primeira: "1ª zona · Central",
  dir_primeira: "1ª zona · Direito",
};

export function isValidPitchZoneKey(key: string | null | undefined): key is AnalysisPitchZoneKey {
  return Boolean(key && (ANALYSIS_PITCH_ZONE_KEYS as readonly string[]).includes(key));
}

export function pitchZoneCentroid(key: AnalysisPitchZoneKey): { x: number; y: number } {
  const col = key.startsWith("esq") ? 0 : key.startsWith("cent") ? 1 : 2;
  const row = key.includes("ultimo") ? 0 : key.includes("meio") ? 1 : 2;
  return { x: (col + 0.5) / 3, y: (row + 0.5) / 3 };
}

export function resolvePitchZoneFromXY(x: number, y: number): AnalysisPitchZoneKey {
  const cx = Math.min(1, Math.max(0, x));
  const cy = Math.min(1, Math.max(0, y));
  const col = cx < 1 / 3 ? 0 : cx < 2 / 3 ? 1 : 2;
  const row = cy < 1 / 3 ? 0 : cy < 2 / 3 ? 1 : 2;
  const colKey = col === 0 ? "esq" : col === 1 ? "cent" : "dir";
  const rowKey = row === 0 ? "ultimo" : row === 1 ? "meio" : "primeira";
  return `${colKey}_${rowKey}` as AnalysisPitchZoneKey;
}

export function labelPitchZone(key: string | null | undefined): string {
  if (!key) return "—";
  if (isValidPitchZoneKey(key)) return ANALYSIS_PITCH_ZONE_LABELS[key];
  return key;
}
