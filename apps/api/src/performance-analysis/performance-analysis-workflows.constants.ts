export const PRE_MATCH_LIFECYCLES = ['DRAFT', 'REVIEW', 'APPROVED', 'PRESENTED'] as const;
export type PreMatchLifecycle = (typeof PRE_MATCH_LIFECYCLES)[number];

export const PRE_MATCH_SECTION_KEYS = [
  'jogo',
  'adversario',
  'formacao_provavel',
  'jogadores_chave',
  'organizacao_ofensiva',
  'organizacao_defensiva',
  'transicoes',
  'pressao',
  'bolas_paradas',
  'pontos_fortes',
  'pontos_fracos',
  'clips_selecionados',
  'plano_comissao',
] as const;

export const PRE_MATCH_SECTION_LABELS: Record<(typeof PRE_MATCH_SECTION_KEYS)[number], string> = {
  jogo: 'Jogo',
  adversario: 'Adversário',
  formacao_provavel: 'Formação provável',
  jogadores_chave: 'Jogadores-chave',
  organizacao_ofensiva: 'Organização ofensiva',
  organizacao_defensiva: 'Organização defensiva',
  transicoes: 'Transições',
  pressao: 'Pressão',
  bolas_paradas: 'Bolas paradas',
  pontos_fortes: 'Pontos fortes',
  pontos_fracos: 'Pontos fracos',
  clips_selecionados: 'Clips selecionados',
  plano_comissao: 'Plano / observações da comissão',
};

export const OPPONENT_CLIP_CURATION_GROUPS = [
  { key: 'SAIDA_BOLA', label: 'Saída de bola' },
  { key: 'ORG_OFENSIVA', label: 'Organização ofensiva' },
  { key: 'ORG_DEFENSIVA', label: 'Organização defensiva' },
  { key: 'TRANSICOES', label: 'Transições' },
  { key: 'PRESSAO', label: 'Pressão' },
  { key: 'BOLAS_PARADAS', label: 'Bolas paradas' },
  { key: 'PONTOS_FORTES', label: 'Pontos fortes' },
  { key: 'PONTOS_FRACOS', label: 'Pontos fracos' },
] as const;

export const OPPONENT_SET_PIECE_KINDS = [
  'attacking_corner',
  'defensive_corner',
  'attacking_free_kick',
  'defensive_free_kick',
  'throw_in',
  'penalty',
] as const;

export const DEFAULT_OPPONENT_TACTICAL_TAGS: Array<{
  key: string;
  label: string;
  category: string;
  sortOrder: number;
  outcomes: string[];
}> = [
  { key: 'opp_build_up', label: 'Saída / construção', category: 'opponent_tactical', sortOrder: 10, outcomes: ['neutro'] },
  { key: 'opp_progression', label: 'Progressão', category: 'opponent_tactical', sortOrder: 20, outcomes: ['neutro'] },
  { key: 'opp_chance', label: 'Criação de chance', category: 'opponent_tactical', sortOrder: 30, outcomes: ['neutro'] },
  { key: 'opp_def_org', label: 'Organização defensiva', category: 'opponent_tactical', sortOrder: 40, outcomes: ['neutro'] },
  { key: 'opp_def_transition', label: 'Transição defensiva', category: 'opponent_tactical', sortOrder: 50, outcomes: ['neutro'] },
  { key: 'opp_off_transition', label: 'Transição ofensiva', category: 'opponent_tactical', sortOrder: 60, outcomes: ['neutro'] },
  { key: 'opp_pressing', label: 'Pressão', category: 'opponent_tactical', sortOrder: 70, outcomes: ['neutro'] },
  { key: 'opp_high_press', label: 'Pressão alta', category: 'opponent_tactical', sortOrder: 80, outcomes: ['neutro'] },
  { key: 'opp_low_block', label: 'Bloco baixo', category: 'opponent_tactical', sortOrder: 90, outcomes: ['neutro'] },
  { key: 'opp_counter', label: 'Contra-ataque', category: 'opponent_tactical', sortOrder: 100, outcomes: ['neutro'] },
  { key: 'opp_set_piece', label: 'Bola parada', category: 'opponent_tactical', sortOrder: 110, outcomes: ['neutro'] },
  { key: 'opp_gk_distribution', label: 'Distribuição do goleiro', category: 'opponent_tactical', sortOrder: 120, outcomes: ['neutro'] },
  { key: 'opp_pattern', label: 'Padrão recorrente', category: 'opponent_tactical', sortOrder: 130, outcomes: ['neutro'] },
];

export function defaultPreMatchSections(): Record<string, { html?: string; text?: string }> {
  const out: Record<string, { text: string }> = {};
  for (const key of PRE_MATCH_SECTION_KEYS) {
    out[key] = { text: '' };
  }
  return out;
}
