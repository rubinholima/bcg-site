/**
 * Camada semântica da sidebar CUP360 v1 (rótulos de área aprovados).
 */
export type Cup360NavAreaId =
  | "executivo"
  | "operacao"
  | "futebol"
  | "saude"
  | "administrativo"
  | "outras"
  | "sistema";

export const CUP360_NAV_AREA_LABELS: Record<Cup360NavAreaId, string> = {
  executivo: "Dashboard Executivo",
  operacao: "Operação",
  futebol: "Futebol",
  saude: "Saúde",
  administrativo: "Administrativo",
  outras: "Outras Áreas",
  sistema: "Sistema",
};
