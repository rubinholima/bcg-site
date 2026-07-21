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

/** Exibe nome do perfil sempre em maiúsculas. */
export function formatRoleLabel(label: string): string {
  return label.trim().toLocaleUpperCase("pt-BR");
}

/** Slug → rótulo legível em maiúsculas (fallback quando API ainda não carregou). */
export function formatRoleSlug(slug: string): string {
  const key = slug.trim().toLowerCase();
  if (!key) return "";
  const known = FALLBACK_ROLE_LABELS[key];
  if (known) return known;
  return key.replace(/_/g, " ").toLocaleUpperCase("pt-BR");
}

/** Fallback quando API ainda não carregou. */
export const FALLBACK_ROLE_LABELS: Record<string, string> = {
  super_admin: "SUPER ADMIN",
  company_admin: "ADMIN DA EMPRESA",
  editor: "EDITOR",
  gerente: "GERENTE",
  administrativo: "ADMINISTRATIVO",
  analista: "ANALISTA",
  diretoria: "DIRETORIA",
  medico: "MÉDICO",
  psicologo: "PSICÓLOGO",
  comissao: "COMISSÃO",
  user: "USUÁRIO BÁSICO",
  supervisor: "SUPERVISOR",
  treinador: "TREINADOR",
  preparador: "PREPARADOR",
  roupeiro: "ROUPEIRO",
  compras: "COMPRAS",
  rh: "RH",
  financeiro: "FINANCEIRO",
  ceo: "CEO",
  marketing: "MARKETING",
};

export function roleLabelsFromCatalog(roles: PlatformRole[]): Record<string, string> {
  const map: Record<string, string> = { ...FALLBACK_ROLE_LABELS };
  for (const r of roles) {
    map[r.slug] = formatRoleLabel(r.label);
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
