export const TRAINING_SESSION_DOMAIN = {
  COMISSAO: 'comissao_tecnica',
  PREP: 'preparacao_fisica',
} as const;

export type TrainingSessionDomain =
  (typeof TRAINING_SESSION_DOMAIN)[keyof typeof TRAINING_SESSION_DOMAIN];

export const TRAINING_LOCATION = ['field', 'gym'] as const;
export type TrainingLocation = (typeof TRAINING_LOCATION)[number];
