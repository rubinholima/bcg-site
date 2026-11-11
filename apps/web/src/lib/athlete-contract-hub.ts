export type AthleteContractHubSummary = {
  athleteSituation: string;
  federativeSituation: string;
  primaryContractId: string | null;
  primaryContractType: string | null;
  primaryStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  daysUntilExpiry: number | null;
  signatureStatus: string | null;
  pendingItems: string[];
  responsibleUserId: string | null;
};

export type AthleteContractHubDto = {
  summary: AthleteContractHubSummary;
  evaluation: Record<string, unknown> | null;
  federative: Record<string, unknown> | null;
  contracts: Array<Record<string, unknown>>;
  professionalizations: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
};

export const REPORT_PRESETS = [
  { id: "expiring_30", label: "Vencendo em 30 dias", expirationWindowDays: 30 },
  { id: "expiring_60", label: "Vencendo em 60 dias", expirationWindowDays: 60 },
  { id: "expiring_90", label: "Vencendo em 90 dias", expirationWindowDays: 90 },
  { id: "expired", label: "Vencidos", preset: "expired" },
  { id: "awaiting_signature", label: "Aguardando assinatura", preset: "awaiting_signature" },
] as const;
