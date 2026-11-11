export const FINANCE_LINK_TYPES = [
  { value: "federation_fee", label: "Taxa federativa" },
  { value: "transfer_fee", label: "Taxa de transferência" },
  { value: "allowance", label: "Ajuda de custo" },
  { value: "salary_reference", label: "Salário" },
  { value: "contractual_payment", label: "Pagamento contratual" },
  { value: "other", label: "Outro" },
] as const;

export const FINANCE_LINK_STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export function financeLinkTypeLabel(code: string): string {
  return FINANCE_LINK_TYPES.find((t) => t.value === code)?.label ?? code;
}

export function financeiroLancamentoHref(tenantId: string, lancamentoId: string): string {
  return `/dashboard/adm/financeiro?tenantId=${encodeURIComponent(tenantId)}&lancamentoId=${encodeURIComponent(lancamentoId)}`;
}

export type AthleteFinanceLinkRow = {
  id: string;
  linkType: string;
  description?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  contractId?: string | null;
  federativeProcessId?: string | null;
  financeiroLancamentoId?: string | null;
  omieReference?: string | null;
  referenceId?: string | null;
};

export type AthleteFinancialSummary = {
  totalLinks: number;
  pendingCount: number;
  paidCount: number;
  federationFees: number;
  transferFees: number;
  allowances: number;
  salaryReferences: number;
  contractualPayments: number;
};
