export type NegotiationInstallmentRow = {
  id: string;
  sequence: number;
  amount: number;
  dueDate: string;
  status: string;
  computedStatus: string;
  settledAt: string | null;
  financeiroLancamentoId: string | null;
};

export type NegotiationDocumentRow = {
  id: string;
  name: string;
  fileUrl: string;
  fileKey: string | null;
  legalDocumentId: string | null;
  uploadedAt: string;
};

export type NegotiationAuditRow = {
  id: string;
  at: string;
  userId: string | null;
  userName: string | null;
  action: string;
  details: unknown;
};

export type PlayerNegotiationFull = {
  id: string;
  tenantId: string;
  playerId: string;
  negotiationType: string;
  status: string;
  counterpartyName: string;
  visitingTeamId: string | null;
  visitingTeam?: { id: string; name: string; logoUrl?: string | null } | null;
  negotiatedPercentage: number | null;
  retainedPercentage: number | null;
  totalValue: number | null;
  currency: string;
  negotiatedAt: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  loanEndDate: string | null;
  hasPurchaseOption: boolean;
  purchaseOptionDeadline: string | null;
  purchaseOptionTerms: string | null;
  futureAcquisitionRights: Record<string, unknown> | null;
  paymentTermsSummary: string | null;
  clauses: string | null;
  notes: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  player: {
    id: string;
    name: string;
    category?: string | null;
    photoUrl?: string | null;
    tenantId: string;
  };
  installments: NegotiationInstallmentRow[];
  documents: NegotiationDocumentRow[];
  auditLogs: NegotiationAuditRow[];
};

export type NegotiationFormState = {
  playerId: string;
  negotiationType: string;
  status: string;
  counterpartyName: string;
  visitingTeamId: string;
  counterpartyMode: "team" | "free";
  negotiatedPercentage: string;
  retainedPercentage: string;
  totalValue: string;
  currency: string;
  negotiatedAt: string;
  effectiveFrom: string;
  effectiveUntil: string;
  loanEndDate: string;
  hasPurchaseOption: boolean;
  purchaseOptionDeadline: string;
  purchaseOptionTerms: string;
  futureAcquisitionRightsJson: string;
  paymentTermsSummary: string;
  clauses: string;
  notes: string;
  responsibleName: string;
};

export function emptyNegotiationForm(initialPlayerId = ""): NegotiationFormState {
  return {
    playerId: initialPlayerId,
    negotiationType: "transfer_permanent",
    status: "in_progress",
    counterpartyName: "",
    visitingTeamId: "",
    counterpartyMode: "free",
    negotiatedPercentage: "",
    retainedPercentage: "",
    totalValue: "",
    currency: "BRL",
    negotiatedAt: new Date().toISOString().slice(0, 10),
    effectiveFrom: "",
    effectiveUntil: "",
    loanEndDate: "",
    hasPurchaseOption: false,
    purchaseOptionDeadline: "",
    purchaseOptionTerms: "",
    futureAcquisitionRightsJson: "",
    paymentTermsSummary: "",
    clauses: "",
    notes: "",
    responsibleName: "",
  };
}

