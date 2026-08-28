import { resolveOurTeamSide } from './fmf-staff-cards.util';

const PLAYER_CARD_TYPES = new Set(['PLAYER_YELLOW_CARD', 'PLAYER_RED_CARD']);
const STAFF_CARD_TYPES = new Set(['STAFF_YELLOW_CARD', 'STAFF_RED_CARD']);

export type DisciplineOfficialEvent = {
  factType: string;
  resolutionStatus: string;
  playerId?: string | null;
  technicalStaffId?: string | null;
  sourceName?: string | null;
  sourceJerseyNumber?: number | null;
  sourceRoleLabel?: string | null;
  sourceTeamSide?: string | null;
  sourceExcerpt?: string | null;
};

export type DisciplinePlayerStatFromEvents = {
  playerId: string;
  jerseyNumber: number | null;
  playerName: string;
  cbfRegistration?: string | null;
  played: boolean;
  yellowCards: number;
  redCards: number;
};

export type DisciplineStaffCardsFromEvents = {
  yellowCards: number;
  redCards: number;
  manual: boolean;
};

export type MatchDisciplineFromEvents = {
  playerStats: DisciplinePlayerStatFromEvents[];
  staffCardsByStaffId: Map<string, DisciplineStaffCardsFromEvents>;
  pendingPlayerCards: number;
  pendingStaffCards: number;
};

/** Só eventos com identidade resolvida entram na acumulação disciplinar. */
export function isResolvedForDisciplineAccumulation(event: DisciplineOfficialEvent): boolean {
  if (event.resolutionStatus !== 'resolved') return false;
  if (PLAYER_CARD_TYPES.has(event.factType)) {
    return Boolean(event.playerId?.trim());
  }
  if (STAFF_CARD_TYPES.has(event.factType)) {
    return Boolean(event.technicalStaffId?.trim());
  }
  return false;
}

function isManualExcerpt(excerpt: string | null | undefined): boolean {
  if (!excerpt?.trim()) return false;
  const n = excerpt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /manual|tdj|stjd|tribunal|advertencia manual|expulsao manual/.test(n);
}

export function buildMatchDisciplineFromOfficialEvents(input: {
  events: DisciplineOfficialEvent[];
  homeTeam: string;
  awayTeam: string;
  clubName: string;
  aliases: string[];
}): MatchDisciplineFromEvents {
  const ourSide = resolveOurTeamSide(
    input.homeTeam,
    input.awayTeam,
    input.clubName,
    input.aliases,
  );

  const playerById = new Map<string, DisciplinePlayerStatFromEvents>();
  const staffById = new Map<string, DisciplineStaffCardsFromEvents>();
  let pendingPlayerCards = 0;
  let pendingStaffCards = 0;

  for (const event of input.events) {
    if (!PLAYER_CARD_TYPES.has(event.factType) && !STAFF_CARD_TYPES.has(event.factType)) {
      continue;
    }
    if (ourSide && event.sourceTeamSide && event.sourceTeamSide !== ourSide) {
      continue;
    }

    if (PLAYER_CARD_TYPES.has(event.factType)) {
      if (!isResolvedForDisciplineAccumulation(event)) {
        pendingPlayerCards += 1;
        continue;
      }
      const playerId = event.playerId!.trim();
      let stat = playerById.get(playerId);
      if (!stat) {
        stat = {
          playerId,
          jerseyNumber: event.sourceJerseyNumber ?? null,
          playerName: event.sourceName?.trim() || '—',
          played: true,
          yellowCards: 0,
          redCards: 0,
        };
        playerById.set(playerId, stat);
      }
      if (event.factType === 'PLAYER_YELLOW_CARD') stat.yellowCards += 1;
      if (event.factType === 'PLAYER_RED_CARD') stat.redCards += 1;
      continue;
    }

    if (!isResolvedForDisciplineAccumulation(event)) {
      pendingStaffCards += 1;
      continue;
    }
    const staffId = event.technicalStaffId!.trim();
    const current = staffById.get(staffId) ?? {
      yellowCards: 0,
      redCards: 0,
      manual: false,
    };
    if (event.factType === 'STAFF_YELLOW_CARD') current.yellowCards += 1;
    if (event.factType === 'STAFF_RED_CARD') current.redCards += 1;
    if (isManualExcerpt(event.sourceExcerpt)) current.manual = true;
    staffById.set(staffId, current);
  }

  return {
    playerStats: [...playerById.values()],
    staffCardsByStaffId: staffById,
    pendingPlayerCards,
    pendingStaffCards,
  };
}

export function buildPendingDisciplineMessages(input: {
  pendingPlayerCards: number;
  pendingStaffCards: number;
}): string[] {
  const messages: string[] = [];
  const total = input.pendingPlayerCards + input.pendingStaffCards;
  if (total > 0) {
    messages.push(
      `${total} cartão${total > 1 ? 'ões' : ''} oficial${total > 1 ? 'is' : ''} aguarda${total > 1 ? 'm' : ''} vínculo cadastral e não ${total > 1 ? 'foram' : 'foi'} incluído${total > 1 ? 's' : ''} na contagem individual.`,
    );
  }
  if (input.pendingPlayerCards > 0 && input.pendingStaffCards > 0) {
    messages.push(
      `${input.pendingPlayerCards} de atleta(s), ${input.pendingStaffCards} da comissão.`,
    );
  }
  return messages;
}
