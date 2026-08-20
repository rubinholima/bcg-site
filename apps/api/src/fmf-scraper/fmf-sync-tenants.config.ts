/** Clubes MG com jogos/classificação via FMF (sync automático). Demais ligas = outras fontes. */
export const FMF_SYNC_TENANT_SLUGS = ['boston-city-fc-brasil', 'villa-nova-saf'] as const;

export type FmfSyncTenantSlug = (typeof FMF_SYNC_TENANT_SLUGS)[number];

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

export function parseTenantCategoryKeys(categories: unknown): string[] {
  if (!Array.isArray(categories)) return [];
  return [
    ...new Set(
      categories
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => c.trim().toLowerCase()),
    ),
  ];
}
