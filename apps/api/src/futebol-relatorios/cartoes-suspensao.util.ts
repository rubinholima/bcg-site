import { getFootballPositionLabel } from '../common/football-positions.util';
import { getPlayerMatchAvailability, buildPlayerMatchAvailabilityInput } from '../common/player-match-availability.util';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
} from '../common/sports-situation.util';
import { FRIENDLY_CHAMPIONSHIP_NAME } from '../futebol-agenda/friendly-match.util';
import {
  parseStaffCardsForMatch,
  resolveOurTeamSide,
  type StaffCardClubFilter,
  type StaffDisciplineCandidate,
  type StaffDisciplineResolveContext,
} from './fmf-staff-cards.util';
import type { FmfStaffCardEventInput } from './fmf-staff-cards.util';

/** Códigos por rodada — espelham o relatório operacional do clube (Mineiro). */
export type DisciplineCellCode = 'AT' | 'AV' | 'AM' | 'V' | 'VM' | 'P' | 'SA' | 'ST' | '';

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
  /** Categoria do cadastro quando diferente da planilha (subida). */
  squadCategory: string | null;
  playedUp: boolean;
};

export type DisciplineStaffRow = {
  num: number;
  staffId: string;
  name: string;
  roleLabel: string;
  roundCells: DisciplineCellCode[];
  nextRoundCell: NextRoundDisciplineCode;
  yellowCardsTotal: number;
  redCardsTotal: number;
  unavailable: boolean;
  unavailableReason: string | null;
  aptoForNextRound: boolean;
};

