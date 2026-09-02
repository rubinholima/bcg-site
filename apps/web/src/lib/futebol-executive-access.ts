import type { MeRole } from "@/types/auth";

const FOOTBALL_MANAGEMENT_ROLES = new Set(["gerente", "gestor", "supervisor"]);

export function canAccessFutebolExecutiveDashboard(
  role: MeRole | null | undefined,
  modules: string[],
): boolean {
  const r = (role ?? "").trim().toLowerCase();
  if (!r || r === "user") return false;
  if (r === "super_admin" || r === "company_admin") return true;
  if (r === "diretoria") return modules.includes("diretoria");
  if (FOOTBALL_MANAGEMENT_ROLES.has(r)) {
    return modules.some(
      (m) => m.startsWith("futebol_") || m === "tipos" || m === "relatorios_futebol",
    );
  }
  return false;
}

export const EXECUTIVE_SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítico",
  attention: "Atenção",
  info: "Info",
};

export const EXECUTIVE_SEVERITY_CLASS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  attention: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  info: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

export const PLAYER_STATUS_LABEL: Record<string, string> = {
  available: "Disponível",
  injured: "Lesionado",
  suspended: "Suspenso",
  absent: "Ausente",
  on_bench: "No banco",
  not_in_squad: "Fora do elenco",
};

export const SPORTS_SITUATION_LABEL: Record<string, string> = {
  ativo: "Ativo",
  teste: "Teste",
  emprestado: "Emprestado",
  desligado: "Desligado",
};

export const CT_STATUS_LABEL: Record<string, string> = {
  nao_agendado: "Sem agendamento",
  agendado: "Agendado",
  compareceu: "Compareceu",
  em_avaliacao: "Em avaliação",
  concluido: "Concluído",
  faltou: "Faltou",
};
