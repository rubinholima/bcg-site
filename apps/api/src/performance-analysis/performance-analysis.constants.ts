export const ANALYSIS_SESSION_KINDS = ['MATCH', 'TRAINING', 'OPPONENT', 'OTHER'] as const;
export type AnalysisSessionKind = (typeof ANALYSIS_SESSION_KINDS)[number];

export const ANALYSIS_VIDEO_SOURCE_TYPES = ['UPLOAD', 'YOUTUBE', 'EXTERNAL_URL'] as const;
export type AnalysisVideoSourceType = (typeof ANALYSIS_VIDEO_SOURCE_TYPES)[number];

export const ANALYSIS_EVENT_SOURCES = ['MANUAL', 'LIVE', 'IMPORTED'] as const;

export const DEFAULT_ANALYSIS_TAGS: Array<{
  key: string;
  label: string;
  category: string;
  sortOrder: number;
  outcomes: string[];
}> = [
  { key: 'passe', label: 'Passe', category: 'posse', sortOrder: 10, outcomes: ['certo', 'errado', 'neutro'] },
  { key: 'finalizacao', label: 'Finalização', category: 'ataque', sortOrder: 20, outcomes: ['gol', 'no_gol', 'bloqueada', 'fora'] },
  { key: 'recuperacao', label: 'Recuperação', category: 'defesa', sortOrder: 30, outcomes: ['neutro'] },
  { key: 'perda', label: 'Perda', category: 'posse', sortOrder: 40, outcomes: ['neutro'] },
  { key: 'duelo', label: 'Duelo', category: 'duelo', sortOrder: 50, outcomes: ['vencido', 'perdido', 'neutro'] },
  { key: 'cruzamento', label: 'Cruzamento', category: 'ataque', sortOrder: 60, outcomes: ['certo', 'errado', 'neutro'] },
  { key: 'defesa', label: 'Defesa', category: 'defesa', sortOrder: 70, outcomes: ['neutro'] },
  { key: 'bola_parada', label: 'Bola parada', category: 'bola_parada', sortOrder: 80, outcomes: ['neutro'] },
];
