import type { MatchOfficialEvent } from '@prisma/client';
import type { ParsedFmfMatchReport } from '../fmf-scraper/fmf-match-report.parser';
import {
  compareOfficialEventOrder,
  isSourceTimingMarker,
} from '../fmf-scraper/match-official-event.ordering';
import {
  resolvePlayerFromRosterEntry,
  type PlayerLinkPool,
} from '../fmf-scraper/match-official-event.identity';
import type { MatchIntegrityStatus } from '../fmf-scraper/match-official-event.types';
import {
  resolveStaffDisciplineMember,
  type StaffDisciplineCandidate,
} from './fmf-staff-cards.util';
import type {
  SumulaCartoesIntegrityDto,
  SumulaCartoesLinkBadge,
  SumulaCartoesMatchDto,
  SumulaCartoesOfficialEventDto,
  SumulaCartoesOfficialRosterPlayerDto,
  SumulaCartoesOfficialStaffRosterDto,
  SumulaCartoesOfficialSheetDto,
} from './futebol-relatorios.types';

type PersistedEvent = Pick<
  MatchOfficialEvent,
  | 'id'
  | 'factType'
  | 'playerId'
  | 'technicalStaffId'
  | 'resolutionStatus'
  | 'relatedResolutionStatus'
  | 'sourceName'
  | 'sourceRegistration'
  | 'sourceJerseyNumber'
  | 'relatedJerseyNumber'
  | 'relatedPlayerId'
  | 'sourceRoleLabel'
  | 'sourceTeamSide'
  | 'minute'
  | 'period'
  | 'sourceClock'
  | 'sourceSequence'
  | 'goalType'
  | 'externalKey'
>;

export function formatOfficialEventTiming(
  sourceClock: string | null | undefined,
  period: string | null | undefined,
): string {
  const clock = (sourceClock ?? '').trim().toUpperCase();
  if (clock === 'INT') return 'Intervalo';
  if (clock === 'ANT') return 'Antes do início';
  if (clock === 'TER') return 'Após o término';
  if (sourceClock && /^\d{1,2}:\d{2}$/.test(sourceClock)) {
    const periodLabel = period?.trim() ? ` ${period.trim()}` : '';
    return `${sourceClock}${periodLabel}`;
  }
  if (isSourceTimingMarker(sourceClock)) return clock;
  if (period?.trim()) return period.trim();
  return '—';
}

export function toLinkBadge(status: string | null | undefined): SumulaCartoesLinkBadge | null {
  if (!status || status === 'resolved') return null;
  if (status === 'partial') return 'partial';
  if (status === 'ambiguous') return 'ambiguous';
  return 'pending';
}

export function linkBadgeLabel(badge: SumulaCartoesLinkBadge | null | undefined): string | null {
  if (!badge) return null;
  if (badge === 'partial') return 'Vínculo parcial';
  if (badge === 'ambiguous') return 'Vínculo ambíguo';
  return 'Vínculo pendente';
}

function rosterNameByJersey(
  parsed: ParsedFmfMatchReport,
  teamSide: string | null | undefined,
  jersey: number | null | undefined,
): string | null {
  if (teamSide !== 'home' && teamSide !== 'away') return null;
  if (jersey == null) return null;
  return (
    parsed.roster.find((r) => r.teamSide === teamSide && r.jerseyNumber === jersey)?.sourceName ??
    null
  );
}

function mapPersistedEvent(
  event: PersistedEvent,
  parsed: ParsedFmfMatchReport,
): SumulaCartoesOfficialEventDto {
  const teamSide =
    event.sourceTeamSide === 'home' || event.sourceTeamSide === 'away'
      ? event.sourceTeamSide
      : null;

  const relatedSourceName = rosterNameByJersey(parsed, teamSide, event.relatedJerseyNumber);

  return {
    id: event.id,
    factType: event.factType,
    sourceName: event.sourceName,
    sourceJerseyNumber: event.sourceJerseyNumber,
    relatedJerseyNumber: event.relatedJerseyNumber,
    relatedSourceName,
    sourceRoleLabel: event.sourceRoleLabel,
    teamSide,
    sourceClock: event.sourceClock,
    period: event.period,
    timingLabel: formatOfficialEventTiming(event.sourceClock, event.period),
    minute: event.minute,
    goalType: event.goalType,
    linkBadge: toLinkBadge(event.resolutionStatus),
    relatedLinkBadge: toLinkBadge(event.relatedResolutionStatus),
    playerId: event.playerId,
    relatedPlayerId: event.relatedPlayerId,
    technicalStaffId: event.technicalStaffId,
    sourceSequence: event.sourceSequence,
  };
}

export function buildOfficialIntegrity(
  integrityStatus: MatchIntegrityStatus,
  pendingPlayerLinks: number,
  pendingStaffLinks: number,
): SumulaCartoesIntegrityDto {

  const messages: string[] = [];
  if (pendingPlayerLinks > 0) {
    messages.push(
      `${pendingPlayerLinks} atleta${pendingPlayerLinks > 1 ? 's' : ''} da súmula ainda não ${pendingPlayerLinks > 1 ? 'estão' : 'está'} vinculado${pendingPlayerLinks > 1 ? 's' : ''} ao cadastro.`,
    );
  }
  if (pendingStaffLinks > 0) {
    messages.push(
      `${pendingStaffLinks} membro${pendingStaffLinks > 1 ? 's' : ''} da comissão possui${pendingStaffLinks > 1 ? 'em' : ''} vínculo pendente.`,
    );
  }

  const label =
    integrityStatus === 'synced'
      ? 'Dados oficiais sincronizados'
      : integrityStatus === 'failed'
        ? 'Falha na leitura da súmula'
        : 'Dados oficiais com pendências';

  return {
    status: integrityStatus,
    label,
    messages,
    pendingPlayerLinks,
    pendingStaffLinks,
  };
}

