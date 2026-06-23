/**
 * Altura (cm) e peso (kg) — Beatscode e cadastros legados podem vir em metros (ex.: 1.65).
 */

export function normalizeHeightCm(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  let cm = n;
  if (cm < 10) cm = Math.round(cm * 100);
  else cm = Math.round(cm);
  if (cm < 80 || cm > 250) return null;
  return cm;
}

export function normalizeWeightKg(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  const kg = Math.round(n * 10) / 10;
  if (kg < 20 || kg > 150) return null;
  return kg;
}
