export type AthleteContractHubSummary = {
  athleteSituation: string;
  federativeSituation: string;
  professionalSituation?: string;
  primaryContractId: string | null;
  primaryContractType: string | null;
  primaryStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  daysUntilExpiry: number | null;
  signatureStatus: string | null;
  pendingItems: string[];
  financialPendingCount?: number | null;
  documentPendingCount?: number;
  responsibleUserId: string | null;
};

export type AthleteContractHubDto = {
  summary: AthleteContractHubSummary;
  evaluation: Record<string, unknown> | null;
  federative: Record<string, unknown> | null;
  contracts: Array<Record<string, unknown>>;
  professionalizations: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  financeLinks?: Array<Record<string, unknown>>;
  access?: { canViewFinancial?: boolean; canManage?: boolean; canManageTypes?: boolean };
};

export const DOCUMENT_CATEGORIES = [
  { value: "PERSONAL", label: "Pessoal" },
  { value: "FEDERATIVE", label: "Federativo" },
  { value: "CONTRACTUAL", label: "Contratual" },
  { value: "PROFESSIONAL_RH", label: "Profissional / RH" },
  { value: "FINANCIAL", label: "Financeiro" },
  { value: "OTHER", label: "Outro" },
] as const;

export const REPORT_PRESETS = [
  { id: "expiring_30", label: "Vencendo em 30 dias", expirationWindowDays: 30 },
  { id: "expiring_60", label: "Vencendo em 60 dias", expirationWindowDays: 60 },
  { id: "expiring_90", label: "Vencendo em 90 dias", expirationWindowDays: 90 },
  { id: "expired", label: "Vencidos", preset: "expired" },
  { id: "no_active_contract", label: "Sem contrato ativo", preset: "no_active_contract" },
  { id: "awaiting_signature", label: "Aguardando assinatura", preset: "awaiting_signature" },
  { id: "awaiting_federation", label: "Aguardando federação", preset: "awaiting_federation" },
  { id: "professional", label: "Profissionais", preset: "professional" },
  { id: "formation", label: "Formação", preset: "formation" },
  { id: "agent_intermediary", label: "Agente/intermediário", preset: "agent_intermediary" },
  { id: "partner_club", label: "Clube parceiro", preset: "partner_club" },
] as const;

export async function uploadAthleteContractDocument(
  playerId: string,
  form: FormData,
): Promise<void> {
  const res = await fetch(`/api/players/${playerId}/athlete-contract-documents`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Falha ao enviar documento.");
  }
}

export function athleteContractDocumentFileUrl(playerId: string, attachmentId: string): string {
  return `/api/players/${playerId}/athlete-contract-documents/${attachmentId}/file`;
}
