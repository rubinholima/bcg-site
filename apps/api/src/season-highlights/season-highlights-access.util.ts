import { isFootballManagementRole } from '../modules/football-domain-access.util';

const COACH_STAFF_ROLES = ['treinador', 'comissao', 'preparador'] as const;

/** Melhores da Temporada: gestão (gerente/gestor/supervisor), comissão técnica e admins. */
export function canAccessSeasonHighlights(
  role: string | null | undefined,
  modules: string[],
): boolean {
  const r = (role ?? '').trim().toLowerCase();
  if (!r || r === 'user') return false;
  if (r === 'super_admin' || r === 'company_admin') return true;

  if ((COACH_STAFF_ROLES as readonly string[]).includes(r)) {
    return modules.includes('futebol_treinadores');
  }

  if (isFootballManagementRole(r)) {
    return modules.some(
      (m) => m.startsWith('futebol_') || m === 'tipos' || m === 'relatorios_futebol',
    );
  }

  return false;
}
