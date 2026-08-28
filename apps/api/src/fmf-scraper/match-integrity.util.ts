import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import type {
  EventReconciliationOutcome,
  MatchIntegrityStatus,
  MatchIntegritySummary,
  MatchReconciliationDetail,
} from './match-official-event.types';
import type { EventReconciliationRow } from './match-official-event.types';
import { reconcileOfficialEvents } from './match-event-reconciliation.util';
import {
  buildRosterMessages,
  reconcilePlayerRoster,
  reconcileStaffRoster,
} from './match-roster-reconciliation.util';
import type { PlayerLinkPool } from './match-official-event.identity';
import type { StaffDisciplineCandidate } from '../futebol-relatorios/fmf-staff-cards.util';
import type { PersistedOfficialEvent } from './match-event-reconciliation.util';

type PersistedEventCounts = {
  goals: number;
  yellowCards: number;
  redCards: number;
  substitutions: number;
  staffYellow: number;
  staffRed: number;
  resolved: number;
  unresolved: number;
  ambiguous: number;
  partial: number;
};

export function countSourceFacts(
  parsed: ParsedFmfMatchReport,
  ourTeamSide: 'home' | 'away',
): {
  playerGoals: number;
  playerYellow: number;
  playerRed: number;
  substitutions: number;
  staffYellow: number;
  staffRed: number;
  playerRoster: number;
  staffRoster: number;
} {
  return {
    playerGoals: parsed.playerGoalEvents.filter((e) => e.teamSide === ourTeamSide).length,
    playerYellow: parsed.playerCardEvents.filter(
      (e) => e.teamSide === ourTeamSide && e.kind === 'yellow',
    ).length,
    playerRed: parsed.playerCardEvents.filter(
      (e) => e.teamSide === ourTeamSide && e.kind === 'red',
    ).length,
    substitutions: parsed.substitutionEvents.filter((e) => e.teamSide === ourTeamSide).length,
    staffYellow: parsed.staffCardEvents.filter(
      (e) => (!e.teamSide || e.teamSide === ourTeamSide) && e.kind === 'yellow',
    ).length,
    staffRed: parsed.staffCardEvents.filter(
      (e) => (!e.teamSide || e.teamSide === ourTeamSide) && e.kind === 'red',
    ).length,
    playerRoster: parsed.roster.filter((r) => r.teamSide === ourTeamSide).length,
    staffRoster: parsed.staffRoster.filter((r) => r.teamSide === ourTeamSide).length,
  };
}

export function buildEventCategoryCounts(rows: EventReconciliationRow[]): {
  goals: ReturnType<typeof categoryBlock>;
  yellowCards: ReturnType<typeof categoryBlock>;
  redCards: ReturnType<typeof categoryBlock>;
  substitutions: ReturnType<typeof categoryBlock>;
  staffYellow: ReturnType<typeof categoryBlock>;
  staffRed: ReturnType<typeof categoryBlock>;
} {
  const filter = (types: string[]) => rows.filter((r) => types.includes(r.factType));
  return {
    goals: categoryBlock(
      filter(['PLAYER_GOAL', 'PLAYER_PENALTY_GOAL', 'PLAYER_OWN_GOAL']),
    ),
    yellowCards: categoryBlock(filter(['PLAYER_YELLOW_CARD'])),
    redCards: categoryBlock(filter(['PLAYER_RED_CARD'])),
    substitutions: categoryBlock(filter(['PLAYER_SUBSTITUTION'])),
    staffYellow: categoryBlock(filter(['STAFF_YELLOW_CARD'])),
    staffRed: categoryBlock(filter(['STAFF_RED_CARD'])),
  };
}

function categoryBlock(rows: EventReconciliationRow[]) {
  const source = rows.filter((r) => r.outcome !== 'stale' && r.outcome !== 'extra').length;
  const persisted = rows.filter((r) => r.outcome !== 'missing').length;
  return {
    source,
    persisted,
    matched: rows.filter((r) => r.outcome === 'matched').length,
    resolved: rows.filter((r) => r.outcome === 'matched').length,
    unresolved: rows.filter((r) => r.outcome === 'unresolved').length,
    ambiguous: rows.filter((r) => r.outcome === 'ambiguous').length,
    missing: rows.filter((r) => r.outcome === 'missing').length,
    drifted: rows.filter((r) => r.outcome === 'drifted').length,
    stale: rows.filter((r) => r.outcome === 'stale').length,
  };
}

