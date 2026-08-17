import { getFootballPositionLabel } from '../common/football-positions.util';
import { getPlayerMatchAvailability, buildPlayerMatchAvailabilityInput } from '../common/player-match-availability.util';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
} from '../common/sports-situation.util';

/** Códigos por rodada — espelham o relatório operacional do clube (Mineiro). */
export type DisciplineCellCode = 'A' | 'AM' | 'V' | 'VM' | 'P' | 'SA' | 'ST' | '';

export type DisciplineMatchColumn = {
  matchId: string;
  round: number | null;
  matchDate: string;
  shortLabel: string;
  opponentName: string;
  yellowCards: number;
  redCards: number;
};

export type NextRoundDisciplineCode = 'P' | 'S' | '';

export type DisciplinePlayerRow = {
  num: number;
  playerId: string;
  name: string;
  positionLabel: string;
  jerseyNumber: number | null;
  roundCells: DisciplineCellCode[];
  /** Status disciplinar para o próximo jogo: P = pendurado, S = suspenso. */
  nextRoundCell: NextRoundDisciplineCode;
  yellowCardsTotal: number;
  redCardsTotal: number;
  unavailable: boolean;
  unavailableReason: string | null;
  aptoForNextRound: boolean;
};

export type DisciplineGridResult = {
  rounds: DisciplineMatchColumn[];
  players: DisciplinePlayerRow[];
  totals: {
    yellowByRound: number[];
    redByRound: number[];
    yellowCards: number;
    redCards: number;
    matchCount: number;
    avgYellowPerMatch: number;
    avgRedPerMatch: number;
  };
  nextRound: {
    round: number | null;
    matchDate: string;
    label: string;
  } | null;
};

type MatchInput = {
  id: string;
  round: number | null;
  matchDate: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  occurrencesText: string | null;
  playerStats: Array<{
    playerId: string;
    jerseyNumber: number | null;
    playerName: string;
    played: boolean;
    yellowCards: number;
    redCards: number;
  }>;
};

type PlayerInput = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
  status: string | null;
  statusDetails: string | null;
  yellowCards: number | null;
  redCards: number | null;
  registrationProfile: unknown;
};

type PlayerRoundState = {
  suspensionRoundsLeft: number;
  yellowAccum: number;
  pendurado: boolean;
  stjdRoundsLeft: number;
  stjdReason: string | null;
};

function parseRegistrationProfile(profile: unknown): { sports?: { situation?: string } } | null {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return null;
  return profile as { sports?: { situation?: string } };
}

