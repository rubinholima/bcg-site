/** Pendências da validação cadastral — rótulo (API) → aba do atleta para corrigir. */

export interface ValidationFixTarget {
  tab: "dados" | "assistencia_social";
  actionLabel: string;
}

const FIX_BY_ISSUE: Record<string, ValidationFixTarget> = {
  "Endereço do atleta": { tab: "dados", actionLabel: "Endereço" },
  "Contato de responsável": { tab: "assistencia_social", actionLabel: "Responsável" },
  "Nome do responsável": { tab: "assistencia_social", actionLabel: "Responsável" },
  "Escola do atleta": { tab: "assistencia_social", actionLabel: "Escola" },
  "Telefone do atleta": { tab: "dados", actionLabel: "Telefone" },
};

export function getValidationFixTarget(issue: string): ValidationFixTarget {
  return FIX_BY_ISSUE[issue] ?? { tab: "assistencia_social", actionLabel: "Corrigir" };
}

export function playerEditUrl(playerId: string, tab: "dados" | "assistencia_social"): string {
  return `/dashboard/cadastros/jogadores/${playerId}/edit?tab=${tab}`;
}

export function primaryFixTab(issues: string[]): "dados" | "assistencia_social" {
  if (issues.length === 0) return "assistencia_social";
  return getValidationFixTarget(issues[0]).tab;
}
