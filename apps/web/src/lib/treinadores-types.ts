export type CoachContextGame = {
  id: string;
  matchDate: string;
  opponentName: string | null;
  championshipName: string | null;
  category: string | null;
  categories: unknown;
  isHomeMatch: boolean | null;
  stadiumName: string | null;
  city: string | null;
  status: string;
};

export type CoachCompletedGame = {
  gameKey: string;
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
  category: string | null;
  matchDate: string;
  opponentName: string;
  competition: string | null;
  phase: string | null;
  round: number | null;
  isHome: boolean;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreLabel: string;
  result: "V" | "E" | "D" | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  yellowCards: number;
  redCards: number;
  possessionPct: number | null;
  setPiecesFor: number | null;
  setPiecesAgainst: number | null;
  statsSource: "official" | "manual" | null;
  hasDetailedStats: boolean;
};

export type CoachLastRoundMatch = {
  round: number | null;
  phase: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreLabel: string;
  matchDate: string | null;
  isClubMatch: boolean;
};

export type CoachContextPlayer = {
  id: string;
  name: string;
  photoUrl?: string | null;
  birthDate?: string | null;
  height?: number | null;
  weight?: number | null;
  preferredFoot?: string | null;
  position?: string | null;
  jerseyNumber: number | null;
  category: string | null;
  inTreatment: boolean;
  registrationProfile?: unknown;
};

export type CoachContextResponse = {
  tenant: { id: string; name: string; slug: string };
  upcomingGames: CoachContextGame[];
  recentGames: CoachContextGame[];
  completedGames: CoachCompletedGame[];
  lastRound: {
    round: number | null;
    phase: string | null;
    matches: CoachLastRoundMatch[];
  };
  discipline: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    yellowCards: number;
    redCards: number;
  }>;
  inTreatment: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    reason: string;
    estimatedEndDate: string | null;
  }>;
  availableSquad: Array<{
    id: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
  }>;
  standings: Array<{
    position: number;
    team: string;
    points: number;
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    isClub?: boolean;
  }>;
  opponents: Array<{ name: string; nextMatchDate?: string; championship?: string | null }>;
  players: CoachContextPlayer[];
};

export type CoachMatchReport = {
  id: string;
  tenantId: string;
  travelLogisticsId: string | null;
  fmfMatchReportId: string | null;
  category: string | null;
  matchDate: string | null;
  opponentName: string | null;
  teamReport: string | null;
  matchSummary: string | null;
  aspectsToImprove: string | null;
  goodActions: string | null;
  opponentBestJersey: number | null;
  opponentBestPosition: string | null;
  opponentBestNotes: string | null;
  opponentBestPlayers?: Array<{
    id?: string;
    jerseyNumber: number | null;
    position: string | null;
    notes: string | null;
    sortOrder?: number;
  }>;
  generalNotes: string | null;
  status: string;
  teamRatingAverage?: number | null;
  matchBestPlayerIds?: string[];
  playerRatings: Array<{
    playerId: string;
    rating: number | null;
    assists?: number | null;
    individualReport: string | null;
    isMatchBest?: boolean;
    player?: {
      id: string;
      name: string;
      nickname: string | null;
      jerseyNumber: number | null;
    };
  }>;
  attachments: Array<{
    id: string;
    label: string | null;
    fileUrl: string;
    kind: string | null;
  }>;
};

export type CoachTrainingActivity = {
  id?: string;
  kind: string;
  title: string;
  description?: string | null;
  durationMinutes?: number | null;
  sortOrder?: number;
  mediaUrl?: string | null;
};

export type CoachTrainingAttachment = {
  id?: string;
  label: string | null;
  fileUrl: string;
  kind: string | null;
};

export type CoachTrainingPlanTemplate = {
  id: string;
  tenantId: string;
  category: string | null;
  title: string;
  fileUrl: string;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CoachAgendaTreinoOption = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  category: string | null;
};

export type CoachTrainingSession = {
  id: string;
  tenantId: string;
  category: string | null;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  objectives: string | null;
  notes: string | null;
  status: string;
  agendaEntryId?: string | null;
  planTemplateId?: string | null;
  agendaEntry?: CoachAgendaTreinoOption | null;
  planTemplate?: Pick<CoachTrainingPlanTemplate, "id" | "title" | "fileUrl" | "category"> | null;
  attachments: CoachTrainingAttachment[];
  activities: CoachTrainingActivity[];
  playerEntries: Array<{
    playerId: string;
    available: boolean;
    unavailableReason: string | null;
    rating: number | null;
    notes: string | null;
    player?: {
      id: string;
      name: string;
      nickname: string | null;
      jerseyNumber: number | null;
    };
  }>;
};

export const COACH_ACTIVITY_KINDS = [
  { value: "aquecimento", label: "Aquecimento" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "principal", label: "Atividade principal" },
  { value: "encerramento", label: "Encerramento" },
] as const;

export const COACH_ATTACHMENT_KINDS = [
  { value: "sumula", label: "Súmula" },
  { value: "analista", label: "Analista" },
  { value: "scout", label: "Scout" },
  { value: "outro", label: "Outro" },
] as const;

