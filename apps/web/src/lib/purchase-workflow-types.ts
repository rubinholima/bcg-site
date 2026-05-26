export const REQUISITION_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_cotacao: "Em cotação",
  aguardando_financeiro: "Aguardando financeiro",
  aguardando_diretoria: "Aguardando diretoria",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
  em_compra: "Em compra",
  recebida_compras: "Recebida (Compras)",
  aguardando_assinatura: "Aguardando assinatura",
  concluida: "Concluída",
};

export const TI_TICKET_STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export const TI_PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export interface PurchaseQuoteRow {
  id: string;
  requisitionId: string;
  supplierId: string | null;
  supplierName: string;
  items: unknown;
  totalAmount: number;
  deliveryDays: number | null;
  notes: string | null;
  isWinner: boolean;
  supplier?: { id: string; name: string; email?: string | null };
}

export interface PurchaseApprovalRow {
  id: string;
  role: string;
  approverName: string;
  decision: string;
  notes: string | null;
  decidedAt: string;
}

export interface PurchaseRequisitionWorkflowRow {
  id: string;
  tenantId: string;
  requestedByUserId: string | null;
  requestedByName: string;
  requestedAt: string;
  requestType: string;
  departmentName: string | null;
  status: string;
  justification: string | null;
  items: unknown;
  totalEstimated: number | null;
  approvedTotal: number | null;
  selectedQuoteId: string | null;
  isPatrimonial: boolean;
  rejectionReason: string | null;
  requesterEmail: string | null;
  tenant: { id: string; name: string; slug: string };
  quotes?: PurchaseQuoteRow[];
  selectedQuote?: PurchaseQuoteRow | null;
  approvals?: PurchaseApprovalRow[];
  receipt?: {
    id: string;
    signatureStatus: string;
    signerEmail: string | null;
    signedAt: string | null;
    metadata?: { signingUrl?: string } | null;
  } | null;
  purchaseOrders?: Array<{ id: string; orderNumber: string | null; status: string }>;
}

export interface TiSupportTicketRow {
  id: string;
  tenantId: string;
  requestedByName: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  assignedToName: string | null;
  createdAt: string;
  tenant: { id: string; name: string; slug: string };
}

export interface PurchaseSettingsRow {
  tenantId: string;
  approvalThresholdBrl: number;
  minQuotes: number;
  maxQuotes: number;
  comprasNotifyEmail?: string | null;
  comprasNotifyPhone?: string | null;
  financeiroNotifyEmail?: string | null;
  financeiroNotifyPhone?: string | null;
  tiNotifyEmail?: string | null;
  tiNotifyPhone?: string | null;
  diretoriaNotifyEmail?: string | null;
  diretoriaNotifyPhone?: string | null;
}

export interface PurchaseSettingsSummaryRow extends PurchaseSettingsRow {
  tenantName: string;
  tenantSlug: string;
  hasSavedSettings?: boolean;
}

export function statusBadgeClass(status: string): string {
  if (status === "concluida" || status === "aprovada") return "text-green-600 dark:text-green-400";
  if (status.startsWith("aguardando") || status === "em_cotacao" || status === "em_compra")
    return "text-amber-600 dark:text-amber-400";
  if (status === "reprovada") return "text-destructive";
  return "text-muted-foreground";
}
