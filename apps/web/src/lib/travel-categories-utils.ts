import { getCategoryLabel } from "@/lib/fixture-categories";

export function parseTravelCategoriesFromApi(
  category: string | null | undefined,
  categories: unknown,
): { multiMode: boolean; single: string; list: string[] } {
  const list = Array.isArray(categories)
    ? categories.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];
  if (list.length > 1) return { multiMode: true, single: "", list };
  if (list.length === 1) return { multiMode: false, single: list[0]!, list: [] };
  return { multiMode: false, single: category ?? "", list: [] };
}

export function travelCategoriesPayload(
  multiMode: boolean,
  singleCategory: string,
  selectedCategories: string[],
): { category?: string; categories?: string[] } {
  if (multiMode && selectedCategories.length > 0) {
    return { categories: selectedCategories };
  }
  if (singleCategory.trim()) return { category: singleCategory.trim() };
  return {};
}

export function formatTravelCategoriesDisplay(
  category: string | null | undefined,
  categories: unknown,
  locale: "pt" | "en" = "pt",
): string {
  const list = Array.isArray(categories)
    ? categories.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];
  if (list.length > 1) {
    return list.map((c) => getCategoryLabel(c, locale)).join(" + ");
  }
  if (list.length === 1) return getCategoryLabel(list[0]!, locale);
  if (category) return getCategoryLabel(category, locale);
  return "—";
}
