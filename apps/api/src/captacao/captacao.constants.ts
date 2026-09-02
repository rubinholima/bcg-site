/** Responsável pelo agendamento de avaliações (captação). */
export const CAPTACAO_SCHEDULER_PHONE = '33984133636';

/** Gerente que aprova prospects encaminhados (ex.: Odair) — env CAPTACAO_MANAGER_EMAIL */
export const CAPTACAO_MANAGER_EMAIL =
  process.env.CAPTACAO_MANAGER_EMAIL?.trim() || '';

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
