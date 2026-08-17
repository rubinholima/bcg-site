import type { CoachCompletedGame } from "@/lib/treinadores-types";
import type { SumulaCartoesMatch } from "@/lib/futebol-relatorios.types";

export type FutebolGameStatus = "upcoming" | "completed";

export type FutebolGameListItem = {
  gameKey: string;
  status: FutebolGameStatus;
  matchDate: string;
  opponentName: string;
  competition: string | null;
  category: string | null;
  isHome: boolean;
  homeTeam: string;
  awayTeam: string;
  scoreLabel: string;
  result: "V" | "E" | "D" | null;
  hasSumula: boolean;
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
  yellowCards: number;
  redCards: number;
  stadiumName: string | null;
  city: string | null;
  hasCoachReport: boolean;
  incidentCount: number;
  attachmentCount: number;
  possessionPct: number | null;
  setPiecesFor: number | null;
  setPiecesAgainst: number | null;
};

export type FutebolMatchIncident = {
  id: string;
  source: "fmf" | "manual";
  kind: string;
  description: string;
  minute: number | null;
  period: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FutebolMatchAttachment = {
  id: string;
  label: string | null;
  fileUrl: string;
  kind: string | null;
  createdAt: string;
};

export type FutebolGameCoachReport = {
  id: string;
  status: string;
  matchDate: string | null;
  opponentName: string | null;
  teamReport: string | null;
  generalNotes: string | null;
  attachments: Array<{
    id: string;
    label: string | null;
    fileUrl: string;
    kind: string | null;
  }>;
  playerRatings: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    rating: number | null;
    individualReport: string | null;
  }>;
};

export type FutebolMatchStatOverride = {
  goalsFor: number | null;
  goalsAgainst: number | null;
  yellowCards: number | null;
  redCards: number | null;
  possessionPct: number | null;
  setPiecesFor: number | null;
  setPiecesAgainst: number | null;
  notes: string | null;
};

export type FutebolGameDetail = {
  tenant: { id: string; name: string; slug: string };
  game: FutebolGameListItem & CoachCompletedGame;
  sourceUrl: string | null;
  kickoffTime: string | null;
  firstHalfMinutes: number | null;
  secondHalfMinutes: number | null;
  totalMinutes: number | null;
  occurrencesText: string | null;
  statOverrideNotes: string | null;
  matchStatOverride: FutebolMatchStatOverride | null;
  coachReport: FutebolGameCoachReport | null;
  sumulaMatch: SumulaCartoesMatch | null;
  disciplineForMatch: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    yellowCards: number;
    redCards: number;
  }>;
  incidents: FutebolMatchIncident[];
  matchAttachments: FutebolMatchAttachment[];
};

export type FutebolGamesListResponse = {
  tenant: { id: string; name: string; slug: string };
  filters: {
    category: string | null;
    season: number;
    status: string | null;
  };
  games: FutebolGameListItem[];
};

export type JogosStatusFilter = "all" | "upcoming" | "completed" | "with_sumula";

export const JOGOS_STATUS_OPTIONS: Array<{ value: JogosStatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "upcoming", label: "Futuros" },
  { value: "completed", label: "Realizados" },
  { value: "with_sumula", label: "Com súmula" },
];

export const MATCH_INCIDENT_KIND_LABELS: Record<string, string> = {
  atraso: "Atraso",
  briga: "Briga / confusão",
  disciplina: "Disciplina",
  observacao: "Observação",
  acrescimo: "Acréscimo",
  outro: "Outro",
};

export const MATCH_ATTACHMENT_KIND_LABELS: Record<string, string> = {
  sumula: "Súmula",
  correcao: "Correção",
  documento: "Documento",
  outro: "Outro",
};

export const MATCH_INCIDENT_KIND_OPTIONS = [
  { value: "atraso", label: "Atraso" },
  { value: "briga", label: "Briga / confusão" },
  { value: "disciplina", label: "Disciplina" },
  { value: "observacao", label: "Observação" },
  { value: "acrescimo", label: "Acréscimo" },
  { value: "outro", label: "Outro" },
] as const;

export const MATCH_ATTACHMENT_KIND_OPTIONS = [
  { value: "sumula", label: "Súmula" },
  { value: "correcao", label: "Correção" },
  { value: "documento", label: "Documento" },
  { value: "outro", label: "Outro" },
] as const;

export const COACH_ATTACHMENT_KIND_LABELS: Record<string, string> = {
  sumula: "Súmula",
  analista: "Analista",
  scout: "Scout",
  outro: "Outro",
};

export function encodeGameKey(gameKey: string): string {
  return encodeURIComponent(gameKey);
}

export function gameDetailPath(gameKey: string): string {
  return `/dashboard/futebol/jogos/${encodeGameKey(gameKey)}`;
}