export function negotiationToForm(n: PlayerNegotiationFull): NegotiationFormState {
  const mode = n.visitingTeamId ? "team" : "free";
  let futureJson = "";
  if (n.futureAcquisitionRights && Object.keys(n.futureAcquisitionRights).length > 0) {
    try {
      futureJson = JSON.stringify(n.futureAcquisitionRights, null, 2);
    } catch {
      futureJson = "";
    }
  }
  return {
    playerId: n.playerId,
    negotiationType: n.negotiationType,
    status: n.status,
    counterpartyName: n.counterpartyName,
    visitingTeamId: n.visitingTeamId ?? "",
    counterpartyMode: mode,
    negotiatedPercentage: n.negotiatedPercentage != null ? String(n.negotiatedPercentage) : "",
    retainedPercentage: n.retainedPercentage != null ? String(n.retainedPercentage) : "",
    totalValue: n.totalValue != null ? String(n.totalValue) : "",
    currency: n.currency || "BRL",
    negotiatedAt: n.negotiatedAt ? n.negotiatedAt.slice(0, 10) : "",
    effectiveFrom: n.effectiveFrom ? n.effectiveFrom.slice(0, 10) : "",
    effectiveUntil: n.effectiveUntil ? n.effectiveUntil.slice(0, 10) : "",
    loanEndDate: n.loanEndDate ? n.loanEndDate.slice(0, 10) : "",
    hasPurchaseOption: n.hasPurchaseOption,
    purchaseOptionDeadline: n.purchaseOptionDeadline ? n.purchaseOptionDeadline.slice(0, 10) : "",
    purchaseOptionTerms: n.purchaseOptionTerms ?? "",
    futureAcquisitionRightsJson: futureJson,
    paymentTermsSummary: n.paymentTermsSummary ?? "",
    clauses: n.clauses ?? "",
    notes: n.notes ?? "",
    responsibleName: n.responsibleName ?? "",
  };
}

export function buildNegotiationPayload(
  tenantId: string,
  form: NegotiationFormState,
  isCreate: boolean,
) {
  let futureAcquisitionRights: Record<string, unknown> | null | undefined = undefined;
  if (form.futureAcquisitionRightsJson.trim()) {
    futureAcquisitionRights = JSON.parse(form.futureAcquisitionRightsJson.trim()) as Record<
      string,
      unknown
    >;
  } else if (!isCreate) {
    futureAcquisitionRights = null;
  }

  const counterpartyName =
    form.counterpartyMode === "team" && form.visitingTeamId
      ? form.counterpartyName.trim()
      : form.counterpartyName.trim();

  const base = {
    negotiationType: form.negotiationType,
    status: form.status,
    counterpartyName,
    visitingTeamId:
      form.counterpartyMode === "team" && form.visitingTeamId ? form.visitingTeamId : null,
    negotiatedPercentage: form.negotiatedPercentage ? Number(form.negotiatedPercentage) : null,
    retainedPercentage: form.retainedPercentage ? Number(form.retainedPercentage) : null,
    totalValue: form.totalValue ? Number(form.totalValue) : null,
    currency: form.currency.trim() || "BRL",
    negotiatedAt: form.negotiatedAt || null,
    effectiveFrom: form.effectiveFrom || null,
    effectiveUntil: form.effectiveUntil || null,
    loanEndDate: form.loanEndDate || null,
    hasPurchaseOption: form.hasPurchaseOption,
    purchaseOptionDeadline: form.purchaseOptionDeadline || null,
    purchaseOptionTerms: form.purchaseOptionTerms.trim() || null,
    futureAcquisitionRights,
    paymentTermsSummary: form.paymentTermsSummary.trim() || null,
    clauses: form.clauses.trim() || null,
    notes: form.notes.trim() || null,
    responsibleName: form.responsibleName.trim() || null,
  };

  if (isCreate) {
    return {
      tenantId,
      playerId: form.playerId,
      ...base,
      visitingTeamId: form.counterpartyMode === "team" && form.visitingTeamId ? form.visitingTeamId : undefined,
      negotiatedPercentage: form.negotiatedPercentage ? Number(form.negotiatedPercentage) : undefined,
      retainedPercentage: form.retainedPercentage ? Number(form.retainedPercentage) : undefined,
      totalValue: form.totalValue ? Number(form.totalValue) : undefined,
    };
  }
  return base;
}

export const NEGOTIATION_AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "Negociação criada",
  updated: "Dados atualizados",
  status_change: "Status alterado",
  sync_player_snapshots: "Espelho no cadastro do atleta",
  installments_added: "Parcelas adicionadas",
  installment_updated: "Parcela atualizada",
  financeiro_linked: "Lançamento financeiro vinculado",
  document_added: "Documento adicionado",
};
