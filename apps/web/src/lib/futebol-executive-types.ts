export type ExecutiveSeverity = "critical" | "attention" | "info";

export type ExecutiveActionItem = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  severity: ExecutiveSeverity;
  status?: string;
  dueAt?: string;
  createdAt?: string;
  actionUrl: string;
  moduleRequired?: string;
};

export type ExecutiveKpi = {
  id: string;
  label: string;
  value: number;
  breakdown?: Record<string, number>;
  href?: string;
};

export type ExecutiveSquadSummary = {
  total: number;
  byCategory: Record<string, number>;
  bySituation: Record<string, number>;
  byStatus: Record<string, number>;
  suspended: number;
  nearSuspension: number;
};

export type ExecutiveCaptacaoSummary = {
  active: number;
  byCtStatus: Record<string, number>;
  physioPending: number;
  physioRejected: number;
  supervisorApprovalPending: number;
  awaitingSchedule: number;
  items: ExecutiveActionItem[];
};

export type ExecutiveHealthSummary = {
  unavailable: number;
  activePhysio: number;
  inTransition: number;
  medicalDeparturesOpen: number;
  medicalDeparturesOverdue: number;
  periodicEvaluationsAttention: number;
  tryoutClearancePending: number;
  tryoutClearanceRejected: number;
};

export type ExecutivePerformanceSummary = {
  available: number;
  unavailable: number;
  pendingCoachEvaluations: number;
  activeTransitions: number;
};

export type ExecutiveContractsSummary = {
  expiringSoon: number;
  expired: number;
  pendingSignature: number;
  registrationPending: number;
};

export type ExecutiveLogisticsSummary = {
  upcoming: number;
  incompleteConvocation: number;
  items: ExecutiveActionItem[];
};

export type ExecutiveAgendaItem = {
  id: string;
  type: string;
  title: string;
  startAt: string;
  endAt?: string;
  category?: string;
  actionUrl?: string;
};

export type ExecutiveFinanceSummary = {
  pendingFinanceiroApprovals: number;
  pendingDiretoriaApprovals: number;
  lancamentosPendentes?: number;
  lancamentosVencidos?: number;
};

export type ExecutiveQuickAction = {
  label: string;
  href: string;
  moduleSlug: string;
};

export type ExecutiveDashboardDto = {
  generatedAt: string;
  filters: { tenantId?: string; category?: string; periodDays: number };
  modules: string[];
  kpis: ExecutiveKpi[];
  decisions: ExecutiveActionItem[];
  alerts: ExecutiveActionItem[];
  squad: ExecutiveSquadSummary | null;
  captacao: ExecutiveCaptacaoSummary | null;
  health: ExecutiveHealthSummary | null;
  performance: ExecutivePerformanceSummary | null;
  contracts: ExecutiveContractsSummary | null;
  logistics: ExecutiveLogisticsSummary | null;
  agenda: ExecutiveAgendaItem[];
  finance: ExecutiveFinanceSummary | null;
  quickActions: ExecutiveQuickAction[];
};

export type TenantOption = { id: string; name: string };
