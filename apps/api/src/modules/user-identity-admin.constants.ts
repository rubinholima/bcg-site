/** Perfil legado fixo para usuários criados por company_admin (auth existente). */
export const COMPANY_ADMIN_CREATED_USER_LEGACY_ROLE = 'user';

export const PRIVILEGED_LEGACY_ROLES = new Set(['super_admin', 'company_admin']);

export function isPlatformIdentityAdmin(role: string | undefined): boolean {
  const r = (role ?? '').trim();
  return r === 'super_admin' || r === 'company_admin';
}
