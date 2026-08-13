import { dateKeyInBrazil } from '../common/brazil-time.util';
import { travelMatchesCategoryFilter } from '../futebol-agenda/travel-categories.util';
import { isFmfTeamMatch } from '../fmf-scraper/fmf-team-match.util';
import {
  fmfPhaseLabelsMatch,
  isFmfGroupStagePhase,
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
  gameOpponentDateKey,
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

type FmfReportRow = {
  id: string;
  competition: string;
  phase: string | null;
  round: number | null;
  category: string;
  season: number;
  matchDate: Date;
  homeTeam: string;
  awayTeam: string;
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
  possessionPct: number | null;
  setPiecesFor: number | null;
  setPiecesAgainst: number | null;
};

function gameMergeKey(matchDate: Date, opponentName: string | null | undefined): string {
  return gameOpponentDateKey(matchDate, opponentName);
}

function findMatchingTravel(
  travels: TravelRow[],
  matchDate: Date,
  opponentName: string,
): TravelRow | undefined {
  return travels.find(
    (t) =>
      matchDatesEquivalent(t.matchDate, matchDate) &&
      matchOpponentsEquivalent(t.opponentName, opponentName),
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
): StatOverrideRow | undefined {
  if (fmfMatchReportId) {
    const byFmf = overrides.find((o) => o.fmfMatchReportId === fmfMatchReportId);
    if (byFmf) return byFmf;
  }
  if (travelLogisticsId) {
    const byTravel = overrides.find((o) => o.travelLogisticsId === travelLogisticsId);
    if (byTravel) return byTravel;
  }
  const key = gameMergeKey(matchDate, opponentName);
  return overrides.find(
    (o) => gameMergeKey(o.matchDate, o.opponentName) === key,
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
      override.setPiecesAgainst != null);
  return {
    possessionPct: override?.possessionPct ?? null,
    setPiecesFor: override?.setPiecesFor ?? null,
    setPiecesAgainst: override?.setPiecesAgainst ?? null,
    statsSource: hasManual ? 'manual' : null,
    hasDetailedStats: hasManual,
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
  const travels = input.travels.filter((t) => categoryMatchesTravel(t, category));

  const byKey = new Map<string, CoachCompletedGame>();

  for (const report of fmfReports) {
    if (!fmfCategoryMatches(report.category, category)) continue;
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
    const result =
      ourGoals == null || theirGoals == null
        ? null
        : ourGoals > theirGoals
          ? 'V'
          : ourGoals === theirGoals
            ? 'E'
            : 'D';

    const travel = findMatchingTravel(travels, report.matchDate, opponent);

    const override = findOverride(overrides, report.id, travel?.id ?? null, report.matchDate, opponent);
    const stats = applyStats(override);

    const game: CoachCompletedGame = {
      gameKey: `fmf:${report.id}`,
      fmfMatchReportId: report.id,
      travelLogisticsId: travel?.id ?? null,
      matchDate: report.matchDate.toISOString(),
      opponentName: opponent,
      competition: report.competition,
      phase: report.phase,
      round: report.round,
      isHome,
      homeTeam: report.homeTeam,
      awayTeam: report.awayTeam,
      homeScore: report.homeScore,
      awayScore: report.awayScore,
      scoreLabel:
        report.homeScore == null || report.awayScore == null
          ? '—'
          : `${report.homeScore} x ${report.awayScore}`,
      result,
      goalsFor: ourGoals,
      goalsAgainst: theirGoals,
      yellowCards: report.playerStats.reduce((s, p) => s + (p.yellowCards ?? 0), 0),
      redCards: report.playerStats.reduce((s, p) => s + (p.redCards ?? 0), 0),
      ...stats,
    };

    const mergeKey =
      findGameMergeKeyInMap(byKey, report.matchDate, opponent, (g) => g.opponentName) ??
      gameMergeKey(report.matchDate, opponent);
    byKey.set(mergeKey, game);
  }

  for (const travel of travels) {
    if (travel.matchDate >= now) continue;
    const existingKey = findGameMergeKeyInMap(
      byKey,
      travel.matchDate,
      travel.opponentName,
      (g) => g.opponentName,
    );
    if (existingKey) continue;

    const key = gameMergeKey(travel.matchDate, travel.opponentName);
    const override = findOverride(overrides, null, travel.id, travel.matchDate, travel.opponentName ?? '');
    const stats = applyStats(override);

    byKey.set(key, {
      gameKey: `travel:${travel.id}`,
      fmfMatchReportId: null,
      travelLogisticsId: travel.id,
      matchDate: travel.matchDate.toISOString(),
      opponentName: travel.opponentName ?? 'Adversário',
      competition: travel.championshipName,
      phase: null,
      round: null,
      isHome: travel.isHomeMatch ?? true,
      homeTeam: travel.isHomeMatch ? clubName : (travel.opponentName ?? 'Adversário'),
      awayTeam: travel.isHomeMatch ? (travel.opponentName ?? 'Adversário') : clubName,
      homeScore: null,
      awayScore: null,
      scoreLabel: '—',
      result: null,
      goalsFor: null,
      goalsAgainst: null,
      yellowCards: 0,
      redCards: 0,
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

export function buildStandingsFromStore(
  store: FmfScraperStore | null,
  category: string,
  clubName: string,
  aliases: string[],
): CoachStandingRow[] {
  if (!store?.categories) return [];
  const catKey = categoryKey(category);
  const snapshot =
    Object.values(store.categories).find(
      (s) => s && categoryKey(s.fixtureCategory) === catKey,
    ) ?? null;
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
  const catKey = categoryKey(category);
  const snapshot =
    Object.values(store.categories).find(
      (s) => s && categoryKey(s.fixtureCategory) === catKey,
    ) ?? null;
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
