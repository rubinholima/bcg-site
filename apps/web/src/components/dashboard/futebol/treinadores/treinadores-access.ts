/** Alinhado a `TEAM_REPORT_READ_MODULES` em `module-access.guard.ts` (API). */
export const TEAM_REPORT_READ_MODULE_SLUGS = [
  "futebol_treinadores",
  "diretoria",
  "relatorios_futebol",
] as const;

export function canAccessTeamReportRead(
  canAccessModule: (slug: string) => boolean,
): boolean {
  return TEAM_REPORT_READ_MODULE_SLUGS.some((slug) => canAccessModule(slug));
}

/** Área Treinadores: módulo completo ou leitura de relatórios (comissão/diretoria). */
export function canAccessTreinadoresWorkspace(
  canAccessModule: (slug: string) => boolean,
): boolean {
  return canAccessModule("futebol_treinadores") || canAccessTeamReportRead(canAccessModule);
}