export function buildReconciliationDetail(input: {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
  playerPool: PlayerLinkPool;
  staffPool: StaffDisciplineCandidate[];
  persisted: PersistedOfficialEvent[];
  limitations?: string[];
}): MatchReconciliationDetail {
  const playerRoster = reconcilePlayerRoster({
    parsed: input.parsed,
    ourTeamSide: input.ourTeamSide,
    playerPool: input.playerPool,
  });
  const staffRoster = reconcileStaffRoster({
    parsed: input.parsed,
    ourTeamSide: input.ourTeamSide,
  });
  const eventResult = reconcileOfficialEvents({
    parsed: input.parsed,
    ourTeamSide: input.ourTeamSide,
    playerPool: input.playerPool,
    staffPool: input.staffPool,
    persisted: input.persisted,
  });

  const playerEvents = eventResult.rows.filter((r) => r.factType.startsWith('PLAYER_'));
  const staffEvents = eventResult.rows.filter((r) => r.factType.startsWith('STAFF_'));
  const messages = [
    ...buildRosterMessages(playerRoster),
    ...eventResult.rows
      .map((r) => r.explain)
      .filter((m): m is string => Boolean(m)),
  ];

  return {
    roster: {
      player: playerRoster,
      staff: staffRoster,
    },
    events: {
      player: playerEvents,
      staff: staffEvents,
      summary: eventResult.summary,
    },
    messages: [...new Set(messages)],
    limitations: input.limitations ?? [],
  };
}

/**
 * Regras de integridade (Fase 3):
 * - FAILED: fato oficial ausente, drift de conteúdo, evento stale/extra, ou parser não estruturou fatos suportados
 * - UNRESOLVED: todos os fatos persistidos mas identidade incompleta/ambígua (inclui substituição partial)
 * - WARNINGS: fatos ok mas limitações conhecidas do parser/fonte
 * - SYNCED: fatos estruturalmente persistidos, reconciliação event-level matched, elenco resolvido
 */
export function resolveIntegrityStatusFromReconciliation(
  detail: MatchReconciliationDetail,
): MatchIntegrityStatus {
  const s = detail.events.summary;
  if (s.missing > 0 || s.drifted > 0 || s.stale > 0 || s.extra > 0) return 'failed';

  const rosterIncomplete =
    detail.roster.player.unresolved > 0 ||
    detail.roster.player.ambiguous > 0 ||
    detail.roster.player.source !== detail.roster.player.structured;

  const eventsIncomplete = s.unresolved > 0 || s.ambiguous > 0;

  if (rosterIncomplete || eventsIncomplete) return 'unresolved';
  if (detail.limitations.length > 0) return 'warnings';
  return 'synced';
}

export function buildIntegritySummary(input: {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
  persisted: PersistedEventCounts;
  linkedPlayerCount: number;
  unresolvedPlayerRosterCount: number;
  reconciliation?: MatchReconciliationDetail;
  limitations?: string[];
}): MatchIntegritySummary {
  const source = countSourceFacts(input.parsed, input.ourTeamSide);
  const eventCounts = input.reconciliation
    ? buildEventCategoryCounts([
        ...input.reconciliation.events.player,
        ...input.reconciliation.events.staff,
      ])
    : null;

  const playerRosterResolved = input.reconciliation?.roster.player.resolved ?? input.linkedPlayerCount;
  const playerRosterUnresolved =
    input.reconciliation?.roster.player.unresolved ?? input.unresolvedPlayerRosterCount;

  return {
    playerRoster: {
      source: source.playerRoster,
      structured: input.reconciliation?.roster.player.structured ?? source.playerRoster,
      resolved: playerRosterResolved,
      unresolved: playerRosterUnresolved,
    },
    playerEvents: {
      goals: eventCounts?.goals ?? legacyEventBlock(source.playerGoals, input.persisted.goals),
      yellowCards:
        eventCounts?.yellowCards ?? legacyEventBlock(source.playerYellow, input.persisted.yellowCards),
      redCards: eventCounts?.redCards ?? legacyEventBlock(source.playerRed, input.persisted.redCards),
      substitutions:
        eventCounts?.substitutions ?? legacyEventBlock(source.substitutions, input.persisted.substitutions),
    },
    staffRoster: {
      source: source.staffRoster,
      structured: input.reconciliation?.roster.staff.structured ?? source.staffRoster,
    },
    staffEvents: {
      yellowCards:
        eventCounts?.staffYellow ?? legacyEventBlock(source.staffYellow, input.persisted.staffYellow),
      redCards: eventCounts?.staffRed ?? legacyEventBlock(source.staffRed, input.persisted.staffRed),
    },
    limitations: input.limitations,
  };
}

