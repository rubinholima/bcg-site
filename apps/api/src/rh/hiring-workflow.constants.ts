/** Fluxo de contratação CUP360 RH — etapas canônicas (PROMPT 053). */
export const HIRING_STATUS = {
  DRAFT: 'rascunho',
  SUBMITTED: 'solicitacao_recebida',
  DOCS_REVIEW: 'docs_conferencia',
  DOCS_PENDING: 'docs_pendentes',
  MEDICAL_PENDING: 'exame_pendente',
  MEDICAL_SCHEDULED: 'exame_agendado',
  MEDICAL_DONE: 'exame_realizado',
  LEGAL_FORWARDED: 'encaminhado_juridico',
  LEGAL_REVIEW: 'juridico_analise',
  READY_ACCOUNTING: 'pronto_contabilidade',
  SENT_ACCOUNTING: 'enviado_contabilidade',
  AWAITING_ACCOUNTING: 'aguardando_contabilidade',
  CORRECTION_REQUESTED: 'correcao_solicitada',
  ACCOUNTING_RETURN: 'retorno_contabilidade',
  READY_ADMISSION: 'pronto_admissao',
  COMPLETED: 'concluido',
  CANCELLED: 'cancelado',
} as const;

export type HiringStatus = (typeof HIRING_STATUS)[keyof typeof HIRING_STATUS];

export const HIRING_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  solicitacao_recebida: 'Solicitação recebida',
  docs_conferencia: 'Documentos em conferência',
  docs_pendentes: 'Documentos pendentes',
  exame_pendente: 'Exame admissional pendente',
  exame_agendado: 'Exame agendado',
  exame_realizado: 'Exame realizado',
  encaminhado_juridico: 'Encaminhado ao Jurídico',
  juridico_analise: 'Análise jurídica',
  pronto_contabilidade: 'Pronto para Contabilidade',
  enviado_contabilidade: 'Enviado à Contabilidade',
  aguardando_contabilidade: 'Aguardando Contabilidade',
  correcao_solicitada: 'Correção solicitada',
  retorno_contabilidade: 'Retorno da Contabilidade recebido',
  pronto_admissao: 'Pronto para admissão',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

/** CLT: fluxo operacional com exame e contabilidade detalhada. */
export const CLT_STATUS_FLOW: HiringStatus[] = [
  HIRING_STATUS.DRAFT,
  HIRING_STATUS.SUBMITTED,
  HIRING_STATUS.DOCS_REVIEW,
  HIRING_STATUS.DOCS_PENDING,
  HIRING_STATUS.MEDICAL_PENDING,
  HIRING_STATUS.MEDICAL_SCHEDULED,
  HIRING_STATUS.MEDICAL_DONE,
  HIRING_STATUS.READY_ACCOUNTING,
  HIRING_STATUS.SENT_ACCOUNTING,
  HIRING_STATUS.AWAITING_ACCOUNTING,
  HIRING_STATUS.CORRECTION_REQUESTED,
  HIRING_STATUS.ACCOUNTING_RETURN,
  HIRING_STATUS.READY_ADMISSION,
  HIRING_STATUS.COMPLETED,
];

/** PJ: inclui jurídico; pula etapas médicas. */
export const PJ_STATUS_FLOW: HiringStatus[] = [
  HIRING_STATUS.DRAFT,
  HIRING_STATUS.SUBMITTED,
  HIRING_STATUS.DOCS_REVIEW,
  HIRING_STATUS.DOCS_PENDING,
  HIRING_STATUS.LEGAL_FORWARDED,
  HIRING_STATUS.LEGAL_REVIEW,
  HIRING_STATUS.READY_ACCOUNTING,
  HIRING_STATUS.SENT_ACCOUNTING,
  HIRING_STATUS.AWAITING_ACCOUNTING,
  HIRING_STATUS.CORRECTION_REQUESTED,
  HIRING_STATUS.ACCOUNTING_RETURN,
  HIRING_STATUS.READY_ADMISSION,
  HIRING_STATUS.COMPLETED,
];

const LEGACY_STATUS_MAP: Record<string, HiringStatus> = {
  enviado: HIRING_STATUS.SUBMITTED,
  analise_rh: HIRING_STATUS.DOCS_REVIEW,
  documentacao_pendente: HIRING_STATUS.DOCS_PENDING,
  exame_concluido: HIRING_STATUS.MEDICAL_DONE,
  juridico: HIRING_STATUS.LEGAL_REVIEW,
  contabilidade: HIRING_STATUS.SENT_ACCOUNTING,
  contrato_pendente: HIRING_STATUS.READY_ADMISSION,
  admitido: HIRING_STATUS.COMPLETED,
};

export function normalizeHiringStatus(status: string): HiringStatus {
  const s = status.trim();
  if (LEGACY_STATUS_MAP[s]) return LEGACY_STATUS_MAP[s];
  return s as HiringStatus;
}

export function flowForContractType(contractType: string): HiringStatus[] {
  const t = contractType.trim().toUpperCase();
  if (t === 'PJ') return PJ_STATUS_FLOW;
  return CLT_STATUS_FLOW;
}

export function canTransition(
  contractType: string,
  from: string,
  to: string,
): boolean {
  const toNorm = normalizeHiringStatus(to);
  if (toNorm === HIRING_STATUS.CANCELLED) return true;
  const fromNorm = normalizeHiringStatus(from);
  const flow = flowForContractType(contractType);
  const fromIdx = flow.indexOf(fromNorm);
  const toIdx = flow.indexOf(toNorm);
  if (fromIdx < 0 || toIdx < 0) return false;
  if (toNorm === fromNorm) return true;
  if (toIdx === fromIdx + 1) return true;
  if (
    fromNorm === HIRING_STATUS.CORRECTION_REQUESTED &&
    (toNorm === HIRING_STATUS.SENT_ACCOUNTING || toNorm === HIRING_STATUS.AWAITING_ACCOUNTING)
  ) {
    return true;
  }
  return false;
}

export const HIRING_ACTIVE_STATUSES: string[] = [
  HIRING_STATUS.SUBMITTED,
  HIRING_STATUS.DOCS_REVIEW,
  HIRING_STATUS.DOCS_PENDING,
  HIRING_STATUS.MEDICAL_PENDING,
  HIRING_STATUS.MEDICAL_SCHEDULED,
  HIRING_STATUS.MEDICAL_DONE,
  HIRING_STATUS.LEGAL_FORWARDED,
  HIRING_STATUS.LEGAL_REVIEW,
  HIRING_STATUS.READY_ACCOUNTING,
  HIRING_STATUS.SENT_ACCOUNTING,
  HIRING_STATUS.AWAITING_ACCOUNTING,
  HIRING_STATUS.CORRECTION_REQUESTED,
  HIRING_STATUS.ACCOUNTING_RETURN,
  HIRING_STATUS.READY_ADMISSION,
];
