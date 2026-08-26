/** Responsável pelo agendamento de avaliações (captação). */
export const CAPTACAO_SCHEDULER_PHONE = '33984133636';

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

export const SCOUTING_RATING_MIN = 0;
export const SCOUTING_RATING_MAX = 10;
