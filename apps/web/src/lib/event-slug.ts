/**
 * Slugs de evento público no banco usam hífen (slugify). URLs com "_" ou espaços falham no lookup.
 */

export function normalizeEventSlugParam(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Ordem: exato na URL, depois normalizado (ex.: coffee_tournament → coffee-tournament). */
export function publicEventSlugLookupVariants(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const n = normalizeEventSlugParam(raw);
  const out: string[] = [];
  if (t) out.push(t);
  if (n && n !== t) out.push(n);
  return out;
}
