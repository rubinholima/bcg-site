export const PHYSIO_GAME_PHASES = [
  'concentracao',
  'pre_jogo',
  'primeiro_tempo',
  'intervalo',
  'segundo_tempo',
  'pos_jogo',
] as const;

export const PHYSIO_GAME_PHASE_LABEL: Record<(typeof PHYSIO_GAME_PHASES)[number], string> = {
  concentracao: 'Concentração',
  pre_jogo: 'Pré-jogo',
  primeiro_tempo: '1º tempo',
  intervalo: 'Intervalo',
  segundo_tempo: '2º tempo',
  pos_jogo: 'Pós-jogo',
};

export const PHYSIO_GAME_CARE_CATEGORIES = ['tratamento', 'preparo_preventivo'] as const;

export const PHYSIO_GAME_CARE_CATEGORY_LABEL: Record<
  (typeof PHYSIO_GAME_CARE_CATEGORIES)[number],
  string
> = {
  tratamento: 'Tratamento',
  preparo_preventivo: 'Preparo preventivo',
};

export const PHYSIO_GAME_PROCEDURES = [
  'botinha',
  'bandagem_elastica',
  'bandagem_estabilizacao',
  'taping',
  'crioterapia',
  'mobilizacao',
  'alongamento',
  'outro',
] as const;

export const PHYSIO_GAME_PROCEDURE_LABEL: Record<(typeof PHYSIO_GAME_PROCEDURES)[number], string> = {
  botinha: 'Botinha',
  bandagem_elastica: 'Bandagem elástica',
  bandagem_estabilizacao: 'Bandagem de estabilização',
  taping: 'Taping',
  crioterapia: 'Crioterapia',
  mobilizacao: 'Mobilização',
  alongamento: 'Alongamento',
  outro: 'Outro',
};

export const PHYSIO_GAME_TREATMENT_REASONS = [
  'estabilizar',
  'proteger',
  'reforcar_musculatura',
  'limitar_movimento',
] as const;

export const PHYSIO_GAME_TREATMENT_REASON_LABEL: Record<
  (typeof PHYSIO_GAME_TREATMENT_REASONS)[number],
  string
> = {
  estabilizar: 'Estabilizar',
  proteger: 'Proteger',
  reforcar_musculatura: 'Reforçar musculatura',
  limitar_movimento: 'Limitar movimento',
};

export const PHYSIO_GAME_BODY_LOCATIONS = [
  'tornozelo',
  'joelho',
  'adutor',
  'quadril',
  'outro',
] as const;

export const PHYSIO_GAME_BODY_LOCATION_LABEL: Record<
  (typeof PHYSIO_GAME_BODY_LOCATIONS)[number],
  string
> = {
  tornozelo: 'Tornozelo',
  joelho: 'Joelho',
  adutor: 'Adutor',
  quadril: 'Quadril',
  outro: 'Outro',
};

export const PHYSIO_EVAL_CONTEXTS = [
  'pre_temporada',
  'inter_temporada',
  'pos_temporada',
  'desligamento',
] as const;

export const PHYSIO_EVAL_CONTEXT_LABEL: Record<(typeof PHYSIO_EVAL_CONTEXTS)[number], string> = {
  pre_temporada: 'Pré-temporada',
  inter_temporada: 'Inter-temporada',
  pos_temporada: 'Pós-temporada',
  desligamento: 'Desligamento',
};

export const PHYSIO_EVAL_TEST_TYPES = [
  'forca',
  'mobilidade',
  'flexibilidade',
  'equilibrio',
  'salto',
  'resistencia',
  'outro',
] as const;

export const PHYSIO_EVAL_TEST_TYPE_LABEL: Record<(typeof PHYSIO_EVAL_TEST_TYPES)[number], string> = {
  forca: 'Força',
  mobilidade: 'Mobilidade',
  flexibilidade: 'Flexibilidade',
  equilibrio: 'Equilíbrio',
  salto: 'Salto',
  resistencia: 'Resistência',
  outro: 'Outro',
};

export const PHYSIO_EVAL_BODY_LOCATIONS = [
  'quadriceps',
  'isquiotibiais',
  'adutor',
  'panturrilha',
  'tornozelo',
  'joelho',
  'quadril',
  'outro',
] as const;

export const PHYSIO_EVAL_BODY_LOCATION_LABEL: Record<
  (typeof PHYSIO_EVAL_BODY_LOCATIONS)[number],
  string
> = {
  quadriceps: 'Quadríceps',
  isquiotibiais: 'Isquiotibiais',
  adutor: 'Adutor',
  panturrilha: 'Panturrilha',
  tornozelo: 'Tornozelo',
  joelho: 'Joelho',
  quadril: 'Quadril',
  outro: 'Outro',
};

export const PHYSIO_EVAL_OUTCOMES = ['aprovado', 'reprovado'] as const;

export const PHYSIO_EVAL_OUTCOME_LABEL: Record<(typeof PHYSIO_EVAL_OUTCOMES)[number], string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
};
