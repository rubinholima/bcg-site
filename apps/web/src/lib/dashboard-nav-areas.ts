/**
 * Camada semântica da sidebar CUP360 — agrupa itens do menu sem alterar rotas/RBAC.
 * Nível 1 visual: ÁREA (rótulo de seção na sidebar).
 */

export type Cup360NavAreaId =
  | "home"
  | "grupo"
  | "operacao"
  | "futebol"
  | "saude"
  | "administrativo"
  | "demais"
  | "sistema";

export const CUP360_NAV_AREA_LABELS: Partial<Record<Cup360NavAreaId, string>> = {
  grupo: "Grupo",
  operacao: "Operação",
  futebol: "Futebol",
  saude: "Saúde",
  administrativo: "Administrativo",
  demais: "Demais áreas",
  sistema: "Sistema",
};

/** Slug de topo do DASHBOARD_MENU → área semântica. */
const MENU_SLUG_TO_AREA: Record<string, Cup360NavAreaId> = {
  dashboard: "home",
  grupo_master: "grupo",
  requisicoes: "operacao",
  agenda: "operacao",
  futebol: "futebol",
  saude: "saude",
  adm: "administrativo",
  assistencia_social: "demais",
  juridico: "demais",
  eventos: "demais",
  marketing: "demais",
  assessoria_imprensa: "demais",
  academias: "demais",
  socio_torcedor: "demais",
  comunicacao: "sistema",
  ferramentas: "sistema",
  configuracoes: "sistema",
};

export function getCup360NavAreaForMenuSlug(menuSlug: string): Cup360NavAreaId {
  return MENU_SLUG_TO_AREA[menuSlug] ?? "demais";
}

export function getCup360NavAreaLabel(areaId: Cup360NavAreaId): string | null {
  return CUP360_NAV_AREA_LABELS[areaId] ?? null;
}
