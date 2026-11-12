import { travelMatchesCategoryFilter } from '../futebol-agenda/travel-categories.util';
import {
  matchDatesEquivalent,
  matchOpponentsEquivalent,
} from '../common/match-game-opponent.util';
import {
  buildFmfTravelExternalId,
  fmfExternalIdCandidates,
  fmfMatchToStartISO,
  resolveFmfPresetKeys,
} from '../fmf-scraper/fmf-fixture.util';
import { isFmfTeamMatch } from '../fmf-scraper/fmf-team-match.util';
import { toOperationalCategory } from '../fmf-scraper/fmf-operational-category.util';
import type { FmfScraperStore } from '../fmf-scraper/fmf-scraper.service';
import type { FutebolGameListItem } from './futebol-jogos.types';

function matchSeason(isoDate: string, season: number): boolean {
  const y = new Date(isoDate).getFullYear();
  return y === season;
}

type TravelRow = {
  id: string;
  matchDate: Date;
  opponentName: string | null;
  category: string | null;
  categories?: unknown;
  externalId?: string | null;
  championshipName?: string | null;
  stadiumName?: string | null;
  city?: string | null;
  isHomeMatch?: boolean | null;
};

export type BuildFmfUpcomingListParams = {
  store: FmfScraperStore;
  tenantName: string;
  aliases: string[];
  tenantCategoryKeys: string[];
  presetMap: Record<string, { fixtureCategory: string; fmfD?: number }>;
  travels: TravelRow[];
  categoryFilter: string;
  season: number;
  now: Date;
  coachByTravel: Map<string, string>;
  existing: FutebolGameListItem[];
};

function alreadyListed(
  existing: FutebolGameListItem[],
  opponent: string,
  matchDateIso: string,
  category: string | null,
): boolean {
  return existing.some(
    (g) =>
      matchOpponentsEquivalent(g.opponentName, opponent) &&
      matchDatesEquivalent(g.matchDate, matchDateIso) &&
      (!category?.trim() || g.category === category),
  );
}

function findTravelByExternalIds(
  travels: TravelRow[],
  travelIds: string[],
): TravelRow | undefined {
  const set = new Set(travelIds);
  return travels.find((t) => t.externalId?.trim() && set.has(t.externalId.trim()));
}

/** Jogos FMF agendados ainda não cobertos por viagem na lista de Jogos (preparação). */
export function buildFmfUpcomingListItems(
  params: BuildFmfUpcomingListParams,
): FutebolGameListItem[] {
  const {
    store,
    tenantName,
    aliases,
    tenantCategoryKeys,
    presetMap,
    travels,
    categoryFilter,
    season,
    now,
    coachByTravel,
    existing,
  } = params;

  if (!store.updatedAt) return [];

  const presetKeys = resolveFmfPresetKeys(store, tenantCategoryKeys, {
    presetMap,
    club: { tenantName, aliases },
  });

  const out: FutebolGameListItem[] = [];

  for (const presetKey of presetKeys) {
    const snap = store.categories[presetKey];
    if (!snap) continue;

    const fmfD = snap.fmfD ?? presetMap[presetKey]?.fmfD ?? 0;

    for (const m of snap.matches) {
      if (m.status !== 'scheduled') continue;

      const startISO = fmfMatchToStartISO(m);
      if (!startISO) continue;
      const startAt = new Date(startISO);
      if (startAt < now) continue;
      if (!matchSeason(startISO, season)) continue;

      const isHome = isFmfTeamMatch(m.homeName, tenantName, aliases);
      const isAway = isFmfTeamMatch(m.awayName, tenantName, aliases);
      if (!isHome && !isAway) continue;

      const operationalCategory = toOperationalCategory(snap.fixtureCategory);
      const travelStub = { category: operationalCategory, categories: null };
      if (!travelMatchesCategoryFilter(travelStub, categoryFilter)) continue;

      const opponent = (isHome ? m.awayName : m.homeName).trim() || 'Adversário';
      if (alreadyListed(existing, opponent, startISO, operationalCategory)) continue;
      if (alreadyListed(out, opponent, startISO, operationalCategory)) continue;

      const idCandidates = fmfExternalIdCandidates(presetKey, fmfD, m).travel;
      const travelHit = findTravelByExternalIds(travels, idCandidates);

      if (travelHit) {
        if (travelHit.matchDate < now) continue;
        if (
          !travelMatchesCategoryFilter(
            { category: travelHit.category, categories: travelHit.categories },
            categoryFilter,
          )
        ) {
          continue;
        }
        if (existing.some((g) => g.travelLogisticsId === travelHit.id)) continue;
      }

      const championshipParts = [
        snap.name,
        m.phaseLabel?.trim(),
        m.roundNumber != null ? `Rodada ${m.roundNumber}` : '',
      ].filter(Boolean);
      const competition = championshipParts.join(' — ') || snap.name;

      const travelExternalId = buildFmfTravelExternalId(fmfD, m);
      const gameKey = travelHit
        ? `travel:${travelHit.id}`
        : `fmf-fixture:${encodeURIComponent(travelExternalId)}`;

      out.push({
        gameKey,
        status: 'upcoming',
        matchDate: startISO,
        opponentName: opponent,
        competition,
        category: operationalCategory,
        isHome,
        homeTeam: isHome ? tenantName : opponent,
        awayTeam: isHome ? opponent : tenantName,
        scoreLabel: '—',
        result: null,
        hasSumula: false,
        fmfMatchReportId: null,
        travelLogisticsId: travelHit?.id ?? null,
        yellowCards: 0,
        redCards: 0,
        stadiumName: travelHit?.stadiumName ?? m.venueText?.trim() ?? null,
        city: travelHit?.city ?? null,
        hasCoachReport: travelHit ? coachByTravel.has(travelHit.id) : false,
        incidentCount: 0,
        attachmentCount: 0,
        possessionPct: null,
        setPiecesFor: null,
        setPiecesAgainst: null,
      });
    }
  }

  return out;
}

