export function parseTravelCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim());
}

/** Viagem visível para a categoria filtrada (single category ou lista categories). */
export function travelMatchesCategoryFilter(
  travel: { category: string | null; categories?: unknown },
  category: string | null | undefined,
): boolean {
  if (!category?.trim()) return true;
  const cat = category.trim();
  const list = parseTravelCategories(travel.categories);
  if (list.length > 0) return list.includes(cat);
  if (!travel.category) return true;
  return travel.category === cat;
}

export function normalizeTravelCategoriesInput(
  categories: string[] | undefined,
  singleCategory: string | undefined,
): { category: string | null; categories: string[] | null } {
  const list = (categories ?? []).map((c) => c.trim()).filter(Boolean);
  if (list.length > 1) {
    return { category: list[0] ?? null, categories: list };
  }
  if (list.length === 1) {
    return { category: list[0]!, categories: null };
  }
  const single = singleCategory?.trim();
  return { category: single || null, categories: null };
}