export function isCurrentSquadPlayer(player: PlayerInput): boolean {
  const situation = parseRegistrationProfile(player.registrationProfile)?.sports?.situation;
  if (isArchivedSportsSituation(situation)) return false;
  if (isLoanedSportsSituation(situation)) return false;
  return true;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function shortMatchLabel(
  homeTeam: string,
  awayTeam: string,
  clubName: string,
  aliases: string[],
  isHome: boolean,
): string {
  const clubShort = clubAbbrev(clubName);
  const oppShort = clubAbbrev(isHome ? awayTeam : homeTeam);
  return isHome ? `${clubShort} x ${oppShort}` : `${oppShort} x ${clubShort}`;
}

function clubAbbrev(name: string): string {
  const parts = name
    .replace(/\b(SAF|S\.A\.F\.|FC|F\.C\.|FUTEBOL CLUBE)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return name.slice(0, 3).toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return parts
    .slice(0, 3)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function isClubTeam(team: string, clubName: string, aliases: string[]): boolean {
  const key = normalizeName(team);
  const names = [clubName, ...aliases].map(normalizeName).filter(Boolean);
  return names.some((n) => key.includes(n) || n.includes(key));
}

function occurrenceIsManual(text: string): boolean {
  const n = normalizeName(text);
  return /manual|tdj|stjd|tribunal|advertencia manual|expulsao manual/.test(n);
}

function findOccurrenceForPlayer(
  text: string | null,
  playerName: string,
  jerseyNumber: number | null,
): string | null {
  if (!text?.trim()) return null;
  const nameKey = normalizeName(playerName);
  const parts = nameKey.split(' ').filter((p) => p.length > 2);
  const lastName = parts[parts.length - 1] ?? '';
  for (const line of text.split(/\r?\n/)) {
    const lineNorm = normalizeName(line);
    if (!lineNorm) continue;
    const byNumber =
      jerseyNumber != null &&
      new RegExp(`\\b(n\\.?\\s*)?${jerseyNumber}\\b`).test(lineNorm);
    const byName =
      (lastName && lineNorm.includes(lastName)) ||
      (parts[0] && lineNorm.includes(parts[0]!));
    if ((byNumber || byName) && /cart|expuls|advert|disciplin|condut|vermelh|amarel/.test(lineNorm)) {
      return line.trim();
    }
  }
  return null;
}

function resolveNextRoundCell(state: PlayerRoundState): NextRoundDisciplineCode {
  if (state.stjdRoundsLeft > 0 || state.suspensionRoundsLeft > 0) return 'S';
  if (state.pendurado) return 'P';
  return '';
}

function initPlayerState(player: PlayerInput): PlayerRoundState {
  const status = (player.status ?? 'available').toLowerCase();
  const details = player.statusDetails?.trim() || null;
  if (status === 'suspended' && details && /stjd|tdj|tribunal/.test(normalizeName(details))) {
    return {
      suspensionRoundsLeft: 0,
      yellowAccum: 0,
      pendurado: false,
      stjdRoundsLeft: 1,
      stjdReason: details,
    };
  }
  return {
    suspensionRoundsLeft: 0,
    yellowAccum: 0,
    pendurado: false,
    stjdRoundsLeft: 0,
    stjdReason: null,
  };
}

export function buildDisciplineGrid(input: {
  matches: MatchInput[];
  players: PlayerInput[];
  clubName: string;
  aliases: string[];
  nextMatchDate?: string | null;
}): DisciplineGridResult {
  const sortedMatches = [...input.matches].sort(
    (a, b) => a.matchDate.getTime() - b.matchDate.getTime() || (a.round ?? 0) - (b.round ?? 0),
  );

  const rounds: DisciplineMatchColumn[] = sortedMatches.map((match) => {
    const isHome = isClubTeam(match.homeTeam, input.clubName, input.aliases);
    const opponent = isHome ? match.awayTeam : match.homeTeam;
    let yellowCards = 0;
    let redCards = 0;
    for (const stat of match.playerStats) {
      yellowCards += stat.yellowCards;
      redCards += stat.redCards;
    }
    return {
      matchId: match.id,
      round: match.round,
      matchDate: match.matchDate.toISOString(),
      shortLabel: shortMatchLabel(match.homeTeam, match.awayTeam, input.clubName, input.aliases, isHome),
      opponentName: opponent,
      yellowCards,
      redCards,
    };
  });

  const states = new Map(input.players.map((p) => [p.id, initPlayerState(p)]));
  const roundCells = new Map<string, DisciplineCellCode[]>(
    input.players.map((p) => [p.id, Array(sortedMatches.length).fill('' as DisciplineCellCode)]),
  );
  const yellowTotals = new Map(input.players.map((p) => [p.id, 0]));
  const redTotals = new Map(input.players.map((p) => [p.id, 0]));

  sortedMatches.forEach((match, roundIndex) => {
    for (const player of input.players) {
      const state = states.get(player.id)!;
      const cells = roundCells.get(player.id)!;
      let code: DisciplineCellCode = '';

      if (state.stjdRoundsLeft > 0) {
        code = 'ST';
        state.stjdRoundsLeft -= 1;
      } else if (state.suspensionRoundsLeft > 0) {
        code = 'SA';
        state.suspensionRoundsLeft -= 1;
        state.pendurado = false;
      } else if (state.pendurado) {
        code = 'P';
        state.pendurado = false;
      }

      const stat = match.playerStats.find((s) => s.playerId === player.id);
      if (code === '' && stat?.played) {
        code = 'A';
        if (stat.yellowCards > 0) {
          yellowTotals.set(player.id, (yellowTotals.get(player.id) ?? 0) + stat.yellowCards);
          state.yellowAccum += stat.yellowCards;
          const occ = findOccurrenceForPlayer(match.occurrencesText, player.name, stat.jerseyNumber);
          if (occ && occurrenceIsManual(occ)) code = 'AM';
        }
        if (stat.redCards > 0) {
          redTotals.set(player.id, (redTotals.get(player.id) ?? 0) + stat.redCards);
          const occ = findOccurrenceForPlayer(match.occurrencesText, player.name, stat.jerseyNumber);
          code = occ && occurrenceIsManual(occ) ? 'VM' : 'V';
          state.suspensionRoundsLeft = 1;
          state.yellowAccum = 0;
          state.pendurado = false;
        } else if (stat.yellowCards > 0) {
          if (state.yellowAccum >= 3) {
            state.suspensionRoundsLeft = 1;
            state.yellowAccum = 0;
            state.pendurado = false;
          } else if (state.yellowAccum >= 2) {
            state.pendurado = true;
          }
        }
      }

      cells[roundIndex] = code;

      if (
        state.stjdRoundsLeft === 0 &&
        state.suspensionRoundsLeft === 0 &&
        state.yellowAccum >= 2
      ) {
        state.pendurado = true;
      }
    }
  });

  const yellowByRound = rounds.map((r) => r.yellowCards);
  const redByRound = rounds.map((r) => r.redCards);
  const matchCount = rounds.length;

  const upcoming = sortedMatches.filter((m) => {
    if (!input.nextMatchDate) return false;
    return m.matchDate.toISOString().slice(0, 10) >= input.nextMatchDate.slice(0, 10);
  });
  const nextMatch = upcoming[0] ?? null;

  const players: DisciplinePlayerRow[] = input.players
    .map((player, index) => {
      const state = states.get(player.id)!;
      const cells = roundCells.get(player.id) ?? [];
      const cadastroAvail = getPlayerMatchAvailability(
        buildPlayerMatchAvailabilityInput(player),
      );

      let unavailableReason: string | null = null;
      if (state.stjdRoundsLeft > 0) {
        unavailableReason = state.stjdReason ?? 'Suspensão STJD/TDJ';
      } else if (state.suspensionRoundsLeft > 0) {
        unavailableReason = 'Suspensão automática (cartão vermelho ou 3º amarelo)';
      } else if (!cadastroAvail.apto) {
        unavailableReason = cadastroAvail.shortReason;
      }

      const lastCell = cells[cells.length - 1];
      const unavailable =
        state.stjdRoundsLeft > 0 ||
        state.suspensionRoundsLeft > 0 ||
        lastCell === 'SA' ||
        lastCell === 'ST' ||
        !cadastroAvail.apto;

      return {
        num: index + 1,
        playerId: player.id,
        name: player.name,
        positionLabel: getFootballPositionLabel(player.position) || '—',
        jerseyNumber: player.jerseyNumber,
        roundCells: cells,
        nextRoundCell: resolveNextRoundCell(state),
        yellowCardsTotal: yellowTotals.get(player.id) ?? 0,
        redCardsTotal: redTotals.get(player.id) ?? 0,
        unavailable,
        unavailableReason,
        aptoForNextRound: !unavailable,
      };
    })
    .sort(
      (a, b) =>
        (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )
    .map((row, index) => ({ ...row, num: index + 1 }));

  return {
    rounds,
    players,
    totals: {
      yellowByRound,
      redByRound,
      yellowCards: yellowByRound.reduce((a, b) => a + b, 0),
      redCards: redByRound.reduce((a, b) => a + b, 0),
      matchCount,
      avgYellowPerMatch: matchCount > 0 ? Math.round((yellowByRound.reduce((a, b) => a + b, 0) / matchCount) * 100) / 100 : 0,
      avgRedPerMatch: matchCount > 0 ? Math.round((redByRound.reduce((a, b) => a + b, 0) / matchCount) * 100) / 100 : 0,
    },
    nextRound: nextMatch
      ? {
          round: nextMatch.round,
          matchDate: nextMatch.matchDate.toISOString().slice(0, 10),
          label: shortMatchLabel(
            nextMatch.homeTeam,
            nextMatch.awayTeam,
            input.clubName,
            input.aliases,
            isClubTeam(nextMatch.homeTeam, input.clubName, input.aliases),
          ),
        }
      : null,
  };
}