export type StaffDisciplineInput = {
  id: string;
  name: string;
  roleLabel: string;
  licenseNumber?: string | null;
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
  staffCardEvents?: FmfStaffCardEventInput[] | null;
  rawParsed?: unknown;
  /** Modo events: cartões da comissão já agregados por staffId (sem fallback por nome). */
  eventStaffCards?: Map<string, StaffMatchCards>;
  playerStats: Array<{
    playerId: string;
    jerseyNumber: number | null;
    playerName: string;
    cbfRegistration?: string | null;
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
  /** Categoria do cadastro (elenco). */
  category?: string | null;
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

/** Amistoso: exibe na planilha, mas não entra no cálculo de pendurado/suspensão. */
export function isFriendlyDisciplineMatch(row: { competition: string }): boolean {
  const competition = row.competition?.trim() ?? '';
  if (!competition) return false;
  if (/amistoso/i.test(competition)) return true;
  return (
    competition.toLocaleLowerCase('pt-BR') ===
    FRIENDLY_CHAMPIONSHIP_NAME.toLocaleLowerCase('pt-BR')
  );
}

/**
 * Chave estável para comparar nomes FMF/viagem/súmula.
 * Une variações de hífen/acento ("SUB 14 - 1ª DIVISÃO 2026" ≈ "SUB 14 - 1ª DIVISÃO - 2026").
 */
export function normalizeCompetitionKey(competition: string): string {
  return competition
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/1[aª]/gi, '1a')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Disciplina por competição (ex.: Mineiro Sub-20 ≠ Brasileiro Sub-20). */
export function reportMatchesCompetitionFilter(
  report: { competition: string },
  competition: string,
): boolean {
  const wanted = competition?.trim();
  if (!wanted) return true;
  return normalizeCompetitionKey(report.competition) === normalizeCompetitionKey(wanted);
}

export function inferReferenceCategoryFromReports(
  reports: Array<{ category: string }>,
): string | null {
  const counts = new Map<string, number>();
  for (const row of reports) {
    const category = row.category?.trim();
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

/** Competição oficial mais frequente (ignora amistosos). */
export function inferPrimaryCompetitionFromReports(
  reports: Array<{ competition: string }>,
): string | null {
  const counts = new Map<string, { label: string; count: number }>();
  for (const row of reports) {
    const label = row.competition?.trim();
    if (!label) continue;
    if (isFriendlyDisciplineMatch({ competition: label })) continue;
    const key = normalizeCompetitionKey(label);
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { label, count: 1 });
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const { label, count } of counts.values()) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

export function collectDisciplineParticipantIds(
  matches: Array<{ playerStats: Array<{ playerId: string | null | undefined }> }>,
): string[] {
  const ids = new Set<string>();
  for (const match of matches) {
    for (const stat of match.playerStats) {
      const id = stat.playerId?.trim();
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

function ourSideCbfRegistrationsFromRawParsed(
  rawParsed: unknown,
  ourSide: 'home' | 'away',
): Set<string> | null {
  if (!rawParsed || typeof rawParsed !== 'object') return null;
  const stats = (rawParsed as { stats?: unknown }).stats;
  if (!Array.isArray(stats)) return null;
  const set = new Set<string>();
  for (const item of stats) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { teamSide?: string; cbfRegistration?: string };
    if (row.teamSide !== ourSide) continue;
    const cbf = row.cbfRegistration?.trim();
    if (cbf) set.add(cbf);
  }
  return set.size > 0 ? set : null;
}

/** Só cartões de atletas que atuaram pelo nosso clube na súmula (evita adversário com mesmo nome/CBF). */
export function filterDisciplinePlayerStatsForOurClub<
  T extends {
    playerId: string;
    cbfRegistration?: string | null;
    yellowCards: number;
    redCards: number;
  },
>(
  stats: T[],
  match: Pick<MatchInput, 'homeTeam' | 'awayTeam' | 'rawParsed'>,
  clubName: string,
  aliases: string[],
): T[] {
  const ourSide = resolveOurTeamSide(match.homeTeam, match.awayTeam, clubName, aliases);
  if (!ourSide) return stats;
  const ourCbfs = ourSideCbfRegistrationsFromRawParsed(match.rawParsed, ourSide);
  if (!ourCbfs) return stats;
  return stats.filter((stat) => {
    const cbf = stat.cbfRegistration?.trim();
    if (!cbf) return false;
    return ourCbfs.has(cbf);
  });
}

type DisciplineStatRow = {
  playerId: string;
  jerseyNumber: number | null;
  playerName: string;
  cbfRegistration?: string | null;
  played: boolean;
  yellowCards: number;
  redCards: number;
};

function readUnresolvedDisciplineStat(raw: unknown): {
  cbfRegistration: string;
  sourceName: string;
  jerseyNumber: number | null;
  played: boolean;
  yellowCards: number;
  redCards: number;
} | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const sourceName = typeof row.sourceName === 'string' ? row.sourceName.trim() : '';
  if (!sourceName) return null;
  return {
    cbfRegistration: typeof row.cbfRegistration === 'string' ? row.cbfRegistration : '',
    sourceName,
    jerseyNumber: typeof row.jerseyNumber === 'number' ? row.jerseyNumber : null,
    played: row.played === true,
    yellowCards: typeof row.yellowCards === 'number' ? row.yellowCards : 0,
    redCards: typeof row.redCards === 'number' ? row.redCards : 0,
  };
}

/** Inclui atletas pendentes na importação (subidas) quando o vínculo é resolvível. */
export function enrichDisciplineStatsFromUnresolved(
  linkedStats: DisciplineStatRow[],
  unresolvedRaw: unknown,
  resolvePlayerId: (stat: { cbfRegistration: string; sourceName: string }) => string | null,
): DisciplineStatRow[] {
  if (!Array.isArray(unresolvedRaw) || unresolvedRaw.length === 0) return linkedStats;

  const merged = [...linkedStats];
  const extra: DisciplineStatRow[] = [];

  for (const raw of unresolvedRaw) {
    const unresolved = readUnresolvedDisciplineStat(raw);
    if (!unresolved) continue;
    const playerId = resolvePlayerId(unresolved);
    if (!playerId) continue;

    const existingIndex = merged.findIndex((stat) => stat.playerId === playerId);
    if (existingIndex >= 0) {
      const existing = merged[existingIndex]!;
      merged[existingIndex] = {
        ...existing,
        played: existing.played || unresolved.played,
        yellowCards: Math.max(existing.yellowCards, unresolved.yellowCards),
        redCards: Math.max(existing.redCards, unresolved.redCards),
        jerseyNumber: existing.jerseyNumber ?? unresolved.jerseyNumber,
      };
      continue;
    }

    extra.push({
      playerId,
      jerseyNumber: unresolved.jerseyNumber,
      playerName: unresolved.sourceName,
      cbfRegistration: unresolved.cbfRegistration || null,
      played: unresolved.played,
      yellowCards: unresolved.yellowCards,
      redCards: unresolved.redCards,
    });
  }

  return extra.length > 0 ? [...merged, ...extra] : merged;
}

/** Elenco da categoria + atletas convocados/jogadores que atuaram em jogos desta categoria (subida). */
export function mergeDisciplinePlayerList<T extends { id: string; jerseyNumber: number | null; name: string }>(
  rosterPlayers: T[],
  participantIds: string[],
  guestPlayers: T[],
): T[] {
  const rosterIds = new Set(rosterPlayers.map((player) => player.id));
  const guestById = new Map(guestPlayers.map((player) => [player.id, player]));
  const merged = new Map<string, T>();
  for (const player of rosterPlayers) merged.set(player.id, player);
  for (const id of participantIds) {
    if (rosterIds.has(id)) continue;
    const guest = guestById.get(id);
    if (guest) merged.set(id, guest);
  }
  return [...merged.values()].sort(
    (a, b) =>
      (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) ||
      a.name.localeCompare(b.name, 'pt-BR'),
  );
}

/** Só usa playerId — evita cartão fantasma por camisa/sobrenome repetido entre categorias. */
export function findPlayerStatForMatch(
  stats: MatchInput['playerStats'],
  player: PlayerInput,
): MatchInput['playerStats'][number] | undefined {
  return stats.find((s) => s.playerId === player.id);
}

/** Ordem operacional: suspenso → pendurado → com cartão → demais. */
export function disciplinePlayerSortRank(row: DisciplinePlayerRow): number {
  if (row.nextRoundCell === 'S') return 0;
  if (row.nextRoundCell === 'P') return 1;
  if (row.yellowCardsTotal > 0 || row.redCardsTotal > 0) return 2;
  return 3;
}

export function compareDisciplinePlayers(
  a: DisciplinePlayerRow,
  b: DisciplinePlayerRow,
): number {
  const rankDiff = disciplinePlayerSortRank(a) - disciplinePlayerSortRank(b);
  if (rankDiff !== 0) return rankDiff;
  return (
    (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) ||
    a.name.localeCompare(b.name, 'pt-BR')
  );
}

function isExpulsionStat(stat: MatchInput['playerStats'][number]): boolean {
  return stat.redCards > 0 || (stat.played && stat.yellowCards >= 2);
}

/**
 * Processa cartões do jogo — roda mesmo quando o atleta entra pendurado (P) ou cumpre suspensão (SA).
 * Vermelho / 2º amarelo na partida suspende, mas não zera acúmulo de amarelos da competição.
 */
function applyMatchDisciplineCards(input: {
  match: MatchInput;
  player: PlayerInput;
  stat: MatchInput['playerStats'][number];
  state: PlayerRoundState;
  yellowTotals: Map<string, number>;
  redTotals: Map<string, number>;
}): DisciplineCellCode {
  const { match, player, stat, state, yellowTotals, redTotals } = input;
  let code: DisciplineCellCode = stat.played ? 'AT' : '';

  if (isExpulsionStat(stat)) {
    if (stat.yellowCards > 0 && stat.played) {
      yellowTotals.set(player.id, (yellowTotals.get(player.id) ?? 0) + stat.yellowCards);
      state.yellowAccum += stat.yellowCards;
    }
    if (stat.redCards > 0) {
      redTotals.set(player.id, (redTotals.get(player.id) ?? 0) + stat.redCards);
    }
    const occ = findOccurrenceForPlayer(
      match.occurrencesText,
      player.name,
      stat.jerseyNumber ?? player.jerseyNumber,
    );
    const manual = Boolean(occ && occurrenceIsManual(occ));
    code =
      stat.redCards > 0
        ? manual
          ? 'VM'
          : 'V'
        : stat.yellowCards > 0
          ? manual
            ? 'AM'
            : 'AV'
          : 'V';
    state.suspensionRoundsLeft = 1;
    state.pendurado = false;
    return code;
  }

  if (stat.yellowCards > 0 && stat.played) {
    yellowTotals.set(player.id, (yellowTotals.get(player.id) ?? 0) + stat.yellowCards);
    state.yellowAccum += stat.yellowCards;
    const occ = findOccurrenceForPlayer(
      match.occurrencesText,
      player.name,
      stat.jerseyNumber ?? player.jerseyNumber,
    );
    code = occ && occurrenceIsManual(occ) ? 'AM' : 'AV';
    if (state.yellowAccum >= 3) {
      state.suspensionRoundsLeft = 1;
      state.yellowAccum = 0;
      state.pendurado = false;
    } else if (state.yellowAccum >= 2) {
      state.pendurado = true;
    }
  }

  return code;
}

/** Amistoso: só exibição visual — não altera estado disciplinar. */
function resolveFriendlyDisciplineCellCode(
  match: MatchInput,
  player: PlayerInput,
  stat: MatchInput['playerStats'][number] | undefined,
  pendingCode: DisciplineCellCode,
): DisciplineCellCode {
  if (!stat || (!stat.played && stat.redCards <= 0)) return pendingCode;
  let code: DisciplineCellCode = stat.played ? 'AT' : pendingCode;
  if (stat.yellowCards > 0 && stat.played) {
    const occ = findOccurrenceForPlayer(
      match.occurrencesText,
      player.name,
      stat.jerseyNumber ?? player.jerseyNumber,
    );
    code = occ && occurrenceIsManual(occ) ? 'AM' : 'AV';
  }
  if (stat.redCards > 0 || (stat.played && stat.yellowCards >= 2)) {
    const occ = findOccurrenceForPlayer(
      match.occurrencesText,
      player.name,
      stat.jerseyNumber ?? player.jerseyNumber,
    );
    code = occ && occurrenceIsManual(occ) ? 'VM' : 'V';
  }
  return code;
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
  disciplineCategory: string;
  nextMatchDate?: string | null;
  /** Jogos amistosos — aparecem na planilha, mas não alteram pendurado/suspensão. */
  friendlyMatchIds?: ReadonlySet<string>;
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
    const isFriendly = input.friendlyMatchIds?.has(match.id) ?? false;

    for (const player of input.players) {
      const state = states.get(player.id)!;
      const cells = roundCells.get(player.id)!;

      if (isFriendly) {
        let pending: DisciplineCellCode = '';
        if (state.stjdRoundsLeft > 0) pending = 'ST';
        else if (state.suspensionRoundsLeft > 0) pending = 'SA';
        else if (state.pendurado) pending = 'P';

        const stat = findPlayerStatForMatch(match.playerStats, player);
        cells[roundIndex] = resolveFriendlyDisciplineCellCode(match, player, stat, pending);
        continue;
      }

      let pendingCode: DisciplineCellCode = '';
      if (state.stjdRoundsLeft > 0) {
        pendingCode = 'ST';
        state.stjdRoundsLeft -= 1;
      } else if (state.suspensionRoundsLeft > 0) {
        pendingCode = 'SA';
        state.suspensionRoundsLeft -= 1;
        state.pendurado = false;
      } else if (state.pendurado) {
        pendingCode = 'P';
        state.pendurado = false;
      }

      const stat = findPlayerStatForMatch(match.playerStats, player);
      let code: DisciplineCellCode = pendingCode;
      if (stat && (stat.played || stat.redCards > 0)) {
        const actionCode = applyMatchDisciplineCards({
          match,
          player,
          stat,
          state,
          yellowTotals,
          redTotals,
        });
        if (actionCode) code = actionCode;
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

      const disciplineSuspended =
        state.stjdRoundsLeft > 0 || state.suspensionRoundsLeft > 0;
      const unavailable = disciplineSuspended || !cadastroAvail.apto;
      const squadCategory = player.category?.trim() || null;
      const playedUp =
        squadCategory != null &&
        squadCategory !== input.disciplineCategory.trim();

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
        squadCategory,
        playedUp,
      };
    })
    .sort(compareDisciplinePlayers)
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

type StaffMatchCards = {
  yellowCards: number;
  redCards: number;
  manual: boolean;
};

function staffDisciplineKey(staffId: string | null, name: string): string {
  return staffId?.trim() || `name:${normalizeName(name)}`;
}

function toStaffDisciplineCandidates(
  staff: StaffDisciplineInput[],
): StaffDisciplineCandidate[] {
  return staff.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.roleLabel,
    licenseNumber: member.licenseNumber ?? null,
  }));
}

function staffCardsForMatch(
  match: Pick<
    MatchInput,
    'occurrencesText' | 'staffCardEvents' | 'rawParsed' | 'homeTeam' | 'awayTeam' | 'eventStaffCards'
  >,
  staff: StaffDisciplineInput[],
  clubName: string,
  aliases: string[],
  staffCandidates?: StaffDisciplineInput[],
  resolveContext?: StaffDisciplineResolveContext,
): Map<string, StaffMatchCards> {
  if (match.eventStaffCards) return match.eventStaffCards;
  const clubFilter: StaffCardClubFilter = {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    clubName,
    aliases,
  };
  const resolutionPool = staffCandidates ?? staff;
  const parsed = parseStaffCardsForMatch(
    {
      occurrencesText: match.occurrencesText,
      staffCardEvents: match.staffCardEvents,
      rawParsed: match.rawParsed,
      clubFilter,
      resolveContext,
    },
    toStaffDisciplineCandidates(resolutionPool),
  );
  const map = new Map<string, StaffMatchCards>();
  for (const card of parsed) {
    const key = staffDisciplineKey(card.staffId, card.name);
    const current = map.get(key) ?? { yellowCards: 0, redCards: 0, manual: false };
    current.yellowCards += card.yellowCards;
    current.redCards += card.redCards;
    if (card.excerpt && occurrenceIsManual(card.excerpt)) current.manual = true;
    map.set(key, current);
  }
  return map;
}

function isStaffExpulsion(cards: StaffMatchCards): boolean {
  return cards.redCards > 0 || cards.yellowCards >= 2;
}

function applyStaffMatchDisciplineCards(input: {
  cards: StaffMatchCards;
  state: PlayerRoundState;
  staffKey: string;
  yellowTotals: Map<string, number>;
  redTotals: Map<string, number>;
}): DisciplineCellCode {
  const { cards, state, staffKey, yellowTotals, redTotals } = input;
  if (cards.yellowCards <= 0 && cards.redCards <= 0) return '';

  if (isStaffExpulsion(cards)) {
    if (cards.yellowCards > 0) {
      yellowTotals.set(staffKey, (yellowTotals.get(staffKey) ?? 0) + cards.yellowCards);
      state.yellowAccum += cards.yellowCards;
    }
    if (cards.redCards > 0) {
      redTotals.set(staffKey, (redTotals.get(staffKey) ?? 0) + cards.redCards);
    }
    const code =
      cards.redCards > 0
        ? cards.manual
          ? 'VM'
          : 'V'
        : cards.yellowCards > 0
          ? cards.manual
            ? 'AM'
            : 'AV'
          : 'V';
    state.suspensionRoundsLeft = 1;
    state.pendurado = false;
    return code;
  }

  if (cards.yellowCards > 0) {
    yellowTotals.set(staffKey, (yellowTotals.get(staffKey) ?? 0) + cards.yellowCards);
    state.yellowAccum += cards.yellowCards;
    const code = cards.manual ? 'AM' : 'AV';
    if (state.yellowAccum >= 3) {
      state.suspensionRoundsLeft = 1;
      state.yellowAccum = 0;
      state.pendurado = false;
    } else if (state.yellowAccum >= 2) {
      state.pendurado = true;
    }
    return code;
  }

  return '';
}

function resolveFriendlyStaffDisciplineCellCode(
  cards: StaffMatchCards | undefined,
  pendingCode: DisciplineCellCode,
): DisciplineCellCode {
  if (!cards || (cards.yellowCards <= 0 && cards.redCards <= 0)) return pendingCode;
  if (isStaffExpulsion(cards)) {
    return cards.redCards > 0
      ? cards.manual
        ? 'VM'
        : 'V'
      : cards.yellowCards > 0
        ? cards.manual
          ? 'AM'
          : 'AV'
        : 'V';
  }
  if (cards.yellowCards > 0) return cards.manual ? 'AM' : 'AV';
  return pendingCode;
}

function compareDisciplineStaff(a: DisciplineStaffRow, b: DisciplineStaffRow): number {
  const rankDiff = disciplineStaffSortRank(a) - disciplineStaffSortRank(b);
  if (rankDiff !== 0) return rankDiff;
  return a.name.localeCompare(b.name, 'pt-BR');
}

function disciplineStaffSortRank(row: DisciplineStaffRow): number {
  if (row.nextRoundCell === 'S') return 0;
  if (row.nextRoundCell === 'P') return 1;
  if (row.yellowCardsTotal > 0 || row.redCardsTotal > 0) return 2;
  return 3;
}

export function mergeDisciplineStaffList(
  roster: StaffDisciplineInput[],
  matches: MatchInput[],
  clubName: string,
  aliases: string[],
  staffCandidates: StaffDisciplineInput[],
  resolveContextByMatchId?: Map<string, StaffDisciplineResolveContext>,
): StaffDisciplineInput[] {
  const byId = new Map(roster.map((member) => [member.id, member]));

  for (const match of matches) {
    const resolveContext = resolveContextByMatchId?.get(match.id);
    const cards = staffCardsForMatch(
      match,
      roster,
      clubName,
      aliases,
      staffCandidates,
      resolveContext,
    );
    for (const staffKey of cards.keys()) {
      if (byId.has(staffKey)) continue;
      const found = staffCandidates.find(
        (member) => member.id === staffKey || staffDisciplineKey(null, member.name) === staffKey,
      );
      if (found) byId.set(found.id, found);
    }
  }

  return [...byId.values()];
}

export function collectDisciplineStaffParticipantKeys(
  matches: MatchInput[],
  staff: StaffDisciplineInput[],
  clubName: string,
  aliases: string[],
  staffCandidates?: StaffDisciplineInput[],
): string[] {
  const keys = new Set<string>();
  for (const match of matches) {
    for (const [key] of staffCardsForMatch(
      match,
      staff,
      clubName,
      aliases,
      staffCandidates ?? staff,
    )) {
      keys.add(key);
    }
  }
  return [...keys];
}

/** Planilha disciplinar da comissão técnica — mesmas regras de pendurado (2A) e suspensão (3A/vermelho). */
export function buildStaffDisciplineGrid(input: {
  matches: MatchInput[];
  staff: StaffDisciplineInput[];
  /** População completa do tenant para resolução de identidade (sem filtro de categoria default). */
  staffCandidates?: StaffDisciplineInput[];
  clubName: string;
  aliases: string[];
  nextMatchDate?: string | null;
  friendlyMatchIds?: ReadonlySet<string>;
  resolveContextByMatchId?: Map<string, StaffDisciplineResolveContext>;
}): {
  staff: DisciplineStaffRow[];
  staffTotals: DisciplineGridResult['totals'];
} {
  const sortedMatches = [...input.matches].sort(
    (a, b) => a.matchDate.getTime() - b.matchDate.getTime() || (a.round ?? 0) - (b.round ?? 0),
  );

  const staffCandidates = input.staffCandidates ?? input.staff;
  const disciplineStaff = mergeDisciplineStaffList(
    input.staff,
    sortedMatches,
    input.clubName,
    input.aliases,
    staffCandidates,
    input.resolveContextByMatchId,
  );

  const states = new Map(
    disciplineStaff.map((member) => [member.id, initPlayerState({
      id: member.id,
      name: member.name,
      jerseyNumber: null,
      position: null,
      status: 'available',
      statusDetails: null,
      yellowCards: null,
      redCards: null,
      registrationProfile: null,
    })]),
  );
  const roundCells = new Map<string, DisciplineCellCode[]>(
    disciplineStaff.map((member) => [member.id, Array(sortedMatches.length).fill('' as DisciplineCellCode)]),
  );
  const yellowTotals = new Map(disciplineStaff.map((member) => [member.id, 0]));
  const redTotals = new Map(disciplineStaff.map((member) => [member.id, 0]));
  const yellowByRound = Array(sortedMatches.length).fill(0);
  const redByRound = Array(sortedMatches.length).fill(0);

  sortedMatches.forEach((match, roundIndex) => {
    const isFriendly = input.friendlyMatchIds?.has(match.id) ?? false;
    const cardsByStaff = staffCardsForMatch(
      match,
      disciplineStaff,
      input.clubName,
      input.aliases,
      staffCandidates,
      input.resolveContextByMatchId?.get(match.id),
    );

    for (const cards of cardsByStaff.values()) {
      yellowByRound[roundIndex] += cards.yellowCards;
      redByRound[roundIndex] += cards.redCards;
    }

    for (const member of disciplineStaff) {
      const state = states.get(member.id)!;
      const cells = roundCells.get(member.id)!;
      const cards = cardsByStaff.get(staffDisciplineKey(member.id, member.name));

      if (isFriendly) {
        let pending: DisciplineCellCode = '';
        if (state.stjdRoundsLeft > 0) pending = 'ST';
        else if (state.suspensionRoundsLeft > 0) pending = 'SA';
        else if (state.pendurado) pending = 'P';
        cells[roundIndex] = resolveFriendlyStaffDisciplineCellCode(cards, pending);
        continue;
      }

      let pendingCode: DisciplineCellCode = '';
      if (state.stjdRoundsLeft > 0) {
        pendingCode = 'ST';
        state.stjdRoundsLeft -= 1;
      } else if (state.suspensionRoundsLeft > 0) {
        pendingCode = 'SA';
        state.suspensionRoundsLeft -= 1;
        state.pendurado = false;
      } else if (state.pendurado) {
        pendingCode = 'P';
        state.pendurado = false;
      }

      let code: DisciplineCellCode = pendingCode;
      if (cards && (cards.yellowCards > 0 || cards.redCards > 0)) {
        const actionCode = applyStaffMatchDisciplineCards({
          cards,
          state,
          staffKey: member.id,
          yellowTotals,
          redTotals,
        });
        if (actionCode) code = actionCode;
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

  const matchCount = sortedMatches.length;
  const staffRows: DisciplineStaffRow[] = disciplineStaff
    .map((member, index) => {
      const state = states.get(member.id)!;
      const cells = roundCells.get(member.id) ?? [];
      let unavailableReason: string | null = null;
      if (state.stjdRoundsLeft > 0) {
        unavailableReason = state.stjdReason ?? 'Suspensão STJD/TDJ';
      } else if (state.suspensionRoundsLeft > 0) {
        unavailableReason = 'Suspensão automática (cartão vermelho ou 3º amarelo)';
      }
      const unavailable = state.stjdRoundsLeft > 0 || state.suspensionRoundsLeft > 0;
      return {
        num: index + 1,
        staffId: member.id,
        name: member.name,
        roleLabel: member.roleLabel,
        roundCells: cells,
        nextRoundCell: resolveNextRoundCell(state),
        yellowCardsTotal: yellowTotals.get(member.id) ?? 0,
        redCardsTotal: redTotals.get(member.id) ?? 0,
        unavailable,
        unavailableReason,
        aptoForNextRound: !unavailable,
      };
    })
    .sort(compareDisciplineStaff)
    .map((row, index) => ({ ...row, num: index + 1 }));

  return {
    staff: staffRows,
    staffTotals: {
      yellowByRound,
      redByRound,
      yellowCards: yellowByRound.reduce((a, b) => a + b, 0),
      redCards: redByRound.reduce((a, b) => a + b, 0),
      matchCount,
      avgYellowPerMatch:
        matchCount > 0
          ? Math.round((yellowByRound.reduce((a, b) => a + b, 0) / matchCount) * 100) / 100
          : 0,
      avgRedPerMatch:
        matchCount > 0
          ? Math.round((redByRound.reduce((a, b) => a + b, 0) / matchCount) * 100) / 100
          : 0,
    },
  };
}
