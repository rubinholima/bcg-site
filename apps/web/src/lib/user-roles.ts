import type { UserRole } from "@/types/user";
import type { PlatformRole } from "@/lib/platform-roles";
import { FALLBACK_ROLE_LABELS, formatRoleLabel, formatRoleSlug } from "@/lib/platform-roles";

/** Ordem padrão nos selects quando API ainda não carregou. */
export const USER_ROLES_ORDER: UserRole[] = [
  "super_admin",
  "company_admin",
  "editor",
  "gerente",
  "administrativo",
  "analista",
  "diretoria",
  "medico",
  "psicologo",
  "comissao",
  "user",
];

export function selectableRolesForActor(
  isSuperAdmin: boolean,
  catalog?: PlatformRole[],
): UserRole[] {
  if (catalog?.length) {
    const active = catalog.filter((r) => r.isActive);
    const list = isSuperAdmin ? active : active.filter((r) => r.slug !== "super_admin");
    return list.sort((a, b) => a.sortOrder - b.sortOrder).map((r) => r.slug as UserRole);
  }
  if (isSuperAdmin) return [...USER_ROLES_ORDER];
  return USER_ROLES_ORDER.filter((r) => r !== "super_admin");
}

export function roleLabel(slug: string, catalog?: PlatformRole[]): string {
  const fromApi = catalog?.find((r) => r.slug === slug)?.label;
  if (fromApi) return formatRoleLabel(fromApi);
  return formatRoleSlug(slug);
}

export { formatRoleSlug, formatRoleLabel };