function legacyEventBlock(source: number, persisted: number) {
  return { source, persisted, resolved: persisted, unresolved: 0, ambiguous: 0 };
}

export function resolveIntegrityStatus(summary: MatchIntegritySummary): MatchIntegrityStatus {
  const eventMismatch =
    summary.playerEvents.goals.source !== summary.playerEvents.goals.persisted ||
    summary.playerEvents.yellowCards.source !== summary.playerEvents.yellowCards.persisted ||
    summary.playerEvents.redCards.source !== summary.playerEvents.redCards.persisted ||
    summary.playerEvents.substitutions.source !== summary.playerEvents.substitutions.persisted ||
    summary.staffEvents.yellowCards.source !== summary.staffEvents.yellowCards.persisted ||
    summary.staffEvents.redCards.source !== summary.staffEvents.redCards.persisted;

  if (eventMismatch) return 'failed';

  const unresolvedPlayers = summary.playerRoster.unresolved > 0;
  const unresolvedStaff =
    summary.staffEvents.yellowCards.unresolved > 0 || summary.staffEvents.redCards.unresolved > 0;

  if (unresolvedPlayers || unresolvedStaff) return 'unresolved';
  if (summary.limitations?.length) return 'warnings';
  return 'synced';
}

export function countPersistedEvents(
  events: Array<{ factType: string; resolutionStatus: string }>,
): PersistedEventCounts {
  const counts: PersistedEventCounts = {
    goals: 0,
    yellowCards: 0,
    redCards: 0,
    substitutions: 0,
    staffYellow: 0,
    staffRed: 0,
    resolved: 0,
    unresolved: 0,
    ambiguous: 0,
    partial: 0,
  };
  for (const ev of events) {
    if (ev.resolutionStatus === 'resolved') counts.resolved += 1;
    if (ev.resolutionStatus === 'unresolved') counts.unresolved += 1;
    if (ev.resolutionStatus === 'ambiguous') counts.ambiguous += 1;
    if (ev.resolutionStatus === 'partial') counts.partial += 1;
    switch (ev.factType) {
      case 'PLAYER_GOAL':
      case 'PLAYER_PENALTY_GOAL':
      case 'PLAYER_OWN_GOAL':
        counts.goals += 1;
        break;
      case 'PLAYER_YELLOW_CARD':
        counts.yellowCards += 1;
        break;
      case 'PLAYER_RED_CARD':
        counts.redCards += 1;
        break;
      case 'PLAYER_SUBSTITUTION':
        counts.substitutions += 1;
        break;
      case 'STAFF_YELLOW_CARD':
        counts.staffYellow += 1;
        break;
      case 'STAFF_RED_CARD':
        counts.staffRed += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}

export function summarizeEventOutcomes(summary: Record<EventReconciliationOutcome, number>): string[] {
  const lines: string[] = [];
  if (summary.missing > 0) lines.push(`${summary.missing} fato(s) oficial(is) não persistido(s).`);
  if (summary.drifted > 0) lines.push(`${summary.drifted} evento(s) com conteúdo divergente da fonte.`);
  if (summary.stale > 0) lines.push(`${summary.stale} evento(s) obsoleto(s) no banco.`);
  if (summary.unresolved > 0) {
    lines.push(`${summary.unresolved} evento(s) com identidade incompleta.`);
  }
  if (summary.ambiguous > 0) lines.push(`${summary.ambiguous} evento(s) com identidade ambígua.`);
  return lines;
}
