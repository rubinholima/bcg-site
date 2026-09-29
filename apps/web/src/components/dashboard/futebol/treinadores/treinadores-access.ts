const FOOTBALL_MANAGEMENT_ROLES = ["gerente", "gestor", "supervisor"] as const;
const COACH_STAFF_ROLES = ["treinador", "comissao", "preparador"] as const;

/** Alinhado a `canAccessSeasonHighlights` na API. */
export function canAccessMelhoresTemporada(
  role: string | null | undefined,
  modules: readonly string[],
  canAccessModule: (slug: string) => boolean,
): boolean {
  const r = (role ?? "").trim().toLowerCase();
  if (!r || r === "user") return false;
  if (r === "super_admin" || r === "company_admin") return true;

  if ((COACH_STAFF_ROLES as readonly string[]).includes(r)) {
    return canAccessModule("futebol_treinadores");
  }

  if ((FOOTBALL_MANAGEMENT_ROLES as readonly string[]).includes(r)) {
    return modules.some(
      (m) => m.startsWith("futebol_") || m === "tipos" || m === "relatorios_futebol",
    );
  }

  return false;
}
