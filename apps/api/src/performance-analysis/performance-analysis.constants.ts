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

export type DefaultAnalysisTagSeed = {
  key: string;
  label: string;
  category: string;
  tagGroup?: string;
  sortOrder: number;
  outcomes: string[];
  qualifiers?: string[];
  shortcutKey?: string;
  requiresPlayer?: boolean;
  requiresRelatedPlayer?: boolean;
  requiresFieldLocation?: boolean;
  stateBehavior?: string;
  color?: string;
  autoClipEnabled?: boolean;
  autoClipPreMs?: number;
  autoClipPostMs?: number;
};

export const DEFAULT_ANALYSIS_TAGS: DefaultAnalysisTagSeed[] = [
  {
    key: 'posse_bola',
    label: 'Posse de bola',
    category: 'posse',
    sortOrder: 5,
    outcomes: ['neutro'],
    shortcutKey: 'o',
    requiresPlayer: true,
  },
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
    key: 'gol',
    label: 'Gol',
    category: 'ataque',
    sortOrder: 12,
    outcomes: ['neutro'],
    shortcutKey: 'g',
    requiresPlayer: true,
    autoClipEnabled: true,
    autoClipPreMs: 12000,
    autoClipPostMs: 6000,
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
    key: 'escanteio',
    label: 'Escanteio',
    category: 'bola_parada',
    sortOrder: 75,
    outcomes: ['a_favor', 'contra'],
    shortcutKey: 'e',
  },
  {
    key: 'bola_parada',
    label: 'Bola parada',
    category: 'bola_parada',
    sortOrder: 80,
    outcomes: ['neutro'],
    shortcutKey: 's',
  },
  {
    key: 'falta',
    label: 'Falta cometida',
    category: 'disciplina',
    sortOrder: 83,
    outcomes: ['neutro'],
    requiresPlayer: true,
  },
  {
    key: 'cartao_amarelo',
    label: 'Cartão amarelo',
    category: 'disciplina',
    sortOrder: 88,
    outcomes: ['neutro'],
    requiresPlayer: true,
  },
  {
    key: 'cartao_vermelho',
    label: 'Cartão vermelho',
    category: 'disciplina',
    sortOrder: 89,
    outcomes: ['neutro'],
    requiresPlayer: true,
  },
];

/** Tags de estado Live Tag (duração) — não substituem posse_bola legado (ponto). */
export const DEFAULT_LIVE_STATE_TAGS: DefaultAnalysisTagSeed[] = [
  {
    key: 'state_posse_proprio',
    label: 'Posse — nosso time',
    category: 'posse',
    tagGroup: 'POSSESSION',
    sortOrder: 2,
    outcomes: ['neutro'],
    shortcutKey: '1',
    stateBehavior: 'possession_our',
    color: '#22c55e',
  },
  {
    key: 'state_posse_adversario',
    label: 'Posse — adversário',
    category: 'posse',
    tagGroup: 'POSSESSION',
    sortOrder: 3,
    outcomes: ['neutro'],
    shortcutKey: '2',
    stateBehavior: 'possession_opponent',
    color: '#ef4444',
  },
  {
    key: 'state_bola_fora',
    label: 'Bola fora de jogo',
    category: 'game_state',
    tagGroup: 'GAME_STATE',
    sortOrder: 4,
    outcomes: ['neutro'],
    shortcutKey: '3',
    stateBehavior: 'ball_out',
    color: '#94a3b8',
  },
];

export const DEFAULT_LIVE_TAG_TEMPLATE: DefaultAnalysisTagSeed[] = [
  {
    key: 'transicao_ofensiva',
    label: 'Transição ofensiva',
    category: 'transicao',
    tagGroup: 'TRANSITION',
    sortOrder: 100,
    outcomes: ['neutro'],
    shortcutKey: 't',
  },
  {
    key: 'transicao_defensiva',
    label: 'Transição defensiva',
    category: 'transicao',
    tagGroup: 'TRANSITION',
    sortOrder: 101,
    outcomes: ['neutro'],
  },
  {
    key: 'organizacao_ofensiva',
    label: 'Organização ofensiva',
    category: 'organizacao',
    tagGroup: 'ORGANIZATION',
    sortOrder: 110,
    outcomes: ['neutro'],
  },
  {
    key: 'organizacao_defensiva',
    label: 'Organização defensiva',
    category: 'organizacao',
    tagGroup: 'ORGANIZATION',
    sortOrder: 111,
    outcomes: ['neutro'],
  },
  {
    key: 'entrada_ultimo_terco',
    label: 'Entrada no último terço',
    category: 'ataque',
    tagGroup: 'FINAL_THIRD',
    sortOrder: 115,
    outcomes: ['neutro'],
    qualifiers: ['passe', 'bola_longa', 'conducao'],
  },
  {
    key: 'goleiro_saida',
    label: 'Goleiro — saída',
    category: 'goleiro',
    tagGroup: 'GOALKEEPER',
    sortOrder: 120,
    outcomes: ['certo', 'errado'],
    requiresPlayer: true,
  },
  {
    key: 'goleiro_defesa',
    label: 'Goleiro — defesa',
    category: 'goleiro',
    tagGroup: 'GOALKEEPER',
    sortOrder: 121,
    outcomes: ['neutro'],
    requiresPlayer: true,
  },
];

export const ALL_DEFAULT_ANALYSIS_TAG_SEEDS: DefaultAnalysisTagSeed[] = [
  ...DEFAULT_ANALYSIS_TAGS,
  ...DEFAULT_LIVE_STATE_TAGS,
  ...DEFAULT_LIVE_TAG_TEMPLATE,
];

export const ANALYSIS_TEAM_SIDES = ['proprio', 'adversario'] as const;
export type AnalysisTeamSide = (typeof ANALYSIS_TEAM_SIDES)[number];
