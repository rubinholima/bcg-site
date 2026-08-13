export type PsychologySessionType = "presencial" | "grupo" | "relatorio_semanal";

export type PsychologyAttendanceRow = {
  playerId: string;
  playerName?: string;
  present?: boolean;
  individualNotes?: string;
};

export interface PsychologySession {
  id: string;
  tenantId: string;
  sessionType: PsychologySessionType;
  date: string;
  time?: string | null;
  endTime?: string | null;
  category?: string | null;
  playerId?: string | null;
  psychologistId?: string | null;
  estagiarioId?: string | null;
  psychologistName?: string | null;
  estagiarioName?: string | null;
  location?: string | null;
  status: string;
  notes?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  categoriesLabel?: string | null;
  activities?: string | null;
  individualDemands?: string | null;
  weeklyDevelopment?: string | null;
  identifiedDemands?: string | null;
  nextWeekPlanning?: string | null;
  finalSummary?: string | null;
  generalNotes?: string | null;
  groupSummary?: string | null;
  attendance?: PsychologyAttendanceRow[] | null;
  footballAgendaEntryId?: string | null;
  isPrivate?: boolean;
  durationSeconds?: number | null;
  tenant?: { id: string; name: string; slug: string };
}

export const PSYCH_SESSION_TYPE_LABEL: Record<PsychologySessionType, string> = {
  presencial: "Presencial",
  grupo: "Grupo (categoria)",
  relatorio_semanal: "Relatório semanal",
};
