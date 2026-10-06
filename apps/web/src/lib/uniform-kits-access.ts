/** Gestão de kits/uniformes — permissão dedicada (não exige módulo logística inteiro). */
export function canManageUniformKits(
  role: string | null | undefined,
  canAccessModule: (slug: string) => boolean,
  isSuperAdmin?: boolean,
): boolean {
  if (isSuperAdmin || role === "super_admin") return true;
  if (role === "company_admin") return true;
  return canAccessModule("futebol_logistica_uniformes");
}

export function canReadUniformKitsInLogistics(
  role: string | null | undefined,
  canAccessModule: (slug: string) => boolean,
  isSuperAdmin?: boolean,
): boolean {
  if (canManageUniformKits(role, canAccessModule, isSuperAdmin)) return true;
  return canAccessModule("futebol_logistica");
}
