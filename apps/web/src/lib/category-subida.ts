import { parseTravelCategoriesFromApi } from "@/lib/travel-categories-utils";

export function resolveTravelEventCategories(
  category: string | null | undefined,
  categories: unknown,
): string[] {
  const parsed = parseTravelCategoriesFromApi(category, categories);
  if (parsed.list.length > 0) return parsed.list;
  const single = parsed.single.trim();
  return single ? [single] : [];
}

export function isSubidaEvent(
  squadCategory: string | null | undefined,
  eventCategories: string | string[],
): boolean {
  const squad = squadCategory?.trim();
  if (!squad) return false;

  const events = Array.isArray(eventCategories)
    ? eventCategories.map((item) => item.trim()).filter(Boolean)
    : eventCategories?.trim()
      ? [eventCategories.trim()]
      : [];
  if (events.length === 0) return false;
  if (events.length === 1) return squad !== events[0];
  return !events.includes(squad);
}
