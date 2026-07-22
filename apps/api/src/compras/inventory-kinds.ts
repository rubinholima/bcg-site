/** Categorias legadas (futebol / operação de clube) — mantidas após inclusão das categorias ADM. */
export const LEGACY_INVENTORY_KINDS = [
  'uniforme',
  'material_treino',
  'bola_equipamento',
  'nutricao_hidratacao',
  'saude_fisioterapia',
  'vestuario_lazer',
  'documental',
  'geral',
] as const;

export const LEGACY_INVENTORY_KIND_LABELS: Record<(typeof LEGACY_INVENTORY_KINDS)[number], string> = {
  uniforme: 'Uniforme & equipamento de jogo',
  material_treino: 'Material de treino',
  bola_equipamento: 'Bolas & equipamentos de campo',
  nutricao_hidratacao: 'Nutrição & hidratação',
  saude_fisioterapia: 'Saúde & fisioterapia',
  vestuario_lazer: 'Vestuário & uso diário',
  documental: 'Material institucional / documental',
  geral: 'Geral / diversos',
};

/** Categorias ADM solicitadas pelo departamento de compras. */
export const ADM_INVENTORY_KINDS = [
  'alimentacao',
  'nutricao_suplementacao',
  'alimentacao_viagem',
  'uniforme_apoio',
  'uniforme_futebol',
  'uniforme_adm',
  'produtos_limpeza',
  'produtos_manutencao',
  'uso_consumo',
] as const;

export const ADM_INVENTORY_KIND_LABELS: Record<(typeof ADM_INVENTORY_KINDS)[number], string> = {
  alimentacao: 'Alimentação',
  nutricao_suplementacao: 'Nutrição e suplementação',
  alimentacao_viagem: 'Alimentação de viagem',
  uniforme_apoio: 'Uniforme apoio',
  uniforme_futebol: 'Uniforme futebol',
  uniforme_adm: 'Uniforme ADM',
  produtos_limpeza: 'Produtos de limpeza',
  produtos_manutencao: 'Produtos de manutenção',
  uso_consumo: 'Uso e consumo (descartáveis)',
};

/** Atalhos operacionais usados no dia a dia. */
export const EXTRA_INVENTORY_KINDS = [
  'uniforme_treino',
  'jogo',
  'saude',
  'outros',
] as const;

export const EXTRA_INVENTORY_KIND_LABELS: Record<(typeof EXTRA_INVENTORY_KINDS)[number], string> = {
  uniforme_treino: 'Uniforme de treino',
  jogo: 'Jogo',
  saude: 'Saúde',
  outros: 'Outros',
};

export const INVENTORY_KINDS = [
  ...LEGACY_INVENTORY_KINDS,
  ...ADM_INVENTORY_KINDS,
  ...EXTRA_INVENTORY_KINDS,
] as const;

export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const INVENTORY_KIND_LABELS: Record<string, string> = {
  ...LEGACY_INVENTORY_KIND_LABELS,
  ...ADM_INVENTORY_KIND_LABELS,
  ...EXTRA_INVENTORY_KIND_LABELS,
};

/** Seed para migration — ordem de exibição. */
export const SYSTEM_INVENTORY_CATEGORY_SEED: Array<{ slug: string; name: string; sortOrder: number }> = [
  ...LEGACY_INVENTORY_KINDS.map((slug, i) => ({
    slug,
    name: LEGACY_INVENTORY_KIND_LABELS[slug],
    sortOrder: i + 1,
  })),
  ...ADM_INVENTORY_KINDS.map((slug, i) => ({
    slug,
    name: ADM_INVENTORY_KIND_LABELS[slug],
    sortOrder: 100 + i,
  })),
  ...EXTRA_INVENTORY_KINDS.map((slug, i) => ({
    slug,
    name: EXTRA_INVENTORY_KIND_LABELS[slug],
    sortOrder: 200 + i,
  })),
];