export type FmfFixtureGameResolution = {
  listItem: FutebolGameListItem;
  travelLogisticsId: string | null;
};

/** Localiza jogo agendado no store FMF pelo externalId de viagem (fmf-travel-…). */
export function resolveFmfFixtureGameFromStore(
  store: FmfScraperStore,
  tenantName: string,
  aliases: string[],
  tenantCategoryKeys: string[],
  presetMap: Record<string, { fixtureCategory: string; fmfD?: number }>,
  travels: TravelRow[],
  travelExternalId: string,
  coachByTravel: Map<string, string>,
): FmfFixtureGameResolution | null {
  if (!store.updatedAt) return null;

  const travelRow = travels.find((t) => t.externalId?.trim() === travelExternalId);

  const presetKeys = resolveFmfPresetKeys(store, tenantCategoryKeys, {
    presetMap,
    club: { tenantName, aliases },
  });

  for (const presetKey of presetKeys) {
    const snap = store.categories[presetKey];
    if (!snap) continue;
    const fmfD = snap.fmfD ?? presetMap[presetKey]?.fmfD ?? 0;

    for (const m of snap.matches) {
      const ids = fmfExternalIdCandidates(presetKey, fmfD, m).travel;
      if (!ids.includes(travelExternalId)) continue;

      const startISO = fmfMatchToStartISO(m);
      if (!startISO) return null;

      const isHome = isFmfTeamMatch(m.homeName, tenantName, aliases);
      const opponent = (isHome ? m.awayName : m.homeName).trim() || 'Adversário';
      const operationalCategory = toOperationalCategory(snap.fixtureCategory);
      const championshipParts = [
        snap.name,
        m.phaseLabel?.trim(),
        m.roundNumber != null ? `Rodada ${m.roundNumber}` : '',
      ].filter(Boolean);
      const competition = championshipParts.join(' — ') || snap.name;

      const listItem: FutebolGameListItem = {
        gameKey: travelRow
          ? `travel:${travelRow.id}`
          : `fmf-fixture:${encodeURIComponent(travelExternalId)}`,
        status: 'upcoming',
        matchDate: startISO,
        opponentName: opponent,
        competition,
        category: operationalCategory,
        isHome,
        homeTeam: isHome ? tenantName : opponent,
        awayTeam: isHome ? opponent : tenantName,
        scoreLabel: '—',
        result: null,
        hasSumula: false,
        fmfMatchReportId: null,
        travelLogisticsId: travelRow?.id ?? null,
        yellowCards: 0,
        redCards: 0,
        stadiumName: travelRow?.stadiumName ?? m.venueText?.trim() ?? null,
        city: travelRow?.city ?? null,
        hasCoachReport: travelRow ? coachByTravel.has(travelRow.id) : false,
        incidentCount: 0,
        attachmentCount: 0,
        possessionPct: null,
        setPiecesFor: null,
        setPiecesAgainst: null,
      };

      return { listItem, travelLogisticsId: travelRow?.id ?? null };
    }
  }

  return null;
}
