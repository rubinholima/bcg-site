export const ANALYSIS_SESSION_KINDS = ['MATCH', 'TRAINING', 'OPPONENT', 'OTHER'] as const;
export type AnalysisSessionKind = (typeof ANALYSIS_SESSION_KINDS)[number];

export const ANALYSIS_VIDEO_SOURCE_TYPES = ['UPLOAD', 'YOUTUBE', 'EXTERNAL_URL'] as const;
export type AnalysisVideoSourceType = (typeof ANALYSIS_VIDEO_SOURCE_TYPES)[number];

export const ANALYSIS_EVENT_SOURCES = ['MANUAL', 'LIVE', 'IMPORTED'] as const;

export const ANALYSIS_SESSION_STATUSES = [
  'preparation',
  'live',
  'review',
  'completed',
] as const;
export type AnalysisSessionStatus = (typeof ANALYSIS_SESSION_STATUSES)[number];

export const ANALYSIS_EVENT_CLASSES = ['acerto', 'correcao', 'destaque'] as const;
export type AnalysisEventClass = (typeof ANALYSIS_EVENT_CLASSES)[number];

export const DEFAULT_ANALYSIS_TAGS: Array<{
  key: string;
  label: string;
  category: string;
  sortOrder: number;
  outcomes: string[];
  shortcutKey?: string;
  requiresPlayer?: boolean;
  autoClipEnabled?: boolean;
  autoClipPreMs?: number;
  autoClipPostMs?: number;
}> = [
  {
    key: 'passe',
    label: 'Passe',
    category: 'posse',
    sortOrder: 10,
    outcomes: ['certo', 'errado'],
    shortcutKey: 'p',
    requiresPlayer: true,
  },
  {
    key: 'finalizacao',
    label: 'Finalização',
    category: 'ataque',
    sortOrder: 20,
    outcomes: ['gol', 'defesa', 'fora', 'bloqueada'],
    shortcutKey: 'f',
    requiresPlayer: true,
    autoClipEnabled: true,
    autoClipPreMs: 10000,
    autoClipPostMs: 5000,
  },
  {
    key: 'recuperacao',
    label: 'Recuperação',
    category: 'defesa',
    sortOrder: 30,
    outcomes: ['neutro'],
    shortcutKey: 'r',
    requiresPlayer: true,
  },
  {
    key: 'perda',
    label: 'Perda',
    category: 'posse',
    sortOrder: 40,
    outcomes: ['neutro'],
    shortcutKey: 'l',
    requiresPlayer: true,
  },
  {
    key: 'duelo',
    label: 'Duelo',
    category: 'duelo',
    sortOrder: 50,
    outcomes: ['vencido', 'perdido'],
    shortcutKey: 'd',
    requiresPlayer: true,
  },
  {
    key: 'cruzamento',
    label: 'Cruzamento',
    category: 'ataque',
    sortOrder: 60,
    outcomes: ['certo', 'errado'],
    shortcutKey: 'c',
    requiresPlayer: true,
  },
  {
    key: 'defesa',
    label: 'Defesa',
    category: 'defesa',
    sortOrder: 70,
    outcomes: ['neutro'],
    shortcutKey: 'b',
    requiresPlayer: true,
  },
  {
    key: 'bola_parada',
    label: 'Bola parada',
    category: 'bola_parada',
    sortOrder: 80,
    outcomes: ['neutro'],
    shortcutKey: 's',
  },
];
