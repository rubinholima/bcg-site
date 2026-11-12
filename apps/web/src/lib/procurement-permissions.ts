import type { MeResponse } from "@/types/auth";

export type ProcurementCapability =
  | "view_supplier"
  | "manage_supplier"
  | "view_quotation"
  | "manage_quotation"
  | "enter_quote"
  | "select_winner"
  | "approve_quotation"
  | "manage_purchase_order";

const ADM_COMPRAS_IMPLIES: ProcurementCapability[] = [
  "view_supplier",
  "manage_supplier",
  "view_quotation",
  "manage_quotation",
  "enter_quote",
  "select_winner",
  "manage_purchase_order",
];

const CAPS: Record<ProcurementCapability, string[]> = {
  view_supplier: [
    "adm_compras",
    "adm_financeiro",
    "futebol_logistica",
    "group_fornecedores",
    "compras_fornecedores_ver",
    "compras_fornecedores_gerir",
  ],
  manage_supplier: ["adm_compras", "group_fornecedores", "compras_fornecedores_gerir"],
  view_quotation: [
    "adm_compras",
    "adm_financeiro",
    "diretoria",
    "requisicoes",
    "futebol_logistica",
    "compras_cotacoes_ver",
    "compras_cotacoes_gerir",
  ],
  manage_quotation: ["adm_compras", "compras_cotacoes_gerir"],
  enter_quote: ["adm_compras", "compras_proposta_lancar", "compras_cotacoes_gerir"],
  select_winner: ["adm_compras", "compras_vencedor_selecionar", "compras_cotacoes_gerir"],
  approve_quotation: ["adm_financeiro", "diretoria", "requisicoes", "compras_cotacao_aprovar"],
  manage_purchase_order: ["adm_compras", "compras_pedido_gerir"],
};

export function canProcurement(
  modules: string[],
  capability: ProcurementCapability,
  role?: MeResponse["role"] | null,
): boolean {
  if (role === "super_admin" || role === "company_admin") return true;
  if (modules.includes("adm_compras") && ADM_COMPRAS_IMPLIES.includes(capability)) return true;
  return CAPS[capability].some((s) => modules.includes(s));
}
