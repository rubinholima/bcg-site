import type { CoachContextResponse, CoachTrainingSession } from "@/lib/treinadores-types";

export type GkContextResponse = CoachContextResponse & {
  staff?: Array<{ id: string; name: string; role?: string }>;
  allPlayersCount?: number;
};

export type GkTrainingSession = CoachTrainingSession & {
  characteristics?: string | null;
  physicalQualities?: string | null;
  playerEntries: Array<
    CoachTrainingSession["playerEntries"][number] & {
      playerCategoryAtEntry?: string | null;
      crossCategory?: boolean;
    }
  >;
};

export type GkKpis = {
  gkSessions: number;
  activeGoalkeepers: number;
  attendanceEntries: number;
  averageRating: number | null;
  crossCategoryParticipations: number;
  matchAnalyses: number;
  matchAnalysesCompleted: number;
  analysesWithKeeperPdf: number;
  analysesWithVideo: number;
  missingAnalysisArtifacts: number;
};

export type GkMatchAnalysis = {
  id: string;
  tenantId: string;
  category: string | null;
  matchDate: string | null;
  opponentName: string | null;
  observations: string | null;
  highlightsVideoUrl: string | null;
  status: string;
  coachMatchReportId: string | null;
  staff?: { id: string; name: string; role?: string } | null;
  players: Array<{
    playerId: string;
    playerCategoryAtEntry?: string | null;
    player?: { id: string; name: string; jerseyNumber?: number | null; category?: string | null };
  }>;
  attachments: Array<{ id?: string; label?: string | null; fileUrl: string; kind?: string | null }>;
  coachMatchReport?: {
    id: string;
    matchDate: string;
    opponentName: string;
    category: string | null;
  } | null;
};

export type GkConsolidatedHistory = {
  player: { id: string; name: string; category: string | null };
  training: Array<{
    kind: "training";
    sessionId: string;
    sessionDate: string;
    sessionCategory: string | null;
    playerCategory: string | null;
    crossCategory: boolean;
    crossCategoryLabel: string | null;
    rating: number | null;
    notes: string | null;
    available: boolean;
    attachments: Array<{ label?: string | null; fileUrl: string; kind?: string | null }>;
    staffName: string | null;
  }>;
  matchAnalyses: Array<{
    kind: "match_analysis";
    analysisId: string;
    matchDate: string | null;
    opponentName: string | null;
    observations: string | null;
    highlightsVideoUrl: string | null;
    attachments: Array<{ label?: string | null; fileUrl: string; kind?: string | null }>;
    staffName: string | null;
    playerCategory: string | null;
  }>;
};

export type GkMatchReportOption = {
  id: string;
  matchDate: string;
  opponentName: string;
  category: string | null;
};

export const GK_ATTACHMENT_KINDS = [
  { value: "keeper_scout", label: "Keeper Scout (PDF)" },
  { value: "outro", label: "Outro" },
] as const;