export function buildOfficialRoster(
  parsed: ParsedFmfMatchReport,
  playerPool: PlayerLinkPool,
): {
  home: SumulaCartoesOfficialRosterPlayerDto[];
  away: SumulaCartoesOfficialRosterPlayerDto[];
} {
  const mapSide = (side: 'home' | 'away'): SumulaCartoesOfficialRosterPlayerDto[] =>
    parsed.roster
      .filter((r) => r.teamSide === side)
      .map((r) => {
        const identity = resolvePlayerFromRosterEntry(r, playerPool);
        return {
          jerseyNumber: r.jerseyNumber,
          sourceName: r.sourceName,
          cbfRegistration: r.cbfRegistration ?? null,
          starter: r.starter,
          teamSide: side,
          playerId: identity.playerId ?? null,
          linkBadge: toLinkBadge(identity.resolutionStatus),
        };
      })
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber);

  return { home: mapSide('home'), away: mapSide('away') };
}

export function buildOfficialStaffRoster(
  parsed: ParsedFmfMatchReport,
  staffPool: StaffDisciplineCandidate[],
): {
  home: SumulaCartoesOfficialStaffRosterDto[];
  away: SumulaCartoesOfficialStaffRosterDto[];
} {
  const mapSide = (side: 'home' | 'away'): SumulaCartoesOfficialStaffRosterDto[] =>
    parsed.staffRoster
      .filter((r) => r.teamSide === side)
      .map((r) => {
        const member = resolveStaffDisciplineMember(
          `${r.roleLabel} ${r.name}`,
          r.name,
          staffPool,
        );
        return {
          sourceName: r.name,
          roleLabel: r.roleLabel,
          teamSide: side,
          technicalStaffId: member?.id ?? null,
          linkBadge: member ? null : 'pending',
        };
      });

  return { home: mapSide('home'), away: mapSide('away') };
}

export function buildOfficialSheet(input: {
  parsed: ParsedFmfMatchReport;
  events: PersistedEvent[];
  integrityStatus: MatchIntegrityStatus;
  playerPool: PlayerLinkPool;
  staffPool: StaffDisciplineCandidate[];
}): SumulaCartoesOfficialSheetDto {
  const sortedEvents = [...input.events].sort((a, b) =>
    compareOfficialEventOrder(
      {
        period: a.period,
        sourceClock: a.sourceClock,
        minute: a.minute,
        factType: a.factType as Parameters<typeof compareOfficialEventOrder>[0]['factType'],
        sourceSequence: a.sourceSequence,
        externalKey: a.externalKey,
      },
      {
        period: b.period,
        sourceClock: b.sourceClock,
        minute: b.minute,
        factType: b.factType as Parameters<typeof compareOfficialEventOrder>[0]['factType'],
        sourceSequence: b.sourceSequence,
        externalKey: b.externalKey,
      },
    ),
  );
  const mapped = sortedEvents.map((e) => mapPersistedEvent(e, input.parsed));

  const goals = mapped.filter((e) =>
    ['PLAYER_GOAL', 'PLAYER_PENALTY_GOAL', 'PLAYER_OWN_GOAL'].includes(e.factType),
  );
  const playerCards = mapped.filter((e) =>
    ['PLAYER_YELLOW_CARD', 'PLAYER_RED_CARD'].includes(e.factType),
  );
  const staffCards = mapped.filter((e) =>
    ['STAFF_YELLOW_CARD', 'STAFF_RED_CARD'].includes(e.factType),
  );
  const substitutions = mapped.filter((e) => e.factType === 'PLAYER_SUBSTITUTION');

  const roster = buildOfficialRoster(input.parsed, input.playerPool);
  const staffRoster = buildOfficialStaffRoster(input.parsed, input.staffPool);

  const pendingPlayerLinks = [...roster.home, ...roster.away].filter(
    (r) => r.linkBadge != null,
  ).length;
  const pendingStaffLinks = [...staffRoster.home, ...staffRoster.away].filter(
    (r) => r.linkBadge != null,
  ).length;

  return {
    roster,
    staffRoster,
    goals,
    playerCards,
    staffCards,
    substitutions,
    timeline: mapped,
    integrity: buildOfficialIntegrity(
      input.integrityStatus,
      pendingPlayerLinks,
      pendingStaffLinks,
    ),
  };
}

export function attachEventsModeToMatchDto(
  base: SumulaCartoesMatchDto,
  officialSheet: SumulaCartoesOfficialSheetDto,
): SumulaCartoesMatchDto {
  return {
    ...base,
    sourceMode: 'events',
    officialSheet,
    home: {
      ...base.home,
      players: officialSheet.roster.home.map((r) => ({
        jerseyNumber: r.jerseyNumber,
        name: r.sourceName,
        cbfRegistration: r.cbfRegistration,
        starter: r.starter,
        played: false,
        minutesPlayed: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        playerId: r.playerId,
        linkBadge: r.linkBadge,
        sourceName: r.sourceName,
      })),
    },
    away: {
      ...base.away,
      players: officialSheet.roster.away.map((r) => ({
        jerseyNumber: r.jerseyNumber,
        name: r.sourceName,
        cbfRegistration: r.cbfRegistration,
        starter: r.starter,
        played: false,
        minutesPlayed: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        playerId: r.playerId,
        linkBadge: r.linkBadge,
        sourceName: r.sourceName,
      })),
    },
    staffCards: [],
  };
}