export const COACH_TRAINING_ATTACHMENT_KINDS = [
  { value: "plano_treino", label: "Plano de treino (PDF)" },
  { value: "video_referencia", label: "Vídeo de referência" },
  { value: "outro", label: "Outro" },
] as const;

export type CoachTrainingSessionReport = {
  session: {
    id: string;
    sessionDate: string;
    startTime: string | null;
    endTime: string | null;
    category: string | null;
    objectives: string | null;
    notes: string | null;
    status: string;
    staffName: string | null;
    agendaTitle: string | null;
    agendaLocation: string | null;
    planTemplateTitle: string | null;
  };
  attachments: CoachTrainingAttachment[];
  activities: CoachTrainingActivity[];
  players: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
    available: boolean;
    unavailableReason: string | null;
    rating: number | null;
    notes: string | null;
  }>;
  summary: {
    totalPlayers: number;
    availableCount: number;
    unavailableCount: number;
    ratedCount: number;
    averageRating: number | null;
  };
};

export type CoachTrainingPeriodReport = {
  from: string;
  to: string;
  category: string | null;
  sessions: Array<{
    id: string;
    sessionDate: string;
    status: string;
    availableCount: number;
    averageRating: number | null;
    attachmentCount: number;
  }>;
  summary: {
    sessionCount: number;
    finalizedCount: number;
    averageTeamRating: number | null;
    averageAttendancePct: number | null;
  };
  players: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
    sessionsTotal: number;
    sessionsAvailable: number;
    sessionsUnavailable: number;
    averageRating: number | null;
    lastRating: number | null;
    lastNotes: string | null;
  }>;
  highlights: {
    lowRating: CoachTrainingPeriodReport["players"];
    frequentAbsences: CoachTrainingPeriodReport["players"];
  };
};

export type PlayerTrainingHistoryItem = {
  sessionId: string;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  category: string | null;
  status: string;
  objectives: string | null;
  staffName: string | null;
  agendaTitle: string | null;
  planTemplateTitle: string | null;
  attachments: CoachTrainingAttachment[];
  available: boolean;
  unavailableReason: string | null;
  rating: number | null;
  notes: string | null;
};

