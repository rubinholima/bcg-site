import type { FixtureDto } from '../public/dto/fixture.dto';
import { normalizeTeamNameKeyForMerge } from '../public/visiting-team-logo-merge.util';
import type { FmfParsedMatch } from './fmf-proxjogos.parser';
import {
  discoverFmfPresetKeysForClub,
  type FmfClubPresetDiscoveryContext,
} from './fmf-club-preset-discovery.util';
import { mergeFmfPresetMaps } from './fmf-preset-registry.util';
import {
  FMF_SCRAPER_PRESET_KEYS,
  FMF_SCRAPER_PRESETS,
  type FmfScraperPresetKey,
} from './fmf-scraper.presets';
import type { FmfScraperStore } from './fmf-scraper.service';

export function buildFmfExternalId(presetKey: string, m: FmfParsedMatch): string {
  if (m.fmfJogoNumber != null) return `fmf-${presetKey}-j${m.fmfJogoNumber}`;
  const h = normalizeTeamNameKeyForMerge(m.homeName);
  const a = normalizeTeamNameKeyForMerge(m.awayName);
  const phase = normalizeTeamNameKeyForMerge(m.phaseLabel ?? '') || 'fase';
  return `fmf-${presetKey}-${phase}-${m.matchDate ?? 'nodate'}-${h}-${a}`;
}

export function buildFmfTravelExternalId(presetKey: string, m: FmfParsedMatch): string {
  if (m.fmfJogoNumber != null) return `fmf-travel-${presetKey}-j${m.fmfJogoNumber}`;
  return `fmf-travel-${buildFmfExternalId(presetKey, m).replace(/^fmf-/, '')}`;
}

export function fmfMatchToStartISO(m: FmfParsedMatch): string {
  if (!m.matchDate) return '';
  const t = (m.kickoffTime ?? '12:00:00').slice(0, 5);
  const date = new Date(`${m.matchDate}T${t}:00-03:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function buildLeagueFixturesFromFmfStore(
  store: FmfScraperStore,
  presetKeys: string[],
): FixtureDto[] {
  const out: FixtureDto[] = [];
  const seen = new Set<string>();

  for (const presetKey of presetKeys) {
    const snap = store.categories[presetKey];
    if (!snap) continue;

    for (const m of snap.matches) {
      const startISO = fmfMatchToStartISO(m);
      if (!startISO) continue;

      const externalId = buildFmfExternalId(presetKey, m);
      if (seen.has(externalId)) continue;
      seen.add(externalId);

      const finished =
        m.status === 'finished' && m.homeGoals != null && m.awayGoals != null;

      out.push({
        externalId,
        startISO,
        status: finished ? 'FINAL' : 'SCHEDULED',
        competitionName: m.phaseLabel?.trim()
          ? `${snap.name} — ${m.phaseLabel.trim()}`
          : snap.name,
        venueName: m.venueText ?? undefined,
        homeTeamName: m.homeName,
        awayTeamName: m.awayName,
        category: snap.fixtureCategory,
        homeScore: finished ? (m.homeGoals ?? undefined) : undefined,
        awayScore: finished ? (m.awayGoals ?? undefined) : undefined,
      });
    }
  }

  return out.sort(
    (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime(),
  );
}

export type ResolveFmfPresetKeysOptions = {
  configured?: string[];
  presetMap?: Record<string, { fixtureCategory: string }>;
  club?: FmfClubPresetDiscoveryContext;
  /** Quando true (default), une categorias cadastradas + presets descobertos no snapshot. */
  mergeDiscovered?: boolean;
};

export function resolveFmfPresetKeys(
  store: FmfScraperStore,
  tenantCategoryKeys: string[],
  configuredOrOptions?: string[] | ResolveFmfPresetKeysOptions,
): string[] {
  const options: ResolveFmfPresetKeysOptions = Array.isArray(configuredOrOptions)
    ? { configured: configuredOrOptions }
    : (configuredOrOptions ?? {});
  const presetMap = options.presetMap ?? mergeFmfPresetMaps();
  const allKnownKeys = Object.keys(presetMap);
  const available = allKnownKeys.filter((k) => store.categories[k]);

  if (options.configured?.length) {
    return options.configured.filter((k) => store.categories[k]);
  }

  const wanted = new Set(tenantCategoryKeys.map((k) => k.trim().toLowerCase()).filter(Boolean));
  const byCategory =
    wanted.size === 0
      ? []
      : available.filter((k) => wanted.has(presetMap[k]?.fixtureCategory ?? ''));

  const discovered =
    options.mergeDiscovered !== false && options.club
      ? discoverFmfPresetKeysForClub(store, options.club).filter((k) =>
          store.categories[k],
        )
      : [];

  const merged = [...new Set([...byCategory, ...discovered])].filter((k) =>
    store.categories[k],
  );

  if (merged.length > 0) return merged.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (wanted.size === 0) return available;
  return available;
}

/** Compat: presets built-in disponíveis no store (sem extensões). */
export function resolveFmfBuiltinPresetKeys(
  store: FmfScraperStore,
  tenantCategoryKeys: string[],
  configured?: FmfScraperPresetKey[],
): FmfScraperPresetKey[] {
  return resolveFmfPresetKeys(store, tenantCategoryKeys, {
    configured,
    presetMap: FMF_SCRAPER_PRESETS,
    mergeDiscovered: false,
  }) as FmfScraperPresetKey[];
}
