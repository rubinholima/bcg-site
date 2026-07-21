/** Categorias ADM de produtos (Compras / Estoque) — conforme solicitado pelo departamento. */
export const INVENTORY_KINDS = [
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

export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const INVENTORY_KIND_LABELS: Record<InventoryKind, string> = {
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
