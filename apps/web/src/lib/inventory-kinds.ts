export const INVENTORY_KINDS = [
  "uniforme",
  "material_treino",
  "bola_equipamento",
  "nutricao_hidratacao",
  "saude_fisioterapia",
  "vestuario_lazer",
  "documental",
  "geral",
] as const;

export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const INVENTORY_KIND_LABELS: Record<InventoryKind, string> = {
  uniforme: "Uniforme & jogo",
  material_treino: "Treino",
  bola_equipamento: "Bolas & equip.",
  nutricao_hidratacao: "Nutrição & hidratação",
  saude_fisioterapia: "Saúde / fisio",
  vestuario_lazer: "Vestuário",
  documental: "Documental",
  geral: "Geral",
};

export const INVENTORY_KIND_ORDER: InventoryKind[] = [...INVENTORY_KINDS];
