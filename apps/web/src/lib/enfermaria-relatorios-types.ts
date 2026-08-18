export interface NursingReportsSummary {
  total: number;
  active: number;
  completed: number;
  uniquePlayers: number;
  avgEstimatedDays: number | null;
}

export interface NursingReportsDashboard {
  summary: NursingReportsSummary;
  byCategory: Array<{ category: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byDiagnosis: Array<{ label: string; count: number }>;
  byTreatment: Array<{ label: string; count: number }>;
  byNurse: Array<{ nurseName: string; count: number }>;
  byMonth: Array<{ month: string; count: number }>;
  sessions: Array<{
    id: string;
    attendedAt: string;
    status: string;
    category: string | null;
    playerId: string;
    playerName: string;
    tenantName: string;
    nurseName: string | null;
    symptoms: string | null;
    estimatedDays: number | null;
    estimatedEndDate: string | null;
    diagnoses: string[];
    treatments: string[];
  }>;
}

export const NURSING_STATUS_LABEL: Record<string, string> = {
  active: "Em tratamento",
  completed: "Alta",
  cancelled: "Cancelado",
  all: "Todos",
};

export function defaultNursingReportPeriod() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}
