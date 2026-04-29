import type { UserRole } from "@/types/user";

/** Ordem padrão nos selects (super admin só para quem pode atribuir). */
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
  "user",
];

/** Company admin nunca pode escolher/atribuir super admin. */
export function selectableRolesForActor(isSuperAdmin: boolean): UserRole[] {
  if (isSuperAdmin) return [...USER_ROLES_ORDER];
  return USER_ROLES_ORDER.filter((r) => r !== "super_admin");
}
