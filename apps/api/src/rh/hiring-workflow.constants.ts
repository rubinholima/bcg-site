/** Fluxo de contratação CUP360 RH — etapas canônicas. */
export const HIRING_STATUS = {
  DRAFT: 'rascunho',
  SUBMITTED: 'enviado',
  HR_ANALYSIS: 'analise_rh',
  DOCS_PENDING: 'documentacao_pendente',
  MEDICAL_SCHEDULED: 'exame_agendado',
  MEDICAL_DONE: 'exame_concluido',
  LEGAL_REVIEW: 'juridico',
  ACCOUNTING: 'contabilidade',
  CONTRACT_PENDING: 'contrato_pendente',
  ADMITTED: 'admitido',
  CANCELLED: 'cancelado',
} as const;

export type HiringStatus = (typeof HIRING_STATUS)[keyof typeof HIRING_STATUS];

/** CLT: exige exame admissional antes do jurídico. */
export const CLT_STATUS_FLOW: HiringStatus[] = [
  HIRING_STATUS.DRAFT,
  HIRING_STATUS.SUBMITTED,
  HIRING_STATUS.HR_ANALYSIS,
  HIRING_STATUS.DOCS_PENDING,
  HIRING_STATUS.MEDICAL_SCHEDULED,
  HIRING_STATUS.MEDICAL_DONE,
  HIRING_STATUS.LEGAL_REVIEW,
  HIRING_STATUS.ACCOUNTING,
  HIRING_STATUS.CONTRACT_PENDING,
  HIRING_STATUS.ADMITTED,
];

/** PJ: pula etapas médicas. */
export const PJ_STATUS_FLOW: HiringStatus[] = [
  HIRING_STATUS.DRAFT,
  HIRING_STATUS.SUBMITTED,
  HIRING_STATUS.HR_ANALYSIS,
  HIRING_STATUS.DOCS_PENDING,
  HIRING_STATUS.LEGAL_REVIEW,
  HIRING_STATUS.ACCOUNTING,
  HIRING_STATUS.CONTRACT_PENDING,
  HIRING_STATUS.ADMITTED,
];

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
  if (to === HIRING_STATUS.CANCELLED) return true;
  const flow = flowForContractType(contractType);
  const fromIdx = flow.indexOf(from as HiringStatus);
  const toIdx = flow.indexOf(to as HiringStatus);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1 || to === from;
}

export const HIRING_ACTIVE_STATUSES: string[] = [
  HIRING_STATUS.SUBMITTED,
  HIRING_STATUS.HR_ANALYSIS,
  HIRING_STATUS.DOCS_PENDING,
  HIRING_STATUS.MEDICAL_SCHEDULED,
  HIRING_STATUS.MEDICAL_DONE,
  HIRING_STATUS.LEGAL_REVIEW,
  HIRING_STATUS.ACCOUNTING,
  HIRING_STATUS.CONTRACT_PENDING,
];
