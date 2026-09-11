import type { FmfParsedMatch } from './fmf-proxjogos.parser';
import { isFmfTeamMatch } from './fmf-team-match.util';
import type { FmfScraperStore } from './fmf-scraper.service';

export type FmfClubPresetDiscoveryContext = {
  tenantName: string;
  aliases?: string[];
  /** Temporada alvo (default: ano corrente). */
  season?: number;
};

function matchInSeason(m: FmfParsedMatch, season: number): boolean {
  if (!m.matchDate) return false;
  const year = Number.parseInt(m.matchDate.slice(0, 4), 10);
  return year === season;
}

function clubInMatch(
  m: FmfParsedMatch,
  tenantName: string,
  aliases: string[],
): boolean {
  return (
    isFmfTeamMatch(m.homeName, tenantName, aliases) ||
    isFmfTeamMatch(m.awayName, tenantName, aliases)
  );
}

/** Presets do snapshot global em que o clube aparece na temporada. */
export function discoverFmfPresetKeysForClub(
  store: FmfScraperStore,
  ctx: FmfClubPresetDiscoveryContext,
): string[] {
  const season = ctx.season ?? new Date().getFullYear();
  const aliases = ctx.aliases ?? [];
  const found: string[] = [];

  for (const [presetKey, snapshot] of Object.entries(store.categories ?? {})) {
    if (!snapshot?.matches?.length) continue;
    const hasClub = snapshot.matches.some(
      (m) => matchInSeason(m, season) && clubInMatch(m, ctx.tenantName, aliases),
    );
    if (hasClub) found.push(presetKey);
  }

  return [...new Set(found)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
