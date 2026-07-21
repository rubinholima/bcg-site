export interface PlatformRole {
  slug: string;
  label: string;
  sortOrder: number;
  canAccessDashboard: boolean;
  includeInMatrix: boolean;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
}

/** Fallback quando API ainda não carregou. */
export const FALLBACK_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  company_admin: "Admin da empresa",
  editor: "Editor",
  gerente: "Gerente",
  administrativo: "Administrativo",
  analista: "Analista",
  diretoria: "Diretoria",
  medico: "Médico",
  psicologo: "Psicólogo",
  comissao: "Comissão",
  user: "Usuário básico",
};

export function roleLabelsFromCatalog(roles: PlatformRole[]): Record<string, string> {
  const map: Record<string, string> = { ...FALLBACK_ROLE_LABELS };
  for (const r of roles) {
    map[r.slug] = r.label;
  }
  return map;
}

export function managedRolesFromCatalog(roles: PlatformRole[]): string[] {
  return roles.filter((r) => r.includeInMatrix && r.isActive).map((r) => r.slug);
}

export function selectableRolesFromCatalog(
  roles: PlatformRole[],
  isSuperAdmin: boolean,
): PlatformRole[] {
  const active = roles.filter((r) => r.isActive);
  if (isSuperAdmin) return active.sort((a, b) => a.sortOrder - b.sortOrder);
  return active.filter((r) => r.slug !== "super_admin").sort((a, b) => a.sortOrder - b.sortOrder);
}

export function slugifyRoleInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 49);
}
