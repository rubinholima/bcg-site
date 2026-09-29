import { operationalCategoryMergeKey } from '../fmf-scraper/fmf-operational-category.util';

/** Entrada da agenda visível para o filtro de categoria (sub20 ≡ sub20_2div). */
export function entryMatchesOperationalCategoryFilter(
  entryCategory: string | null | undefined,
  filterCategory: string | null | undefined,
  tenantCategoryKeys?: string[] | null,
): boolean {
  if (!filterCategory?.trim()) return true;
  const filter = filterCategory.trim();
  if (!entryCategory?.trim()) return false;
  const entry = entryCategory.trim();
  if (entry === filter) return true;
  if (operationalCategoryMergeKey(entry) === operationalCategoryMergeKey(filter)) {
    return true;
  }
  const keys = tenantCategoryKeys ?? [];
  const filterOp = operationalCategoryMergeKey(filter);
  for (const k of keys) {
    if (typeof k !== 'string' || !k.trim()) continue;
    if (operationalCategoryMergeKey(k) !== filterOp) continue;
    if (k.trim() === entry || operationalCategoryMergeKey(entry) === filterOp) {
      return true;
    }
  }
  return false;
}
