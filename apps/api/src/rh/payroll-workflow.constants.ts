export const PAYROLL_STATUS = {
  PREPARING: 'em_preparacao',
  REVIEW: 'em_conferencia',
  READY_ACCOUNTING: 'pronto_contabilidade',
  SENT_ACCOUNTING: 'enviado_contabilidade',
  AWAITING_RETURN: 'aguardando_retorno',
  RETURN_RECEIVED: 'retorno_recebido',
  RH_APPROVED: 'aprovado_rh',
  SENT_FINANCE: 'encaminhado_financeiro',
  COMPLETED: 'concluido',
  CORRECTION: 'correcao_necessaria',
  REOPENED: 'reaberto',
  CANCELLED: 'cancelado',
} as const;

export type PayrollStatus = (typeof PAYROLL_STATUS)[keyof typeof PAYROLL_STATUS];

export const PAYROLL_STATUS_LABELS: Record<string, string> = {
  em_preparacao: 'Em preparação',
  em_conferencia: 'Em conferência',
  pronto_contabilidade: 'Pronto para Contabilidade',
  enviado_contabilidade: 'Enviado à Contabilidade',
  aguardando_retorno: 'Aguardando retorno',
  retorno_recebido: 'Retorno recebido',
  aprovado_rh: 'Aprovado pelo RH',
  encaminhado_financeiro: 'Encaminhado ao Financeiro',
  concluido: 'Concluído',
  correcao_necessaria: 'Correção necessária',
  reaberto: 'Reaberto',
  cancelado: 'Cancelado',
};

export const PAYROLL_STATUS_FLOW: PayrollStatus[] = [
  PAYROLL_STATUS.PREPARING,
  PAYROLL_STATUS.REVIEW,
  PAYROLL_STATUS.READY_ACCOUNTING,
  PAYROLL_STATUS.SENT_ACCOUNTING,
  PAYROLL_STATUS.AWAITING_RETURN,
  PAYROLL_STATUS.RETURN_RECEIVED,
  PAYROLL_STATUS.RH_APPROVED,
  PAYROLL_STATUS.SENT_FINANCE,
  PAYROLL_STATUS.COMPLETED,
];

export function canTransitionPayroll(from: string, to: string): boolean {
  const toNorm = to.trim();
  if (toNorm === PAYROLL_STATUS.CANCELLED || toNorm === PAYROLL_STATUS.REOPENED) return true;
  if (toNorm === PAYROLL_STATUS.CORRECTION) return true;
  const fromIdx = PAYROLL_STATUS_FLOW.indexOf(from as PayrollStatus);
  const toIdx = PAYROLL_STATUS_FLOW.indexOf(toNorm as PayrollStatus);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1 || toNorm === from;
}
