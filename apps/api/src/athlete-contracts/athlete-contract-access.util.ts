import { ForbiddenException } from '@nestjs/common';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';

const SUPER = 'super_admin';

export type AthleteContractAccess = {
  canView: boolean;
  canManage: boolean;
  canManageTypes: boolean;
  canViewFinancial: boolean;
  canViewRhSalary: boolean;
  canManageLegacy: boolean;
  canReport: boolean;
};

export function resolveAthleteContractAccess(
  role: string,
  moduleSlugs: string[],
): AthleteContractAccess {
  const isSuper = role === SUPER;
  const juridico = moduleSlugs.includes('juridico');
  const rh = moduleSlugs.includes('rh') || moduleSlugs.includes('adm_rh');
  const financeiro = moduleSlugs.includes('financeiro') || moduleSlugs.includes('adm_financeiro');
  const cadastros = moduleSlugs.includes('cadastros') || moduleSlugs.includes('futebol');

  const canView = isSuper || juridico || rh || cadastros;
  const canManage = isSuper || juridico || role === 'company_admin' || role === 'diretoria';
  const canManageTypes = isSuper || juridico || role === 'company_admin';
  const canViewFinancial = isSuper || financeiro || role === 'diretoria';
  const canViewRhSalary = isSuper || rh;
  const canManageLegacy = canManage;
  const canReport = canView;

  return {
    canView,
    canManage,
    canManageTypes,
    canViewFinancial,
    canViewRhSalary,
    canManageLegacy,
    canReport,
  };
}

export function assertAthleteContractAccess(
  access: AthleteContractAccess,
  action: keyof AthleteContractAccess,
): void {
  if (!access[action]) {
    throw new ForbiddenException('Sem permissão para esta ação contratual.');
  }
}

export function actorEmail(user: CognitoJwtPayload): string | null {
  return user.email ?? null;
}

export function actorSub(user: CognitoJwtPayload): string {
  return user.sub;
}
