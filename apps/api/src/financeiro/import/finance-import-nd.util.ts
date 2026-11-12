export function isNdValue(v: unknown): boolean {
  if (v == null) return true;
  const s = String(v).trim();
  if (!s) return true;
  return /^n\/d$/i.test(s);
}

export function asTextOrNull(v: unknown): string | null {
  if (isNdValue(v)) return null;
  return String(v).trim();
}

export function normalizeMappingKey(v: unknown): string {
  if (isNdValue(v)) return '';
  return String(v)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
