/** Taxonomia centralizada de fatos oficiais da súmula FMF. */
export const MATCH_OFFICIAL_FACT_TYPES = [
  'PLAYER_GOAL',
  'PLAYER_PENALTY_GOAL',
  'PLAYER_OWN_GOAL',
  'PLAYER_YELLOW_CARD',
  'PLAYER_RED_CARD',
  'PLAYER_SUBSTITUTION',
  'STAFF_YELLOW_CARD',
  'STAFF_RED_CARD',
] as const;

export type MatchOfficialFactType = (typeof MATCH_OFFICIAL_FACT_TYPES)[number];

export const MATCH_RESOLUTION_STATUS = ['resolved', 'partial', 'unresolved', 'ambiguous'] as const;
export type MatchResolutionStatus = (typeof MATCH_RESOLUTION_STATUS)[number];

export const EVENT_RECONCILIATION_OUTCOMES = [
  'matched',
  'unresolved',
  'ambiguous',
  'missing',
  'drifted',
  'stale',
  'extra',
] as const;
export type EventReconciliationOutcome = (typeof EVENT_RECONCILIATION_OUTCOMES)[number];

export const ROSTER_RECONCILIATION_OUTCOMES = [
  'matched',
  'missing',
  'extra',
  'drifted_side',
  'drifted_jersey',
  'drifted_cbf',
  'drifted_starter',
  'duplicate',
  'unresolved',
  'ambiguous',
] as const;
export type RosterReconciliationOutcome = (typeof ROSTER_RECONCILIATION_OUTCOMES)[number];

export const MATCH_RESOLUTION_REASONS = [
  'CBF_EXACT',
  'ROSTER_CBF',
  'ROSTER_NAME_EXACT',
  'STAFF_ROSTER_NAME_ROLE',
  'NAME_EXACT',
  'NAME_CONTAINED',
  'NAME_TOKENS',
  'AMBIGUOUS_NAME',
  'DUPLICATE_CBF',
  'NO_MATCH',
  'DUPLICATE_REGISTRATION',
  'REGISTRATION_NAME_MISMATCH',
] as const;

export type MatchResolutionReason = (typeof MATCH_RESOLUTION_REASONS)[number];

export const MATCH_EVENT_PROVENANCE = ['fmf_official'] as const;
export type MatchEventProvenance = (typeof MATCH_EVENT_PROVENANCE)[number];

export const MATCH_INTEGRITY_STATUS = ['synced', 'warnings', 'unresolved', 'failed'] as const;
export type MatchIntegrityStatus = (typeof MATCH_INTEGRITY_STATUS)[number];

export const DRIFT_CLASSIFICATIONS = [
  'IDENTITY_DRIFT',
  'EVENT_COUNT_DRIFT',
  'CARD_DRIFT',
  'GOAL_DRIFT',
  'MINUTES_DRIFT',
  'ROLE_DRIFT',
  'CATEGORY_DRIFT',
  'UNRESOLVED_SOURCE',
  'PARSER_DRIFT',
] as const;

export type DriftClassification = (typeof DRIFT_CLASSIFICATIONS)[number];

export type MatchOfficialEventDraft = {
  factType: MatchOfficialFactType;
  provenance: MatchEventProvenance;
  playerId?: string | null;
  technicalStaffId?: string | null;
  resolutionStatus: MatchResolutionStatus;
  relatedResolutionStatus?: MatchResolutionStatus | null;
  resolutionReason?: MatchResolutionReason | null;
  sourceName?: string | null;
  sourceRegistration?: string | null;
  sourceJerseyNumber?: number | null;
  relatedJerseyNumber?: number | null;
  relatedPlayerId?: string | null;
  sourceRoleLabel?: string | null;
  sourceTeamSide?: 'home' | 'away' | null;
  minute?: number | null;
  period?: string | null;
  sourceClock?: string | null;
  sourceSequence?: number | null;
  goalType?: string | null;
  sourceExcerpt?: string | null;
  sourceSections?: string[] | null;
  externalKey: string;
};

export type EventReconciliationRow = {
  externalKey: string;
  factType: MatchOfficialFactType;
  outcome: EventReconciliationOutcome;
  sourceSummary: string;
  persistedSummary?: string | null;
  explain?: string | null;
};

export type RosterReconciliationRow = {
  key: string;
  side: 'home' | 'away';
  jerseyNumber?: number | null;
  cbfRegistration?: string | null;
  sourceName?: string | null;
  roleLabel?: string | null;
  outcome: RosterReconciliationOutcome;
  explain?: string | null;
};

export type MatchReconciliationDetail = {
  roster: {
    player: {
      source: number;
      structured: number;
      resolved: number;
      unresolved: number;
      ambiguous: number;
      rows: RosterReconciliationRow[];
    };
    staff: {
      source: number;
      structured: number;
      rows: RosterReconciliationRow[];
    };
  };
  events: {
    player: EventReconciliationRow[];
    staff: EventReconciliationRow[];
    summary: {
      matched: number;
      unresolved: number;
      ambiguous: number;
      missing: number;
      drifted: number;
      stale: number;
      extra: number;
    };
  };
  messages: string[];
  limitations: string[];
};

export type MatchIntegritySummary = {
  playerRoster: { source: number; structured: number; resolved: number; unresolved: number };
  playerEvents: {
    goals: EventCategoryIntegrity;
    yellowCards: EventCategoryIntegrity;
    redCards: EventCategoryIntegrity;
    substitutions: EventCategoryIntegrity;
  };
  staffRoster: { source: number; structured: number };
  staffEvents: {
    yellowCards: EventCategoryIntegrity;
    redCards: EventCategoryIntegrity;
  };
  limitations?: string[];
};

export type EventCategoryIntegrity = {
  source: number;
  persisted: number;
  matched?: number;
  resolved: number;
  unresolved: number;
  ambiguous: number;
  missing?: number;
  drifted?: number;
  stale?: number;
};
