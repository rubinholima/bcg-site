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

export interface DossierFmfMatchRow {
  id: string;
  jerseyNumber?: number | null;
  starter: boolean;
  listed: boolean;
  played: boolean;
  enteredMinute?: number | null;
  exitedMinute?: number | null;
  minutesPlayed: number;
  goals: number;
  ownGoals: number;
  penaltyGoals: number;
  yellowCards: number;
  redCards: number;
  match: {
    id: string;
    competition: string;
    phase?: string | null;
    round?: string | null;
    category: string;
    season: number;
    matchDate: string;
    homeTeam: string;
    awayTeam: string;
    homeScore?: number | null;
    awayScore?: number | null;
  };
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
  cover: {
    name: string;
    nickname?: string | null;
    photoUrl?: string | null;
    jerseyNumber?: number | null;
    category?: string | null;
    position?: string | null;
    age?: number | null;
    nationality?: string | null;
    preferredFoot?: string | null;
    height?: number | null;
    weight?: number | null;
    situation?: string | null;
    bioPT?: string | null;
  };
  profile: {
    birthDate?: string | null;
    cbfRegistration?: string | null;
    localFedRegistration?: string | null;
    comet?: string | null;
    jerseyName?: string | null;
    currentTeam?: string | null;
    bmi?: number | null;
    bodyFatPercent?: number | null;
    matchesPlayed?: number | null;
    goals?: number | null;
    assists?: number | null;
    yellowCards?: number | null;
    redCards?: number | null;
    marketValue?: number | null;
  };
  career: {
    previousTeams: string[];
    seasonHistory: unknown[];
    subidaEvents: unknown[];
    movements: Array<{ date: string; label: string; detail?: string | null }>;
  };
  matchHistory: {
    totals: {
      matchesListed: number;
      matchesPlayed: number;
      starts: number;
      minutesPlayed: number;
      goals: number;
      yellowCards: number;
      redCards: number;
    } | null;
    bySeason: Array<{
      year: number;
      competition: string;
      category: string;
      minutesPlayed: number;
      goals: number;
      matchesPlayed: number;
      starts: number;
    }>;
    matches: DossierFmfMatchRow[];
  };
  performance: {
    diretoriaEvaluations: unknown[];
    analysisMetrics: Record<string, unknown>;
    performanceAnalysis?: string | null;
    coachEvaluations: Array<{
      season: number;
      periodKey: string;
      percentage: number | null;
      classification: string | null;
      overallAverage: number | null;
      matchMinutes: number;
      trainingMinutes: number;
      goals: number;
      assists: number;
      submittedAt: string | null;
      technicalAssessment?: string | null;
    }>;
    coachSummary: {
      count: number;
      averagePercentage: number | null;
    };
  };
  timeline: Array<{
    date: string;
    category: string;
    title: string;
    detail?: string | null;
  }>;
  charts: {
    monthlyMinutes: Array<{ label: string; minutes: number; games: number }>;
    seasonMinutes: Array<{ label: string; minutesPlayed: number; goals: number; matchesPlayed: number }>;
    evaluationTrend: Array<{ label: string; value: number }>;
  };
  optional: Record<string, unknown>;
}
