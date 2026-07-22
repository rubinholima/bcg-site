/** Categorias legadas (futebol / operação) + ADM + atalhos — fallback quando API indisponível. */
export const LEGACY_INVENTORY_KINDS = [
  "uniforme",
  "material_treino",
  "bola_equipamento",
  "nutricao_hidratacao",
  "saude_fisioterapia",
  "vestuario_lazer",
  "documental",
  "geral",
] as const;

export const ADM_INVENTORY_KINDS = [
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

export const EXTRA_INVENTORY_KINDS = [
  "uniforme_treino",
  "jogo",
  "saude",
  "outros",
] as const;

export const INVENTORY_KINDS = [
  ...LEGACY_INVENTORY_KINDS,
  ...ADM_INVENTORY_KINDS,
  ...EXTRA_INVENTORY_KINDS,
] as const;

export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const INVENTORY_KIND_LABELS: Record<string, string> = {
  uniforme: "Uniforme & equipamento de jogo",
  material_treino: "Material de treino",
  bola_equipamento: "Bolas & equipamentos de campo",
  nutricao_hidratacao: "Nutrição & hidratação",
  saude_fisioterapia: "Saúde & fisioterapia",
  vestuario_lazer: "Vestuário & uso diário",
  documental: "Material institucional / documental",
  geral: "Geral / diversos",
  alimentacao: "Alimentação",
  nutricao_suplementacao: "Nutrição e suplementação",
  alimentacao_viagem: "Alimentação de viagem",
  uniforme_apoio: "Uniforme apoio",
  uniforme_futebol: "Uniforme futebol",
  uniforme_adm: "Uniforme ADM",
  produtos_limpeza: "Produtos de limpeza",
  produtos_manutencao: "Produtos de manutenção",
  uso_consumo: "Uso e consumo (descartáveis)",
  uniforme_treino: "Uniforme de treino",
  jogo: "Jogo",
  saude: "Saúde",
  outros: "Outros",
};

export const INVENTORY_KIND_ORDER: string[] = [...INVENTORY_KINDS];

export interface InventoryCategoryRow {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
  tenant: { id: string; name: string; slug: string } | null;
}

export function formatProductPrice(value: unknown): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function labelForInventoryKind(slug: string, categories?: InventoryCategoryRow[]): string {
  const hit = categories?.find((c) => c.slug === slug);
  if (hit) return hit.name;
  return INVENTORY_KIND_LABELS[slug] ?? slug.replace(/_/g, " ");
}

export function sortCategorySlugs(slugs: string[], categories?: InventoryCategoryRow[]): string[] {
  if (!categories?.length) return slugs;
  const order = new Map(categories.map((c, i) => [c.slug, c.sortOrder ?? i]));
  return [...slugs].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}
