import type { PrismaService } from '../prisma/prisma.service';
import { toOperationalCategory } from './fmf-operational-category.util';
import type { FmfScraperPreset } from './fmf-scraper.presets';
import {
  FMF_SCRAPER_PRESET_KEYS,
  FMF_SCRAPER_PRESETS,
  type FmfScraperPresetKey,
} from './fmf-scraper.presets';

export const FMF_SCRAPER_PRESET_EXTENSIONS_KEY = 'fmf_scraper_preset_extensions';

/**
 * Presets FMF estáveis fora do menu “1ª divisão” — mesclados em todo import/sync.
 * Copa Inconfidência Sub-20: ProxJogos?d=35 (sem vínculo com d=6).
 */
export const FMF_BUILTIN_PRESET_EXTENSIONS: Record<string, FmfScraperPreset> = {
  sub20_inconfidencia: {
    key: 'sub20_inconfidencia' as FmfScraperPresetKey,
    fmfD: 35,
    slug: 'copa-inconfidencia-sub20-2026',
    name: 'Copa Inconfidência Sub-20 2026',
    fixtureCategory: 'sub20',
    competitionLabelTemplate: 'COPA INCONFIDÊNCIA - SUB 20 - {year}',
  },
};

export type FmfScraperPresetExtension = Omit<FmfScraperPreset, 'key'> & {
  /** Chave estável no store (ex.: copa_master_mg, sub15_2div). */
  key: string;
};

function isPresetExtension(value: unknown): value is FmfScraperPresetExtension {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.key === 'string' &&
    row.key.trim().length > 0 &&
    typeof row.fmfD === 'number' &&
    Number.isFinite(row.fmfD) &&
    typeof row.slug === 'string' &&
    typeof row.name === 'string' &&
    typeof row.fixtureCategory === 'string' &&
    typeof row.competitionLabelTemplate === 'string'
  );
}

/** Presets extras configuráveis (IntegrationConfig) — sem exceção por clube. */
export function parseFmfPresetExtensions(raw: unknown): Record<string, FmfScraperPreset> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, FmfScraperPreset> = {};
  for (const entry of Object.values(raw as Record<string, unknown>)) {
    if (!isPresetExtension(entry)) continue;
    const key = entry.key.trim();
    out[key] = {
      key: key as FmfScraperPresetKey,
      fmfD: entry.fmfD,
      slug: entry.slug.trim(),
      name: entry.name.trim(),
      fixtureCategory: toOperationalCategory(entry.fixtureCategory),
      competitionLabelTemplate: entry.competitionLabelTemplate.trim(),
    };
  }
  return out;
}

export function mergeFmfPresetMaps(
  extensions: Record<string, FmfScraperPreset> = {},
): Record<string, FmfScraperPreset> {
  return { ...FMF_SCRAPER_PRESETS, ...FMF_BUILTIN_PRESET_EXTENSIONS, ...extensions };
}

export function listFmfPresetKeys(
  extensions: Record<string, FmfScraperPreset> = {},
): string[] {
  return Object.keys(mergeFmfPresetMaps(extensions));
}

export function listFmfPresetKeysForImport(
  extensions: Record<string, FmfScraperPreset> = {},
): string[] {
  const merged = mergeFmfPresetMaps(extensions);
  const builtin = FMF_SCRAPER_PRESET_KEYS.filter((k) => merged[k]);
  const builtinExtra = Object.keys(FMF_BUILTIN_PRESET_EXTENSIONS).filter((k) => merged[k]);
  const extra = Object.keys(extensions).filter(
    (k) =>
      !FMF_SCRAPER_PRESET_KEYS.includes(k as FmfScraperPresetKey) &&
      !(k in FMF_BUILTIN_PRESET_EXTENSIONS),
  );
  return [
    ...builtin,
    ...builtinExtra.sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ...extra.sort((a, b) => a.localeCompare(b, 'pt-BR')),
  ];
}

export async function loadFmfPresetExtensionMap(
  prisma: PrismaService,
): Promise<Record<string, FmfScraperPreset>> {
  const row = await prisma.integrationConfig.findUnique({
    where: { key: FMF_SCRAPER_PRESET_EXTENSIONS_KEY },
  });
  return parseFmfPresetExtensions(row?.config);
}
