/** Clubes MG com jogos/classificação via FMF (sync automático). Demais ligas = outras fontes. */
export const FMF_SYNC_TENANT_SLUGS = ['boston-city-fc-brasil', 'villa-nova-saf'] as const;

export type FmfSyncTenantSlug = (typeof FMF_SYNC_TENANT_SLUGS)[number];

import {
  normalizeTenantOperationalCategories,
  toOperationalCategory,
} from './fmf-operational-category.util';

/** Aliases padrão na FMF quando o nome difere do cadastro BCG. */
export const FMF_SYNC_TENANT_DEFAULTS: Record<
  FmfSyncTenantSlug,
  { fmfTeamNames: string[] }
> = {
  'boston-city-fc-brasil': {
    fmfTeamNames: ['BOSTON CITY', 'BOSTON CITY FC', 'BOSTON CITY FUTEBOL CLUBE'],
  },
  'villa-nova-saf': {
    fmfTeamNames: ['VILLA NOVA', 'VILLA NOVA SAF'],
  },
};

export function isFmfSyncTenantSlug(slug: string): slug is FmfSyncTenantSlug {
  return (FMF_SYNC_TENANT_SLUGS as readonly string[]).includes(slug);
}

/** Chaves administrativas exatamente como gravadas no tenant (sem reescrita). */
export function readTenantCategoryKeys(categories: unknown): string[] {
  if (!Array.isArray(categories)) return [];
  return categories
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim());
}

/** Categorias operacionais únicas — só leitura para matching FMF (nunca persiste). */
export function getTenantOperationalCategoriesForFmf(categories: unknown): string[] {
  return normalizeTenantOperationalCategories(categories);
}

/** @deprecated alias — use getTenantOperationalCategoriesForFmf para matching FMF */
export function parseTenantCategoryKeys(categories: unknown): string[] {
  return getTenantOperationalCategoriesForFmf(categories);
}

export function unionOperationalCategoriesFromTenants(
  tenants: Array<{ categories: unknown }>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tenants) {
    for (const raw of readTenantCategoryKeys(t.categories)) {
      const op = toOperationalCategory(raw);
      if (!op || seen.has(op)) continue;
      seen.add(op);
      out.push(op);
    }
  }
  return out;
}

export function tenantCategoriesUnchanged(before: unknown, after: unknown): boolean {
  return (
    JSON.stringify(readTenantCategoryKeys(before)) ===
    JSON.stringify(readTenantCategoryKeys(after))
  );
}
