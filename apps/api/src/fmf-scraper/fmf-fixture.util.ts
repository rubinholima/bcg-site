import type { FixtureDto } from '../public/dto/fixture.dto';
import { normalizeTeamNameKeyForMerge } from '../public/visiting-team-logo-merge.util';
import type { FmfParsedMatch } from './fmf-proxjogos.parser';
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
  return `fmf-${presetKey}-${m.matchDate ?? 'nodate'}-${h}-${a}`;
}

export function fmfMatchToStartISO(m: FmfParsedMatch): string {
  if (!m.matchDate) return '';
  const t = (m.kickoffTime ?? '12:00:00').slice(0, 5);
  const combined = `${m.matchDate}T${t}:00`;
  const date = new Date(combined);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function buildLeagueFixturesFromFmfStore(
  store: FmfScraperStore,
  presetKeys: FmfScraperPresetKey[],
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
        competitionName: snap.name,
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

export function resolveFmfPresetKeys(
  store: FmfScraperStore,
  tenantCategoryKeys: string[],
  configured?: FmfScraperPresetKey[],
): FmfScraperPresetKey[] {
  if (configured?.length) {
    return configured.filter((k) => store.categories[k]);
  }
  const available = FMF_SCRAPER_PRESET_KEYS.filter((k) => store.categories[k]);
  if (tenantCategoryKeys.length === 0) return available;
  const wanted = new Set(tenantCategoryKeys);
  const matched = available.filter((k) =>
    wanted.has(FMF_SCRAPER_PRESETS[k].fixtureCategory),
  );
  return matched.length > 0 ? matched : available;
}
