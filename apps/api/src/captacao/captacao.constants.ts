/** Responsável pelo agendamento de avaliações (captação). */
export const CAPTACAO_SCHEDULER_PHONE = '33984133636';

/** E-mail operacional do gerente — use resolveCaptacaoManagerEmail() em captacao-notify.util.ts */

/** Decisão do gerente sobre prospect encaminhado (fluxo supervisor). */
export const CAPTACAO_MANAGER_DECISIONS = [
  'pendente',
  'aprovado',
  'reprovado',
  'ajuste',
] as const;

export type CaptacaoManagerDecision = (typeof CAPTACAO_MANAGER_DECISIONS)[number];

export const SCOUTING_EVALUATION_OUTCOMES = [
  'pendente',
  'aprovado',
  'para_teste',
] as const;

export type ScoutingEvaluationOutcome = (typeof SCOUTING_EVALUATION_OUTCOMES)[number];

export const SCOUTING_EVALUATION_OUTCOME_LABELS: Record<ScoutingEvaluationOutcome, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  para_teste: 'Para teste / try-out',
};

/** Status operacional do agendamento / avaliação no CT */
export const CT_SCHEDULE_STATUSES = [
  'nao_agendado',
  'agendado',
  'faltou',
  'compareceu',
  'em_avaliacao',
  'concluido',
] as const;

export type CtScheduleStatus = (typeof CT_SCHEDULE_STATUSES)[number];

export const CT_SCHEDULE_STATUS_LABELS: Record<CtScheduleStatus, string> = {
  nao_agendado: 'Não agendado',
  agendado: 'Agendado',
  faltou: 'Faltou — reagendar',
  compareceu: 'Compareceu',
  em_avaliacao: 'Em avaliação CT',
  concluido: 'Concluído',
};

export const SCOUTING_RATING_MIN = 0;
export const SCOUTING_RATING_MAX = 10;
