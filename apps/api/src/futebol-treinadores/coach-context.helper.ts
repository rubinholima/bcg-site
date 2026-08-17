import { dateKeyInBrazil } from '../common/brazil-time.util';
import { travelMatchesCategoryFilter, parseTravelCategories } from '../futebol-agenda/travel-categories.util';
import { isFmfTeamMatch } from '../fmf-scraper/fmf-team-match.util';
import {
  extractFmfPhaseHint,
  fmfPhaseLabelsMatch,
  isFmfGroupStagePhase,
  normalizeFmfPhaseKey,
  resolveCurrentFmfGroupPhase,
  type FmfParsedMatch,
} from '../fmf-scraper/fmf-proxjogos.parser';
import {
  computeStandingsFromMatches,
  type FmfScraperStore,
  type FmfStandingsRow,
} from '../fmf-scraper/fmf-scraper.service';
import { softNormalizeTeamNameKey } from '../public/visiting-team-logo-merge.util';
import {
  findGameMergeKeyInMap,
  gameOpponentDateCategoryKey,
  matchDatesEquivalent,
  matchOpponentsEquivalent,
} from '../common/match-game-opponent.util';

export function categoryKey(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function fmfCategoryMatches(reportCategory: string | null | undefined, filter: string): boolean {
  if (!filter?.trim()) return true;
  const wanted = categoryKey(filter);
  const got = categoryKey(reportCategory);
  return !!wanted && !!got && wanted === got;
}

export type FmfReportCategoryFilterRow = {
  category: string;
  matchDate: Date;
  homeTeam: string;
  awayTeam: string;
};

export function reportMatchesCategoryFilter(
  report: FmfReportCategoryFilterRow,
  category: string,
  allTravels: TravelRow[],
  clubName: string,
  aliases: string[],
): boolean {
  if (!category?.trim()) return true;
  if (fmfCategoryMatches(report.category, category)) return true;

  const isHome = isHomeSide(report.homeTeam, report.awayTeam, clubName, aliases);
  const opponent = isHome ? report.awayTeam : report.homeTeam;

  return allTravels.some(
    (t) =>
      matchDatesEquivalent(t.matchDate, report.matchDate) &&
      matchOpponentsEquivalent(t.opponentName, opponent) &&
      categoryMatchesTravel(t, category),
  );
}

export function resolveStoreCategory(
  store: FmfScraperStore | null,
  preferredCategory: string,
  fallbackCategories: string[],
): string {
  if (preferredCategory?.trim()) return preferredCategory.trim();
  if (!store?.categories) return '';

  const snapshots = Object.values(store.categories).filter(
    (s): s is NonNullable<typeof s> => !!s?.fixtureCategory,
  );
  if (snapshots.length === 0) return '';

  for (const cat of fallbackCategories) {
    const key = categoryKey(cat);
    if (!key) continue;
    const hit = snapshots.find((s) => categoryKey(s.fixtureCategory) === key);
    if (hit) return hit.fixtureCategory;
  }

  return snapshots[0]?.fixtureCategory ?? '';
}

type TravelRow = {
  id: string;
  tenantId: string;
  matchDate: Date;
  opponentName: string | null;
  championshipName: string | null;
  category: string | null;
  categories: unknown;
  isHomeMatch: boolean | null;
  stadiumName: string | null;
  city: string | null;
  status: string;
};

type FmfReportRow = FmfReportCategoryFilterRow & {
  id: string;
  competition: string;
  phase: string | null;
  round: number | null;
  season: number;
  homeScore: number | null;
  awayScore: number | null;
  playerStats: Array<{
    goals: number;
    yellowCards: number;
    redCards: number;
  }>;
};

export type CoachCompletedGame = {
  gameKey: string;
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
  category: string | null;
  matchDate: string;
  opponentName: string;
  competition: string | null;
  phase: string | null;
  round: number | null;
  isHome: boolean;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreLabel: string;
  result: 'V' | 'E' | 'D' | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  yellowCards: number;
  redCards: number;
  possessionPct: number | null;
  setPiecesFor: number | null;
  setPiecesAgainst: number | null;
  statsSource: 'official' | 'manual' | null;
  hasDetailedStats: boolean;
};

export type CoachLastRoundMatch = {
  round: number | null;
  phase: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreLabel: string;
  matchDate: string | null;
  isClubMatch: boolean;
};

export type CoachStandingRow = {
  position: number;
  team: string;
  points: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  isClub?: boolean;
};

type StatOverrideRow = {
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
  matchDate: Date;
  opponentName: string | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  yellowCards: number | null;
  redCards: number | null;
  possessionPct: number | null;
  setPiecesFor: number | null;
  setPiecesAgainst: number | null;
};

function gameMergeKey(
  matchDate: Date,
  opponentName: string | null | undefined,
  category: string | null | undefined,
): string {
  return gameOpponentDateCategoryKey(matchDate, opponentName, category);
}

function resolveTravelCategory(travel: TravelRow): string | null {
  const list = parseTravelCategories(travel.categories);
  if (list.length === 1) return list[0]!;
  if (list.length > 1) return list[0] ?? travel.category;
  return travel.category;
}

function resolveGameCategory(
  reportCategory: string | null | undefined,
  travel: TravelRow | null | undefined,
): string | null {
  if (reportCategory?.trim()) return reportCategory.trim();
  if (travel) return resolveTravelCategory(travel);
  return null;
}

function findMatchingTravel(
  travels: TravelRow[],
  matchDate: Date,
  opponentName: string,
  category: string | null | undefined,
): TravelRow | undefined {
  const matches = travels.filter(
    (t) =>
      matchDatesEquivalent(t.matchDate, matchDate) &&
      matchOpponentsEquivalent(t.opponentName, opponentName),
  );
  if (matches.length === 0) return undefined;
  if (!category?.trim()) return matches[0];
  const catKey = categoryKey(category);
  return (
    matches.find((t) => categoryKey(resolveTravelCategory(t)) === catKey) ??
    matches.find((t) => categoryMatchesTravel(t, category)) ??
    undefined
  );
}

function isHomeSide(
  homeTeam: string,
  awayTeam: string,
  clubName: string,
  aliases: string[],
): boolean {
  if (isFmfTeamMatch(homeTeam, clubName, aliases)) return true;
  if (isFmfTeamMatch(awayTeam, clubName, aliases)) return false;
  return true;
}

function mapStandingRows(rows: FmfStandingsRow[], clubName: string, aliases: string[]): CoachStandingRow[] {
  return rows.map((row, index) => {
    const isClub =
      isFmfTeamMatch(row.time, clubName, aliases) ||
      aliases.some((a) => isFmfTeamMatch(row.time, a, [clubName]));
    return {
      position: index + 1,
      team: row.time,
      points: row.pontos,
      matches: row.jogos,
      wins: row.vitorias,
      draws: row.empates,
      losses: row.derrotas,
      goalsFor: row.golsMarcados,
      goalsAgainst: row.golsSofridos,
      goalDiff: row.saldoGols,
      isClub,
    };
  });
}

function findOverride(
  overrides: StatOverrideRow[],
  fmfMatchReportId: string | null,
  travelLogisticsId: string | null,
  matchDate: Date,
  opponentName: string,
  category: string | null | undefined,
): StatOverrideRow | undefined {
  if (fmfMatchReportId) {
    const byFmf = overrides.find((o) => o.fmfMatchReportId === fmfMatchReportId);
    if (byFmf) return byFmf;
  }
  if (travelLogisticsId) {
    const byTravel = overrides.find((o) => o.travelLogisticsId === travelLogisticsId);
    if (byTravel) return byTravel;
  }
  const key = gameMergeKey(matchDate, opponentName, category);
  return overrides.find(
    (o) => gameMergeKey(o.matchDate, o.opponentName, category) === key,
  );
}

function applyStats(
  override: StatOverrideRow | undefined,
): Pick<
  CoachCompletedGame,
  'possessionPct' | 'setPiecesFor' | 'setPiecesAgainst' | 'statsSource' | 'hasDetailedStats'
> {
  const hasManual =
    override != null &&
    (override.possessionPct != null ||
      override.setPiecesFor != null ||
      override.setPiecesAgainst != null ||
      override.goalsFor != null ||
      override.goalsAgainst != null ||
      override.yellowCards != null ||
      override.redCards != null);
  return {
    possessionPct: override?.possessionPct ?? null,
    setPiecesFor: override?.setPiecesFor ?? null,
    setPiecesAgainst: override?.setPiecesAgainst ?? null,
    statsSource: hasManual ? 'manual' : null,
    hasDetailedStats: hasManual,
  };
}

function resolveMatchScore(input: {
  isHome: boolean;
  override: StatOverrideRow | undefined;
  officialGoalsFor: number | null;
  officialGoalsAgainst: number | null;
  officialYellowCards: number;
  officialRedCards: number;
}): Pick<
  CoachCompletedGame,
  | 'homeScore'
  | 'awayScore'
  | 'goalsFor'
  | 'goalsAgainst'
  | 'scoreLabel'
  | 'result'
  | 'yellowCards'
  | 'redCards'
> {
  let goalsFor = input.officialGoalsFor;
  let goalsAgainst = input.officialGoalsAgainst;
  if (input.override?.goalsFor != null && input.override?.goalsAgainst != null) {
    goalsFor = input.override.goalsFor;
    goalsAgainst = input.override.goalsAgainst;
  }

  let yellowCards = input.officialYellowCards;
  let redCards = input.officialRedCards;
  if (input.override?.yellowCards != null) yellowCards = input.override.yellowCards;
  if (input.override?.redCards != null) redCards = input.override.redCards;

  const homeScore =
    goalsFor == null || goalsAgainst == null
      ? null
      : input.isHome
        ? goalsFor
        : goalsAgainst;
  const awayScore =
    goalsFor == null || goalsAgainst == null
      ? null
      : input.isHome
        ? goalsAgainst
        : goalsFor;

  const result =
    goalsFor == null || goalsAgainst == null
      ? null
      : goalsFor > goalsAgainst
        ? 'V'
        : goalsFor === goalsAgainst
          ? 'E'
          : 'D';

  const scoreLabel =
    homeScore == null || awayScore == null ? '—' : `${homeScore} x ${awayScore}`;

  return {
    homeScore,
    awayScore,
    goalsFor,
    goalsAgainst,
    scoreLabel,
    result,
    yellowCards,
    redCards,
  };
}

export function buildCompletedGames(input: {
  now: Date;
  category: string;
  clubName: string;
  aliases: string[];
  travels: TravelRow[];
  fmfReports: FmfReportRow[];
  overrides: StatOverrideRow[];
}): CoachCompletedGame[] {
  const { now, category, clubName, aliases, fmfReports, overrides } = input;
  const allTravels = input.travels;
  const travels = category?.trim()
    ? allTravels.filter((t) => categoryMatchesTravel(t, category))
    : allTravels;

  const byKey = new Map<string, CoachCompletedGame>();

  for (const report of fmfReports) {
    if (!reportMatchesCategoryFilter(report, category, allTravels, clubName, aliases)) continue;
    if (report.matchDate >= now) continue;
    if (
      !isFmfTeamMatch(report.homeTeam, clubName, aliases) &&
      !isFmfTeamMatch(report.awayTeam, clubName, aliases)
    ) {
      continue;
    }

    const isHome = isHomeSide(report.homeTeam, report.awayTeam, clubName, aliases);
    const opponent = isHome ? report.awayTeam : report.homeTeam;
    const ourGoals = isHome ? report.homeScore : report.awayScore;
    const theirGoals = isHome ? report.awayScore : report.homeScore;

    const travel = findMatchingTravel(allTravels, report.matchDate, opponent, report.category);
    const gameCategory = resolveGameCategory(report.category, travel);

    const override = findOverride(
      overrides,
      report.id,
      travel?.id ?? null,
      report.matchDate,
      opponent,
      gameCategory,
    );
    const stats = applyStats(override);
    const score = resolveMatchScore({
      isHome,
      override,
      officialGoalsFor: ourGoals,
      officialGoalsAgainst: theirGoals,
      officialYellowCards: report.playerStats.reduce((s, p) => s + (p.yellowCards ?? 0), 0),
      officialRedCards: report.playerStats.reduce((s, p) => s + (p.redCards ?? 0), 0),
    });

    const game: CoachCompletedGame = {
      gameKey: `fmf:${report.id}`,
      fmfMatchReportId: report.id,
      travelLogisticsId: travel?.id ?? null,
      category: gameCategory,
      matchDate: report.matchDate.toISOString(),
      opponentName: opponent,
      competition: report.competition,
      phase: report.phase,
      round: report.round,
      isHome,
      homeTeam: report.homeTeam,
      awayTeam: report.awayTeam,
      ...score,
      ...stats,
    };

    const mergeKey =
      findGameMergeKeyInMap(
        byKey,
        report.matchDate,
        opponent,
        gameCategory,
        (g) => g.opponentName,
        (g) => g.category,
      ) ?? gameMergeKey(report.matchDate, opponent, gameCategory);
    byKey.set(mergeKey, game);
  }

  for (const travel of travels) {
    const travelCategory = resolveTravelCategory(travel);
    const override = findOverride(
      overrides,
      null,
      travel.id,
      travel.matchDate,
      travel.opponentName ?? '',
      travelCategory,
    );
    const hasManualScore =
      override?.goalsFor != null && override?.goalsAgainst != null;
    if (travel.matchDate >= now && !hasManualScore) continue;

    const existingKey = findGameMergeKeyInMap(
      byKey,
      travel.matchDate,
      travel.opponentName,
      travelCategory,
      (g) => g.opponentName,
      (g) => g.category,
    );
    if (existingKey) continue;

    const key = gameMergeKey(travel.matchDate, travel.opponentName, travelCategory);
    const stats = applyStats(override);
    const isHome = travel.isHomeMatch ?? true;
    const score = resolveMatchScore({
      isHome,
      override,
      officialGoalsFor: null,
      officialGoalsAgainst: null,
      officialYellowCards: 0,
      officialRedCards: 0,
    });

    byKey.set(key, {
      gameKey: `travel:${travel.id}`,
      fmfMatchReportId: null,
      travelLogisticsId: travel.id,
      category: travelCategory,
      matchDate: travel.matchDate.toISOString(),
      opponentName: travel.opponentName ?? 'Adversário',
      competition: travel.championshipName,
      phase: null,
      round: null,
      isHome,
      homeTeam: isHome ? clubName : (travel.opponentName ?? 'Adversário'),
      awayTeam: isHome ? (travel.opponentName ?? 'Adversário') : clubName,
      ...score,
      ...stats,
    });
  }

  return [...byKey.values()].sort(
    (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime(),
  );
}

function categoryMatchesTravel(travel: TravelRow, category: string): boolean {
  return travelMatchesCategoryFilter(
    { category: travel.category, categories: travel.categories },
    category,
  );
}

function findStoreSnapshot(store: FmfScraperStore | null, category: string) {
  if (!store?.categories || !category?.trim()) return null;
  const wanted = categoryKey(category);
  if (!wanted) return null;
  return (
    Object.values(store.categories).find((s) => {
      if (!s?.fixtureCategory) return false;
      return categoryKey(s.fixtureCategory) === wanted;
    }) ?? null
  );
}

export type ChampionshipPhaseReportRow = {
  phase: string | null;
  matchDate: Date;
  homeScore: number | null;
  awayScore: number | null;
};

/** Fase atual do campeonato (FMF + súmulas + hint da viagem). Cartões zeram entre fases. */
export function resolveCurrentChampionshipPhaseForCategory(
  store: FmfScraperStore | null,
  category: string,
  reportRows: ChampionshipPhaseReportRow[] = [],
  phaseHint?: string | null,
): string | null {
  const snapshot = findStoreSnapshot(store, category);
  if (snapshot?.matches?.length) {
    const fromStore = resolveCurrentFmfGroupPhase(snapshot.matches);
    if (fromStore) return fromStore;
  }

  if (reportRows.length > 0) {
    const fromReports = resolveCurrentFmfGroupPhase(
      reportRows.map((row) => ({
        phaseLabel: row.phase,
        status:
          row.homeScore != null && row.awayScore != null ? 'finished' : 'scheduled',
        matchDate: dateKeyInBrazil(row.matchDate),
      })),
    );
    if (fromReports) return fromReports;
  }

  return extractFmfPhaseHint(phaseHint) ?? null;
}

/** Fases distintas (FMF + súmulas), ordenadas pela data do primeiro jogo de cada fase. */
export function collectChampionshipPhasesForCategory(
  store: FmfScraperStore | null,
  category: string,
  reportRows: ChampionshipPhaseReportRow[] = [],
): string[] {
  const byKey = new Map<string, { label: string; sortDate: string }>();

  const add = (label: string | null | undefined, matchDate?: Date | string | null) => {
    if (!label?.trim()) return;
    const key = normalizeFmfPhaseKey(label);
    if (!key) return;
    const dateKey = matchDate ? dateKeyInBrazil(matchDate) : '9999-99-99';
    const existing = byKey.get(key);
    if (!existing || dateKey < existing.sortDate) {
      byKey.set(key, { label: label.trim(), sortDate: dateKey });
    }
  };

  const snapshot = findStoreSnapshot(store, category);
  for (const match of snapshot?.matches ?? []) {
    add(match.phaseLabel, match.matchDate);
  }
  for (const row of reportRows) {
    add(row.phase, row.matchDate);
  }

  return Array.from(byKey.values())
    .sort(
      (a, b) =>
        a.sortDate.localeCompare(b.sortDate) || a.label.localeCompare(b.label, 'pt-BR'),
    )
    .map((entry) => entry.label);
}

export function filterRowsByChampionshipPhase<T extends { phase: string | null }>(
  rows: T[],
  currentPhase: string | null,
): T[] {
  if (!currentPhase?.trim()) return rows;
  return rows.filter((row) => fmfPhaseLabelsMatch(row.phase, currentPhase));
}

export function buildStandingsFromStore(
  store: FmfScraperStore | null,
  category: string,
  clubName: string,
  aliases: string[],
): CoachStandingRow[] {
  if (!store?.categories) return [];
  const snapshot = findStoreSnapshot(store, category);
  if (!snapshot) return [];

  const currentPhase = resolveCurrentFmfGroupPhase(snapshot.matches);
  let phaseMatches = currentPhase
    ? snapshot.matches.filter((m) => fmfPhaseLabelsMatch(m.phaseLabel, currentPhase))
    : snapshot.matches.filter((m) => isFmfGroupStagePhase(m.phaseLabel));

  if (phaseMatches.length === 0) {
    phaseMatches = snapshot.matches.filter((m) => isFmfGroupStagePhase(m.phaseLabel));
  }

  const season = String(new Date().getFullYear());
  const computed = computeStandingsFromMatches(phaseMatches, {
    competicao: snapshot.name,
    categoria: snapshot.fixtureCategory,
    temporada: season,
  });

  if (computed.length > 0) {
    return mapStandingRows(computed, clubName, aliases);
  }

  if (!snapshot.standings?.length) return [];
  return mapStandingRows(snapshot.standings, clubName, aliases);
}

export function buildLastRoundFromStore(
  store: FmfScraperStore | null,
  category: string,
  clubName: string,
  aliases: string[],
): { round: number | null; phase: string | null; matches: CoachLastRoundMatch[] } {
  if (!store?.categories) return { round: null, phase: null, matches: [] };
  const snapshot = findStoreSnapshot(store, category);
  if (!snapshot) return { round: null, phase: null, matches: [] };

  const currentPhase = resolveCurrentFmfGroupPhase(snapshot.matches);
  const phaseMatches = currentPhase
    ? snapshot.matches.filter((m) => fmfPhaseLabelsMatch(m.phaseLabel, currentPhase))
    : snapshot.matches.filter((m) => isFmfGroupStagePhase(m.phaseLabel));

  const clubFinished = phaseMatches.filter(
    (m) =>
      m.status === 'finished' &&
      m.roundNumber != null &&
      (isFmfTeamMatch(m.homeName, clubName, aliases) ||
        isFmfTeamMatch(m.awayName, clubName, aliases)),
  );

  if (clubFinished.length === 0) {
    return { round: null, phase: currentPhase, matches: [] };
  }

  const lastRound = Math.max(...clubFinished.map((m) => m.roundNumber ?? 0));
  const roundMatches = phaseMatches.filter(
    (m) => m.roundNumber === lastRound && m.status === 'finished',
  );

  return {
    round: lastRound,
    phase: currentPhase,
    matches: roundMatches.map((m) => mapLastRoundMatch(m, clubName, aliases)),
  };
}

function mapLastRoundMatch(
  m: FmfParsedMatch,
  clubName: string,
  aliases: string[],
): CoachLastRoundMatch {
  const isClub =
    isFmfTeamMatch(m.homeName, clubName, aliases) ||
    isFmfTeamMatch(m.awayName, clubName, aliases);
  return {
    round: m.roundNumber,
    phase: m.phaseLabel,
    homeTeam: m.homeName,
    awayTeam: m.awayName,
    homeScore: m.homeGoals,
    awayScore: m.awayGoals,
    scoreLabel:
      m.homeGoals == null || m.awayGoals == null ? '—' : `${m.homeGoals} x ${m.awayGoals}`,
    matchDate: m.matchDate,
    isClubMatch: isClub,
  };
}

export function resolveFmfSnapshotForCategory(
  store: FmfScraperStore | null,
  category: string,
): { name: string; fixtureCategory: string } | null {
  if (!store?.categories) return null;
  const catKey = categoryKey(category);
  const snapshot = Object.values(store.categories).find(
    (s) => s && categoryKey(s.fixtureCategory) === catKey,
  );
  return snapshot ? { name: snapshot.name, fixtureCategory: snapshot.fixtureCategory } : null;
}

export function championshipKey(name: string | null | undefined): string {
  return softNormalizeTeamNameKey(name ?? '');
}
