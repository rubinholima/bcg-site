/**
 * Slug usado na matriz ModuleRole a partir do role do usuário.
 * Cup360: perfil "Gestor" pode vir como `gestor` no User.role; permissões espelham `gerente`.
 */
export function moduleMatrixRoleSlug(role: string | null | undefined): string {
  const r = (role ?? '').trim().toLowerCase();
  if (r === 'gestor') return 'gerente';
  return r;
}
