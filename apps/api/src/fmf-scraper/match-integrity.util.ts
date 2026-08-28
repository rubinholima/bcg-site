import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import type {
  MatchIntegrityStatus,
  MatchIntegritySummary,
} from './match-official-event.types';

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

export function buildIntegritySummary(input: {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
  persisted: PersistedEventCounts;
  linkedPlayerCount: number;
  unresolvedPlayerRosterCount: number;
  limitations?: string[];
}): MatchIntegritySummary {
  const source = countSourceFacts(input.parsed, input.ourTeamSide);
  return {
    playerRoster: {
      source: source.playerRoster,
      structured: source.playerRoster,
      resolved: input.linkedPlayerCount,
      unresolved: input.unresolvedPlayerRosterCount,
    },
    playerEvents: {
      goals: {
        source: source.playerGoals,
        persisted: input.persisted.goals,
        resolved: input.persisted.goals - input.persisted.unresolved,
        unresolved: 0,
        ambiguous: 0,
      },
      yellowCards: {
        source: source.playerYellow,
        persisted: input.persisted.yellowCards,
        resolved: input.persisted.yellowCards,
        unresolved: 0,
        ambiguous: 0,
      },
      redCards: {
        source: source.playerRed,
        persisted: input.persisted.redCards,
        resolved: input.persisted.redCards,
        unresolved: 0,
        ambiguous: 0,
      },
      substitutions: {
        source: source.substitutions,
        persisted: input.persisted.substitutions,
        resolved: input.persisted.substitutions,
        unresolved: 0,
        ambiguous: 0,
      },
    },
    staffRoster: {
      source: source.staffRoster,
      structured: source.staffRoster,
    },
    staffEvents: {
      yellowCards: {
        source: source.staffYellow,
        persisted: input.persisted.staffYellow,
        resolved: input.persisted.staffYellow,
        unresolved: Math.max(0, input.persisted.staffYellow - input.persisted.resolved),
        ambiguous: input.persisted.ambiguous,
      },
      redCards: {
        source: source.staffRed,
        persisted: input.persisted.staffRed,
        resolved: input.persisted.staffRed,
        unresolved: 0,
        ambiguous: 0,
      },
    },
    limitations: input.limitations,
  };
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
  };
  for (const ev of events) {
    if (ev.resolutionStatus === 'resolved') counts.resolved += 1;
    if (ev.resolutionStatus === 'unresolved') counts.unresolved += 1;
    if (ev.resolutionStatus === 'ambiguous') counts.ambiguous += 1;
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
