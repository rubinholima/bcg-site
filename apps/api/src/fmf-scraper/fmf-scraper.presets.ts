/** Presets FMF ProxJogos.aspx?d=N — conferidos em maio–ago/2026. */
export type FmfScraperPresetKey =
  | 'modulo_ii'
  | 'sub13'
  | 'sub14'
  | 'sub15'
  | 'sub17'
  | 'sub20';

export interface FmfScraperPreset {
  key: FmfScraperPresetKey;
  fmfD: number;
  slug: string;
  name: string;
  /** Chave de categoria nos módulos do site (Proximos Jogos / Tabela). */
  fixtureCategory: string;
  /**
   * Nome da competição como costuma vir na súmula FMF (filtro de cartões).
   * Use `{year}` para o ano da temporada.
   */
  competitionLabelTemplate: string;
}

export const FMF_SCRAPER_PRESETS: Record<FmfScraperPresetKey, FmfScraperPreset> = {
  modulo_ii: {
    key: 'modulo_ii',
    fmfD: 2,
    slug: 'mineiro-modulo-ii-2026',
    name: 'Mineiro Módulo II 2026',
    fixtureCategory: 'modulo_ii',
    competitionLabelTemplate: 'MÓDULO II - {year}',
  },
  sub13: {
    key: 'sub13',
    fmfD: 40,
    slug: 'mineiro-sub13-1-2026',
    name: 'Mineiro Sub-13 1ª divisão 2026',
    fixtureCategory: 'sub13',
    competitionLabelTemplate: 'SUB 13 - 1ª DIVISÃO - {year}',
  },
  sub14: {
    key: 'sub14',
    fmfD: 15,
    slug: 'mineiro-sub14-1-2026',
    name: 'Mineiro Sub-14 1ª divisão 2026',
    fixtureCategory: 'sub14',
    competitionLabelTemplate: 'SUB 14 - 1ª DIVISÃO - {year}',
  },
  sub15: {
    key: 'sub15',
    fmfD: 4,
    slug: 'mineiro-sub15-1-2026',
    name: 'Mineiro Sub-15 1ª divisão 2026',
    fixtureCategory: 'sub15',
    competitionLabelTemplate: 'SUB 15 - 1ª DIVISÃO - {year}',
  },
  sub17: {
    key: 'sub17',
    fmfD: 5,
    slug: 'mineiro-sub17-1-2026',
    name: 'Mineiro Sub-17 1ª divisão 2026',
    fixtureCategory: 'sub17',
    competitionLabelTemplate: 'SUB 17 - 1ª DIVISÃO - {year}',
  },
  sub20: {
    key: 'sub20',
    fmfD: 6,
    slug: 'mineiro-sub20-1-2026',
    name: 'Mineiro Sub-20 1ª divisão 2026',
    fixtureCategory: 'sub20',
    competitionLabelTemplate: 'SUB 20 - 1ª DIVISÃO - {year}',
  },
};

export const FMF_SCRAPER_PRESET_KEYS = Object.keys(FMF_SCRAPER_PRESETS) as FmfScraperPresetKey[];

export function isFmfPresetKey(v: string): v is FmfScraperPresetKey {
  return v in FMF_SCRAPER_PRESETS;
}

export function fmfProxJogosUrl(fmfD: number): string {
  return `https://www.fmf.com.br/Competicoes/ProxJogos.aspx?d=${fmfD}`;
}

export function fmfCompetitionLabelForPreset(
  presetKey: FmfScraperPresetKey,
  season: number,
): string {
  return FMF_SCRAPER_PRESETS[presetKey].competitionLabelTemplate.replace(
    '{year}',
    String(season),
  );
}

/** Preset cuja fixtureCategory bate com a categoria do clube (ex.: sub13). */
export function findFmfPresetByFixtureCategory(
  category: string,
): FmfScraperPreset | null {
  const key = category.trim().toLowerCase();
  if (!key) return null;
  return (
    Object.values(FMF_SCRAPER_PRESETS).find((p) => p.fixtureCategory === key) ?? null
  );
}

/** Infere categoria BCG a partir do nome da competição FMF (ou rótulo sintético). */
export function inferCategoryFromCompetitionLabel(competition: string): string | null {
  const n = competition.trim();
  if (!n) return null;
  if (/m[oó]dulo\s*ii/i.test(n)) return 'modulo_ii';
  if (/\bprincipal\b/i.test(n)) return 'principal';
  if (/\bfeminino\b/i.test(n)) return 'feminino';
  const sub = n.match(/\bSUB\s*[- ]?\s*(\d{1,2})\b/i);
  if (sub) {
    const num = sub[1]!.padStart(2, '0');
    return `sub${num}`;
  }
  return null;
}

/**
 * Rótulo de competição para o seletor de cartões:
 * preset FMF quando existir; senão rótulo sintético pela categoria do clube.
 */
export function competitionLabelForTenantCategory(
  category: string,
  season: number,
): string {
  const key = category.trim().toLowerCase();
  if (!key) return `Competição ${season}`;
  const preset = findFmfPresetByFixtureCategory(key);
  if (preset) return fmfCompetitionLabelForPreset(preset.key, season);
  const sub = key.match(/^sub(\d+)$/i);
  if (sub) return `SUB ${sub[1]} - ${season}`;
  if (key === 'principal') return `PRINCIPAL - ${season}`;
  if (key === 'feminino') return `FEMININO - ${season}`;
  return `${key.toUpperCase()} - ${season}`;
}