export const COACH_TEAM_PERIOD_TYPES = [
  { value: "geral", label: "Geral" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
] as const;

export const COACH_TEAM_PERIOD_KEYS = [
  { value: "fevereiro", label: "Fevereiro" },
  { value: "julho", label: "Julho" },
  { value: "setembro", label: "Setembro" },
  { value: "fim_temporada", label: "Fim da temporada" },
] as const;

export type CoachTeamReportPeriodKey = (typeof COACH_TEAM_PERIOD_KEYS)[number]["value"];

export type CoachTeamReportPeriod = (typeof COACH_TEAM_PERIOD_TYPES)[number]["value"];

export type CoachTeamReportPlayerEvaluation = {
  id?: string;
  playerId: string;
  gamesCount: number;
  gamesMinutes: number;
  trainingMinutes: number;
  avgMatchRating: number | null;
  coachFinalRating: number | null;
  individualObservation?: string | null;
  playerStrengths?: string | null;
  player?: {
    id: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
    registrationProfile?: unknown;
  };
};

export type CoachTeamEvaluationDraft = {
  season: number;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  players: Array<
    CoachTeamReportPlayerEvaluation & {
      name: string;
      jerseyNumber: number | null;
      category: string | null;
    }
  >;
};

export type CoachPromotionCandidate = {
  id: string;
  name: string;
  photoUrl: string | null;
  jerseyNumber: number | null;
  category: string | null;
  categoryLabel: string | null;
};

export type CoachTeamMonthlyReportStatus = "pendente" | "rascunho" | "enviado" | "atrasado";

export type CoachTeamReport = {
  id: string;
  tenantId: string;
  category: string | null;
  periodType: CoachTeamReportPeriod;
  season: number | null;
  periodKey: CoachTeamReportPeriodKey | string | null;
  periodStart: string | null;
  periodEnd: string | null;
  generalDescription: string | null;
  weakPoints: string | null;
  status: "rascunho" | "enviado";
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  playerActions: Array<{
    id: string;
    playerId: string;
    actionType: "dispensa" | "promocao";
    reason: string | null;
    player?: {
      id: string;
      name: string;
      jerseyNumber: number | null;
      category: string | null;
      registrationProfile?: unknown;
    };
  }>;
  playerEvaluations: CoachTeamReportPlayerEvaluation[];
};

export type CoachTeamReportSummary = {
  total: number;
  enviados: number;
  rascunhos: number;
  latestEnviado: {
    id: string;
    periodType: string;
    sentAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
  } | null;
  dispensasIndicadas: number;
  promocoesIndicadas: number;
  quarterlyPeriods?: Array<{
    periodKey: CoachTeamReportPeriodKey;
    status: "pendente" | "rascunho" | "enviado";
    reportId: string | null;
  }>;
  monthlyPeriods?: Array<{
    periodKey: string;
    status: CoachTeamMonthlyReportStatus;
    reportId: string | null;
  }>;
};

export type CoachPlayerEvaluationStats = {
  gamesListed: number;
  gamesPlayed: number;
  gamesStarted: number;
  gamesListedHigherCategory: number;
  gamesPlayedHigherCategory: number;
  matchMinutes: number;
  trainingMinutes: number;
  goals: number;
  assists: number;
};

export type CoachPlayerEvaluation = {
  id: string;
  tenantId: string;
  playerId: string;
  category: string;
  season: number;
  periodKey: CoachTeamReportPeriodKey;
  periodStart: string;
  periodEnd: string;
  status: "pendente" | "rascunho" | "concluido";
  gamesListed: number;
  gamesPlayed: number;
  gamesStarted: number;
  gamesListedHigherCategory: number;
  gamesPlayedHigherCategory: number;
  matchMinutes: number;
  trainingMinutes: number;
  goals: number;
  assists: number;
  techIndividualSkill: number | null;
  techBilaterality: number | null;
  techNonDominantLeg: number | null;
  techAverage: number | null;
  tacCollective: number | null;
  tacIndividual: number | null;
  tacGameVision: number | null;
  tacDecisionMaking: number | null;
  tacAverage: number | null;
  physStrength: number | null;
  physSpeed: number | null;
  physPotential: number | null;
  physMaturity: number | null;
  physAverage: number | null;
  behEmotionalControl: number | null;
  behPersonality: number | null;
  behDetermination: number | null;
  behIntelligence: number | null;
  behAverage: number | null;
  offBuildUp: number | null;
  offOrganization: number | null;
  offPositioning: number | null;
  offAverage: number | null;
  defOrganization: number | null;
  defRecovery: number | null;
  defPositioning: number | null;
  defAverage: number | null;
  competitiveness: number | null;
  overallAverage: number | null;
  percentage: number | null;
  classification: string | null;
  technicalAssessment: string | null;
  finalResult: string | null;
  player?: CoachContextPlayer & { photoUrl?: string | null };
};

export const COACH_PLAYER_CLASSIFICATION_LABEL: Record<string, string> = {
  internacional_elite: "Internacional Elite",
  nacional_elite: "Nacional Elite",
  estadual: "Estadual",
  nao_pro: "Non-Pro",
};

export function coachPlayerPercentageFromAverage(average: number | null | undefined): number | null {
  if (average == null || !Number.isFinite(average)) return null;
  return average * 20;
}

export function coachPlayerClassificationFromPercentage(percentage: number): string {
  if (percentage >= 90) return "internacional_elite";
  if (percentage >= 80) return "nacional_elite";
  if (percentage >= 60) return "estadual";
  return "nao_pro";
}

export const COACH_PLAYER_FINAL_RESULT_OPTIONS = [
  { value: "aprovado", label: "Aprovado" },
  { value: "manter", label: "Manter" },
  { value: "reprovado", label: "Reprovado" },
] as const;

export const COACH_PLAYER_EVALUATION_SCORE_SECTIONS = [
  {
    title: "Dimensão técnica",
    fields: [
      { key: "techIndividualSkill", label: "Habilidade individual" },
      { key: "techBilaterality", label: "Bilateralidade" },
      { key: "techNonDominantLeg", label: "Uso da perna não dominante" },
    ],
  },
  {
    title: "Dimensão tática",
    fields: [
      { key: "tacCollective", label: "Tática coletiva" },
      { key: "tacIndividual", label: "Tática individual" },
      { key: "tacGameVision", label: "Visão de jogo" },
      { key: "tacDecisionMaking", label: "Tomada de decisão" },
    ],
  },
  {
    title: "Dimensão física",
    fields: [
      { key: "physStrength", label: "Força" },
      { key: "physSpeed", label: "Velocidade" },
      { key: "physPotential", label: "Potencial" },
      { key: "physMaturity", label: "Nível de maturidade" },
    ],
  },
  {
    title: "Dimensão comportamental",
    fields: [
      { key: "behEmotionalControl", label: "Controle emocional" },
      { key: "behPersonality", label: "Personalidade" },
      { key: "behDetermination", label: "Vontade / determinação" },
      { key: "behIntelligence", label: "Inteligência" },
    ],
  },
  {
    title: "Análise ofensiva",
    fields: [
      { key: "offBuildUp", label: "Participação na saída de bola" },
      { key: "offOrganization", label: "Organização ofensiva" },
      { key: "offPositioning", label: "Posicionamento ofensivo" },
    ],
  },
  {
    title: "Análise defensiva",
    fields: [
      { key: "defOrganization", label: "Organização defensiva" },
      { key: "defRecovery", label: "Recuperação / retorno defensivo" },
      { key: "defPositioning", label: "Posicionamento defensivo" },
    ],
  },
  {
    title: "Competitividade",
    fields: [{ key: "competitiveness", label: "Competitividade" }],
  },
] as const;
