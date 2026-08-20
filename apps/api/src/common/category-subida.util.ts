import { parseTravelCategories } from '../futebol-agenda/travel-categories.util';

export function resolveTravelEventCategories(travel: {
  category: string | null;
  categories?: unknown;
}): string[] {
  const list = parseTravelCategories(travel.categories);
  if (list.length > 0) return list;
  const single = travel.category?.trim();
  return single ? [single] : [];
}

/** Atleta convocado/jogando fora da categoria do cadastro (subida ou outra categoria). */
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

export function primaryEventCategory(eventCategories: string[]): string {
  return eventCategories[0]?.trim() ?? '';
}
