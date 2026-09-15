import type { FixtureDto } from '../public/dto/fixture.dto';
import { normalizeTeamNameKeyForMerge } from '../public/visiting-team-logo-merge.util';
import type { FmfParsedMatch } from './fmf-proxjogos.parser';
import { toOperationalCategory } from './fmf-operational-category.util';
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

/** Identidade canônica estável — d + número do jogo FMF (independe do preset key). */
export function buildFmfExternalId(fmfD: number, m: FmfParsedMatch): string {
  if (m.fmfJogoNumber != null) return `fmf-d${fmfD}-j${m.fmfJogoNumber}`;
  const h = normalizeTeamNameKeyForMerge(m.homeName);
  const a = normalizeTeamNameKeyForMerge(m.awayName);
  const phase = normalizeTeamNameKeyForMerge(m.phaseLabel ?? '') || 'fase';
  return `fmf-d${fmfD}-${phase}-${m.matchDate ?? 'nodate'}-${h}-${a}`;
}

export function buildFmfTravelExternalId(fmfD: number, m: FmfParsedMatch): string {
  if (m.fmfJogoNumber != null) return `fmf-travel-d${fmfD}-j${m.fmfJogoNumber}`;
  return `fmf-travel-${buildFmfExternalId(fmfD, m).replace(/^fmf-/, '')}`;
}

/** Formato legado (preset key) — usado só para localizar registros antigos no upsert. */
export function buildLegacyFmfExternalId(presetKey: string, m: FmfParsedMatch): string {
  if (m.fmfJogoNumber != null) return `fmf-${presetKey}-j${m.fmfJogoNumber}`;
  const h = normalizeTeamNameKeyForMerge(m.homeName);
  const a = normalizeTeamNameKeyForMerge(m.awayName);
  const phase = normalizeTeamNameKeyForMerge(m.phaseLabel ?? '') || 'fase';
  return `fmf-${presetKey}-${phase}-${m.matchDate ?? 'nodate'}-${h}-${a}`;
}

export function buildLegacyFmfTravelExternalId(presetKey: string, m: FmfParsedMatch): string {
  if (m.fmfJogoNumber != null) return `fmf-travel-${presetKey}-j${m.fmfJogoNumber}`;
  return `fmf-travel-${buildLegacyFmfExternalId(presetKey, m).replace(/^fmf-/, '')}`;
}

export function fmfExternalIdCandidates(
  presetKey: string,
  fmfD: number,
  m: FmfParsedMatch,
): { agenda: string[]; travel: string[] } {
  const agenda = [
    buildFmfExternalId(fmfD, m),
    buildLegacyFmfExternalId(presetKey, m),
  ];
  const travel = [
    buildFmfTravelExternalId(fmfD, m),
    buildLegacyFmfTravelExternalId(presetKey, m),
  ];
  return {
    agenda: [...new Set(agenda)],
    travel: [...new Set(travel)],
  };
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

      const externalId = buildFmfExternalId(snap.fmfD, m);
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
        category: toOperationalCategory(snap.fixtureCategory),
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
  /** Quando true (default), inclui presets do snapshot em que o clube participa — filtrados pelas categorias do tenant. */
  mergeDiscovered?: boolean;
};

/** Presets cujo fixtureCategory operacional bate com categorias administrativas selecionadas. */
export function resolvePresetKeysForOperationalCategories(
  presetMap: Record<string, { fixtureCategory: string }>,
  operationalCategories: string[],
): string[] {
  const wanted = new Set(
    operationalCategories.map((k) => toOperationalCategory(k)).filter(Boolean),
  );
  if (wanted.size === 0) {
    return Object.keys(presetMap).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  return Object.keys(presetMap)
    .filter((k) => wanted.has(toOperationalCategory(presetMap[k]?.fixtureCategory ?? '')))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

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

  const wanted = new Set(
    tenantCategoryKeys.map((k) => toOperationalCategory(k)).filter(Boolean),
  );
  const byCategory =
    wanted.size === 0
      ? []
      : available.filter((k) =>
          wanted.has(toOperationalCategory(presetMap[k]?.fixtureCategory ?? '')),
        );

  const discovered =
    options.mergeDiscovered !== false && options.club
      ? discoverFmfPresetKeysForClub(store, options.club).filter((k) => {
          if (!store.categories[k]) return false;
          if (wanted.size === 0) return true;
          const op = toOperationalCategory(presetMap[k]?.fixtureCategory ?? '');
          return wanted.has(op);
        })
      : [];

  const merged = [...new Set([...byCategory, ...discovered])].filter((k) =>
    store.categories[k],
  );

  if (merged.length > 0) return merged.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (wanted.size === 0) return available;
  return byCategory.sort((a, b) => a.localeCompare(b, 'pt-BR'));
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
