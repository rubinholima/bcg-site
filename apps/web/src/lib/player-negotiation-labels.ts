export const NEGOTIATION_TYPE_LABELS: Record<string, string> = {
  transfer_permanent: "Transferência definitiva",
  loan: "Empréstimo",
  partial_rights: "Direitos econômicos parciais",
  mixed: "Negociação mista",
};

export const NEGOTIATION_STATUS_LABELS: Record<string, string> = {
  in_progress: "Em negociação",
  agreed: "Acordada",
  effective: "Efetivada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

export const NEGOTIATION_TYPES = Object.keys(NEGOTIATION_TYPE_LABELS);
export const NEGOTIATION_STATUSES = Object.keys(NEGOTIATION_STATUS_LABELS);

export function formatNegotiationMoney(value: number | null | undefined, currency = "BRL") {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}
