/**
 * Categoria operacional do elenco (sub20, sub15…) vs identidade da competição FMF
 * (preset sub20_2div, d=31, rótulo Mineiro Sub-20 2ª Divisão…).
 */

/** Converte chave tenant/preset/legado para categoria operacional canônica. */
export function toOperationalCategory(raw: string | null | undefined): string {
  const key = (raw ?? '').trim().toLowerCase();
  if (!key) return '';
  if (key.endsWith('_2div')) return key.slice(0, -'_2div'.length);
  return key;
}

/** Normaliza lista de categorias do tenant — só operacionais, sem duplicata. */
export function normalizeTenantOperationalCategories(categories: unknown): string[] {
  if (!Array.isArray(categories)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of categories) {
    if (typeof raw !== 'string') continue;
    const op = toOperationalCategory(raw);
    if (!op || seen.has(op)) continue;
    seen.add(op);
    out.push(op);
  }
  return out;
}

/** Chave de merge/dedup — sub20_2div e sub20 colapsam para sub20. */
export function operationalCategoryMergeKey(value: string | null | undefined): string {
  const op = toOperationalCategory(value);
  return op.replace(/[^a-z0-9]/g, '') || '_';
}
