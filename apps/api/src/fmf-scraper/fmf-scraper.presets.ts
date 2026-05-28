/** Presets FMF ProxJogos.aspx?d=N — conferidos em maio/2026. */
export type FmfScraperPresetKey =
  | 'modulo_ii'
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
}

export const FMF_SCRAPER_PRESETS: Record<FmfScraperPresetKey, FmfScraperPreset> = {
  modulo_ii: {
    key: 'modulo_ii',
    fmfD: 2,
    slug: 'mineiro-modulo-ii-2026',
    name: 'Mineiro Módulo II 2026',
    fixtureCategory: 'modulo_ii',
  },
  sub14: {
    key: 'sub14',
    fmfD: 15,
    slug: 'mineiro-sub14-1-2026',
    name: 'Mineiro Sub-14 1ª divisão 2026',
    fixtureCategory: 'sub14',
  },
  sub15: {
    key: 'sub15',
    fmfD: 4,
    slug: 'mineiro-sub15-1-2026',
    name: 'Mineiro Sub-15 1ª divisão 2026',
    fixtureCategory: 'sub15',
  },
  sub17: {
    key: 'sub17',
    fmfD: 5,
    slug: 'mineiro-sub17-1-2026',
    name: 'Mineiro Sub-17 1ª divisão 2026',
    fixtureCategory: 'sub17',
  },
  sub20: {
    key: 'sub20',
    fmfD: 6,
    slug: 'mineiro-sub20-1-2026',
    name: 'Mineiro Sub-20 1ª divisão 2026',
    fixtureCategory: 'sub20',
  },
};

export const FMF_SCRAPER_PRESET_KEYS = Object.keys(FMF_SCRAPER_PRESETS) as FmfScraperPresetKey[];

export function isFmfPresetKey(v: string): v is FmfScraperPresetKey {
  return v in FMF_SCRAPER_PRESETS;
}

export function fmfProxJogosUrl(fmfD: number): string {
  return `https://www.fmf.com.br/Competicoes/ProxJogos.aspx?d=${fmfD}`;
}
