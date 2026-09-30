export const TRYOUT_REFERRAL_SOURCES = [
  'agente',
  'clube_parceiro',
  'escola_parceira',
  'boston_academy',
  'captacao',
  'indicacao_parceira',
  'gestao_diretoria',
  'outro',
] as const;

export const TRYOUT_DIRECT_ENTRY_SOURCES = [
  'indicacao_parceira',
  'clube_parceiro',
  'agente',
  'gestao_diretoria',
  'outro',
] as const;

export const TRYOUT_DOCUMENT_TYPES = [
  'identidade',
  'autorizacao_responsavel',
  'outro',
] as const;

export type TryoutProspectDocumentType = (typeof TRYOUT_DOCUMENT_TYPES)[number];

export const TRYOUT_BLOCKING_DOCUMENT_TYPES = ['identidade', 'autorizacao_responsavel'] as const;

export const TRYOUT_COACH_OUTCOMES = ['aprovado', 'reprovado', 'mais_uma_semana'] as const;
export type TryoutCoachOutcome = (typeof TRYOUT_COACH_OUTCOMES)[number];

export const COACHING_STAFF_ROLES = [
  'tecnico',
  'auxiliar_tecnico',
  'treinador_goleiros',
  'preparador_fisico',
  'analista_desempenho',
] as const;

export type TryoutReferralSource = (typeof TRYOUT_REFERRAL_SOURCES)[number];

export const TRYOUT_REFERRAL_SOURCE_LABELS: Record<TryoutReferralSource, string> = {
  agente: 'Agente / representante',
  clube_parceiro: 'Clube parceiro',
  escola_parceira: 'Escola de futebol parceira',
  boston_academy: 'Boston Academy',
  captacao: 'Captação / scouting',
  indicacao_parceira: 'Indicação',
  gestao_diretoria: 'Gestão / Diretoria',
  outro: 'Outro',
};

export const TRYOUT_WORKFLOW_STAGES = [
  'aguardando_supervisao',
  'aguardando_fisio',
  'liberado_campo',
  'em_avaliacao_campo',
  'aguardando_treinador',
  'aguardando_gerencia',
  'aprovado_documentacao',
  'reprovado',
  'concluido',
] as const;

export type TryoutWorkflowStage = (typeof TRYOUT_WORKFLOW_STAGES)[number];

export const TRYOUT_WORKFLOW_STAGE_LABELS: Record<TryoutWorkflowStage, string> = {
  aguardando_supervisao: 'Aguardando supervisão',
  aguardando_fisio: 'Aguardando fisioterapia',
  liberado_campo: 'Liberado para campo',
  em_avaliacao_campo: 'Em avaliação de campo',
  aguardando_treinador: 'Aguardando treinador',
  aguardando_gerencia: 'Aguardando gerência',
  aprovado_documentacao: 'Aprovado — documentação',
  reprovado: 'Reprovado',
  concluido: 'Concluído (elenco)',
};

export const TRYOUT_REG_STATUSES = ['pendente', 'em_andamento', 'concluido'] as const;
export type TryoutRegStatus = (typeof TRYOUT_REG_STATUSES)[number];

export const TRYOUT_FEDERATION_STATUSES = ['na', 'pendente', 'em_andamento', 'concluido'] as const;

export const TRYOUT_EVALUATION_DAYS_DEFAULT = 7;

export const TRYOUT_COACH_RATING_MIN = 0;
export const TRYOUT_COACH_RATING_MAX = 5;

export function isProspectInTryoutWorkflow(prospect: {
  tryoutWorkflowStage?: string | null;
  stage?: string;
  evaluationOutcome?: string | null;
  flowPath?: string | null;
  tryoutWorkflowActivatedAt?: Date | null;
}): boolean {
  if (prospect.tryoutWorkflowActivatedAt) return true;
  if (prospect.tryoutWorkflowStage) return true;
  if (prospect.stage === 'tryout' && prospect.tryoutWorkflowStage) return true;
  if (prospect.evaluationOutcome === 'para_teste' && prospect.tryoutWorkflowActivatedAt) return true;
  return false;
}

/** Registros antigos flowPath=tryout sem workflow real — revisão manual. */
export function isLegacyTryoutReviewRecord(prospect: {
  flowPath?: string | null;
  tryoutWorkflowActivatedAt?: Date | null;
  tryoutWorkflowStage?: string | null;
  tryoutPeriodStartedAt?: Date | null;
}): boolean {
  return (
    prospect.flowPath === 'tryout' &&
    !prospect.tryoutWorkflowActivatedAt &&
    !prospect.tryoutWorkflowStage &&
    !prospect.tryoutPeriodStartedAt
  );
}

export function isTryoutAwaitingArrival(prospect: {
  flowPath?: string | null;
  arrivalAt?: Date | null;
  tryoutWorkflowActivatedAt?: Date | null;
}): boolean {
  return prospect.flowPath === 'tryout' && !prospect.arrivalAt && !prospect.tryoutWorkflowActivatedAt;
}
