import {
  FOOTBALL_MANAGEMENT_ROLE_SLUGS,
  isFootballManagementRole,
} from '../modules/football-domain-access.util';

export function canAccessExecutiveDashboard(
  role: string | null | undefined,
  modules: string[],
): boolean {
  const r = (role ?? '').trim().toLowerCase();
  if (!r || r === 'user') return false;
  if (r === 'super_admin' || r === 'company_admin') return true;
  if (r === 'diretoria') return modules.includes('diretoria');
  if (isFootballManagementRole(r)) {
    return modules.some((m) => m.startsWith('futebol_') || m === 'tipos' || m === 'relatorios_futebol');
  }
  return false;
}

export function hasModule(modules: Set<string>, slug: string): boolean {
  return modules.has(slug);
}

export function hasAnyModule(modules: Set<string>, slugs: string[]): boolean {
  return slugs.some((s) => modules.has(s));
}

export const EXECUTIVE_MANAGEMENT_ROLES = [...FOOTBALL_MANAGEMENT_ROLE_SLUGS, 'diretoria'] as const;
