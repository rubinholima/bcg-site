export type BostonCitySeasonRow = {
  playerId: string;
  name: string;
  category: string | null;
  position: string | null;
  jerseyNumber: number | null;
  season: number;
  selectionCount: number;
  averageRating: number | null;
  seasonStatsOfficial: {
    goals: number;
    assists: number;
    minutes: number;
    matches: number;
  } | null;
  matches: Array<{
    reportId: string;
    matchDate: string | null;
    opponent: string | null;
    competition: string | null;
    scoreLabel: string | null;
    rating: number | null;
    assists: number;
    individualReport: string | null;
    isMatchBest: boolean;
    isStaffStandout: boolean;
  }>;
};

export type OpponentRadarRow = {
  id: string;
  displayName: string;
  cbfRegistration: string | null;
  position: string | null;
  lastKnownClub: string | null;
  category: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  highlightCount: number;
  identitySource: string;
  identityConfidence: string;
  managementNotes: string | null;
  managementStatus: string | null;
  scoutingProspectId: string | null;
  scoutingProspect: { id: string; name: string; stage: string } | null;
  seasonSelectionCount: number;
  clubHistory: string[];
  events: Array<{
    id: string;
    matchDate: string | null;
    opponentClub: string | null;
    competition: string | null;
    category: string | null;
    jerseyNumber: number | null;
    position: string | null;
    staffNotes: string | null;
    scoreLabel: string | null;
    resolvedName: string | null;
    cbfRegistration: string | null;
    identitySource: string;
    officialStats: unknown;
    reportId: string;
    fmfMatchReportId: string | null;
  }>;
};

export type SeasonHighlightsSummary = {
  season: number;
  ourStandoutSelections: number;
  byCategory: Record<string, number>;
  byCompetition: Record<string, number>;
  byOpponentClub: Record<string, number>;
  opponentProfiles: number;
  opponentRecurrent: number;
  opponentCbfConfirmed: number;
  opponentUnresolved: number;
  topBostonCity: BostonCitySeasonRow[];
  topOpponentRadar: OpponentRadarRow[];
};
