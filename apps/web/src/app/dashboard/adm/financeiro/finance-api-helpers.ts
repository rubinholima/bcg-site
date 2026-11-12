export function extractFinanceError(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(" ");
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Não foi possível concluir a operação.";
}

const TIMELINE_LABELS: Record<string, string> = {
  created: "Criado",
  edited: "Editado",
  document_attached: "Documento anexado",
  document_replaced: "Documento substituído",
  approved: "Aprovado para pagamento",
  installments_generated: "Parcelas geradas",
  installment_due_changed: "Parcela alterada",
  payment_account_override: "Conta de pagamento alterada",
  settled: "Baixa registrada",
  manual_settlement: "Baixa manual registrada",
  proof_attached: "Comprovante anexado",
  reconciled: "Conciliado",
  cancelled: "Cancelado",
  payroll_deduction_scheduled: "Programado para folha",
  payroll_deduction_cancelled: "Desconto em folha cancelado",
  payroll_deduction_confirmed: "Desconto em folha confirmado",
};

export function timelineEventLabel(type: string): string {
  return TIMELINE_LABELS[type] ?? type;
}

export const PAYROLL_STATUS_LABELS: Record<string, string> = {
  none: "—",
  scheduled: "Programado para folha",
  linked: "Incluído na folha",
  included: "Incluído na folha",
  confirmed: "Recebido/confirmado",
  cancelled: "Cancelado",
};

export const RECONCILIATION_LABELS: Record<string, string> = {
  not_reconciled: "Não conciliado",
  reconciled: "Conciliado",
  exception: "Divergência",
};
