/** Categorias ADM de produtos (Compras / Estoque). */
export const INVENTORY_KINDS = [
  "alimentacao",
  "nutricao_suplementacao",
  "alimentacao_viagem",
  "uniforme_apoio",
  "uniforme_futebol",
  "uniforme_adm",
  "produtos_limpeza",
  "produtos_manutencao",
  "uso_consumo",
] as const;

export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const INVENTORY_KIND_LABELS: Record<InventoryKind, string> = {
  alimentacao: "Alimentação",
  nutricao_suplementacao: "Nutrição e suplementação",
  alimentacao_viagem: "Alimentação de viagem",
  uniforme_apoio: "Uniforme apoio",
  uniforme_futebol: "Uniforme futebol",
  uniforme_adm: "Uniforme ADM",
  produtos_limpeza: "Produtos de limpeza",
  produtos_manutencao: "Produtos de manutenção",
  uso_consumo: "Uso e consumo (descartáveis)",
};

export const INVENTORY_KIND_ORDER: InventoryKind[] = [...INVENTORY_KINDS];

export function formatProductPrice(value: unknown): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
