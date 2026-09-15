import type { FmfCompetitionCatalogEntry } from './fmf-competition-catalog.util';
import {
  inferOperationalCategoryFromCatalogEntry,
  inferOperationalCategoryFromProbedHtml,
} from './fmf-competition-catalog.util';
import { toOperationalCategory } from './fmf-operational-category.util';

/** Limite de páginas ProxJogos?d=N fora do catálogo (fallback genérico). */
export const FMF_BOUNDED_D_SCAN_MAX = 60;

const AMBIGUOUS_DIVISION_NAV = /^(1ª|2ª)\s*Divis[aã]o$/i;

export function isAmbiguousDivisionCatalogEntry(entry: FmfCompetitionCatalogEntry): boolean {
  return !entry.categoryHint && AMBIGUOUS_DIVISION_NAV.test(entry.navLabel.trim());
}

/**
 * Entradas do catálogo FMF relevantes para discovery category-driven.
 * Inclui páginas "1ª/2ª Divisão" sem hint — exigem probe HTML para inferir sub17/sub15/etc.
 */
export function filterCatalogEntriesForOperationalDiscovery(
  entries: FmfCompetitionCatalogEntry[],
  operationalCategories: string[],
): FmfCompetitionCatalogEntry[] {
  const opsSet = new Set(
    operationalCategories.map((c) => toOperationalCategory(c)).filter(Boolean),
  );
  if (opsSet.size === 0) return entries;

  return entries.filter((entry) => {
    const op = inferOperationalCategoryFromCatalogEntry(entry);
    if (op && opsSet.has(op)) return true;
    if (isAmbiguousDivisionCatalogEntry(entry)) return true;
    return false;
  });
}

export function catalogEntryMatchesOperationalCategoriesAfterProbe(
  entry: FmfCompetitionCatalogEntry,
  html: string,
  operationalCategories: string[],
): boolean {
  const opsSet = new Set(
    operationalCategories.map((c) => toOperationalCategory(c)).filter(Boolean),
  );
  if (opsSet.size === 0) return true;

  const fromCatalog = inferOperationalCategoryFromCatalogEntry(entry);
  if (fromCatalog && opsSet.has(fromCatalog)) return true;

  const fromHtml = inferOperationalCategoryFromProbedHtml(html);
  return fromHtml != null && opsSet.has(fromHtml);
}

/** d= espelhados com mesmo conteúdo — bounded scan complementar ao catálogo. */
export function boundedDScanRange(catalogEntries: FmfCompetitionCatalogEntry[]): number[] {
  const fromCatalog = new Set(catalogEntries.map((e) => e.fmfD));
  const extra: number[] = [];
  for (let d = 1; d <= FMF_BOUNDED_D_SCAN_MAX; d++) {
    if (!fromCatalog.has(d)) extra.push(d);
  }
  return extra;
}
