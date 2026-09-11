import type { FmfParsedMatch } from './fmf-proxjogos.parser';
import { parseFmfProxJogosHtml } from './fmf-proxjogos.parser';
import type { FmfCompetitionCatalogEntry } from './fmf-competition-catalog.util';
import type { FmfScraperPresetExtension } from './fmf-preset-registry.util';
import { inferCategoryFromCompetitionLabel } from './fmf-scraper.presets';
import { isFmfTeamMatch } from './fmf-team-match.util';

export type FmfSyncClubRef = {
  slug: string;
  name: string;
  aliases: string[];
};

export type FmfDiscoveredCompetition = {
  fmfD: number;
  presetKey: string;
  officialLabel: string | null;
  fixtureCategory: string;
  villaFixtureCount: number;
  signature: string;
  catalogEntry: FmfCompetitionCatalogEntry;
};

function clubInMatch(m: FmfParsedMatch, club: FmfSyncClubRef): boolean {
  return (
    isFmfTeamMatch(m.homeName, club.name, club.aliases) ||
    isFmfTeamMatch(m.awayName, club.name, club.aliases)
  );
}

export function clubMatchesInSeason(
  matches: FmfParsedMatch[],
  club: FmfSyncClubRef,
  season: number,
): FmfParsedMatch[] {
  return matches.filter(
    (m) => (m.matchDate ?? '').startsWith(String(season)) && clubInMatch(m, club),
  );
}

/** Assinatura estável para deduplicar URLs FMF espelhadas (ex.: d=12 ≡ d=13). */
export function buildFmfFixtureSignature(matches: FmfParsedMatch[]): string {
  return matches
    .map((m) => `${m.matchDate ?? ''}|${m.homeName}|${m.awayName}|${m.fmfJogoNumber ?? ''}`)
    .sort()
    .join(';;');
}

function slugifyPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Infere preset extension a partir do rótulo oficial (súmula/HTML) ou catálogo. */
export function inferPresetFromCompetitionContext(
  fmfD: number,
  opts: {
    officialLabel?: string | null;
    catalogEntry?: FmfCompetitionCatalogEntry;
    season?: number;
  },
): FmfScraperPresetExtension {
  const season = opts.season ?? new Date().getFullYear();
  const label = opts.officialLabel?.trim() ?? '';
  const fromLabel = inferCategoryFromCompetitionLabel(label);
  const isSecondDiv = /2\s*[ªA]?\s*DIV/i.test(label) || /2\s*[ªA]?\s*Div/i.test(opts.catalogEntry?.navLabel ?? '');

  let fixtureCategory = fromLabel ?? 'fmf_comp';
  if (fromLabel?.startsWith('sub') && isSecondDiv) {
    fixtureCategory = `${fromLabel}_2div`;
  } else if (opts.catalogEntry?.categoryHint && /sub\s*(\d+)/i.test(opts.catalogEntry.categoryHint)) {
    const num = opts.catalogEntry.categoryHint.match(/sub\s*(\d+)/i)![1]!;
    fixtureCategory = isSecondDiv ? `sub${num}_2div` : `sub${num}`;
  } else if (/m[óo]dulo\s*ii/i.test(label)) {
    fixtureCategory = 'modulo_ii';
  }

  const key = fixtureCategory;
  const name =
    label ||
    [opts.catalogEntry?.categoryHint, opts.catalogEntry?.navLabel].filter(Boolean).join(' — ') ||
    `Competição FMF d=${fmfD}`;

  return {
    key,
    fmfD,
    slug: slugifyPart(`${key}-${season}`),
    name,
    fixtureCategory,
    competitionLabelTemplate: label.includes('{year}')
      ? label
      : label.replace(String(season), '{year}') ||
        `${name.replace(String(season), '').trim()} {year}`,
  };
}

export function extractOfficialCompetitionLabelFromHtml(html: string): string | null {
  const m = html.match(/SUB\s*\d+\s*-\s*2\s*[ªA]?\s*DIVIS[AÃ]O\s*-\s*\d{4}/i);
  if (m) return m[0].replace(/\s+/g, ' ').trim();
  const m2 = html.match(/M[ÓO]DULO\s*II\s*-\s*\d{4}/i);
  if (m2) return m2[0].replace(/\s+/g, ' ').trim();
  const m3 = html.match(/SUB\s*\d+\s*-\s*2\s*[ªA]?\s*DIVIS[AÃ]O\s*\d{4}/i);
  if (m3) return m3[0].replace(/\s+/g, ' ').trim();
  return null;
}

export function discoverClubCompetitionsFromCatalog(
  catalogEntries: FmfCompetitionCatalogEntry[],
  clubs: FmfSyncClubRef[],
  htmlByD: Map<number, string>,
  season: number,
): FmfDiscoveredCompetition[] {
  const seenSignatures = new Set<string>();
  const found: FmfDiscoveredCompetition[] = [];

  for (const entry of catalogEntries) {
    const html = htmlByD.get(entry.fmfD);
    if (!html) continue;
    const matches = parseFmfProxJogosHtml(html);
    const officialLabel = extractOfficialCompetitionLabelFromHtml(html);

    for (const club of clubs) {
      const clubMatches = clubMatchesInSeason(matches, club, season);
      if (clubMatches.length === 0) continue;

      const signature = buildFmfFixtureSignature(clubMatches);
      if (seenSignatures.has(signature)) continue;
      seenSignatures.add(signature);

      const preset = inferPresetFromCompetitionContext(entry.fmfD, {
        officialLabel,
        catalogEntry: entry,
        season,
      });

      found.push({
        fmfD: entry.fmfD,
        presetKey: preset.key,
        officialLabel,
        fixtureCategory: preset.fixtureCategory,
        villaFixtureCount: clubMatches.length,
        signature,
        catalogEntry: entry,
      });
      break;
    }
  }

  return found.sort((a, b) => a.fmfD - b.fmfD);
}
