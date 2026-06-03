export const NOTICIAS_MAX_ITEMS_OPTIONS = [3, 6, 9, 12, 15] as const;
export const NOTICIAS_COLUMNS_OPTIONS = [1, 2, 3] as const;

export type NoticiasMaxItems = (typeof NOTICIAS_MAX_ITEMS_OPTIONS)[number];
export type NoticiasColumns = (typeof NOTICIAS_COLUMNS_OPTIONS)[number];

export function normalizeNoticiasMaxItems(value: unknown): NoticiasMaxItems {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if ((NOTICIAS_MAX_ITEMS_OPTIONS as readonly number[]).includes(n)) {
    return n as NoticiasMaxItems;
  }
  if (Number.isNaN(n)) return 9;
  return NOTICIAS_MAX_ITEMS_OPTIONS.reduce((best, opt) =>
    Math.abs(opt - n) < Math.abs(best - n) ? opt : best,
  );
}

export function normalizeNoticiasColumns(value: unknown): NoticiasColumns {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (n === 1 || n === 2 || n === 3) return n;
  return 3;
}

export function noticiasGridClass(columns: NoticiasColumns): string {
  if (columns === 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

export function noticiasGridRows(maxItems: number, columns: NoticiasColumns): number {
  return Math.max(1, Math.ceil(maxItems / columns));
}
