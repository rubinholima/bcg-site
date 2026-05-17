/** Categoria visual/operacional do item — foco futebol / operação de clube. */
export const INVENTORY_KINDS = [
  'uniforme',
  'material_treino',
  'bola_equipamento',
  'nutricao_hidratacao',
  'saude_fisioterapia',
  'vestuario_lazer',
  'documental',
  'geral',
] as const;

export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const INVENTORY_KIND_LABELS: Record<InventoryKind, string> = {
  uniforme: 'Uniforme & equipamento de jogo',
  material_treino: 'Material de treino',
  bola_equipamento: 'Bolas & equipamentos de campo',
  nutricao_hidratacao: 'Nutrição & hidratação',
  saude_fisioterapia: 'Saúde & fisioterapia',
  vestuario_lazer: 'Vestuário & uso diário',
  documental: 'Material institucional / documental',
  geral: 'Geral / diversos',
};
