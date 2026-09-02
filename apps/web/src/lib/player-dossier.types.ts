export type PlayerDossierOptionalSection =
  | "psychology"
  | "physio"
  | "nursing"
  | "medical"
  | "nutrition"
  | "physiology"
  | "performance"
  | "scouting"
  | "training";

export interface PlayerDossierOptionalMeta {
  id: PlayerDossierOptionalSection;
  label: string;
}

export interface PlayerDossierDto {
  meta: {
    generatedAt: string;
    playerId: string;
    season: number;
    canChooseOptionalSections: boolean;
    availableOptionalSections: PlayerDossierOptionalMeta[];
    includedOptionalSections: PlayerDossierOptionalSection[];
  };
  club: {
    id: string;
    name: string;
    slug?: string;
    logoUrl?: string | null;
  } | null;
  identity: {
    name: string;
    photoUrl?: string | null;
    jerseyNumber?: number | null;
    birthDate?: string | null;
    nationality?: string | null;
    category?: string | null;
    position?: string | null;
    preferredFoot?: string | null;
    height?: number | null;
    weight?: number | null;
    bmi?: number | null;
    bodyFatPercent?: number | null;
    currentTeam?: string | null;
    bioPT?: string | null;
  };
  registration: {
    cbfRegistration?: string | null;
    situation?: string | null;
    localFedRegistration?: string | null;
    comet?: string | null;
    jerseyName?: string | null;
  };
  career: {
    previousTeams: string[];
    seasonHistory: unknown[];
    subidaHighlights: unknown[];
  };
  fmfStats: {
    total: {
      matchesPlayed: number;
      minutesPlayed: number;
      goals: number;
    };
    seasons: Array<{
      year: number;
      competition: string;
      category: string;
      minutesPlayed: number;
      goals: number;
      matchesPlayed: number;
    }>;
    years: Array<{
      year: number;
      minutesPlayed: number;
      goals: number;
      matchesPlayed: number;
    }>;
  } | null;
  performance: {
    evaluations: unknown[];
    analysisMetrics: Record<string, unknown>;
    performanceAnalysis?: string | null;
    coachEvaluations: {
      count: number;
      averagePercentage: number | null;
      periods: Array<{
        periodKey: string;
        percentage: number | null;
        classification: string | null;
        submittedAt: string | null;
      }>;
    };
  };
  timeline: Array<{
    date: string;
    type: string;
    label: string;
    detail?: string | null;
  }>;
  charts: {
    seasonMinutes: Array<{
      label: string;
      minutesPlayed: number;
      goals: number;
      matchesPlayed: number;
    }>;
    yearTotals: Array<{
      year: number;
      minutesPlayed: number;
      goals: number;
      matchesPlayed: number;
    }>;
  };
  optional: Record<string, unknown>;
}
