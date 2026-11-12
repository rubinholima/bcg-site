import { ForbiddenException } from '@nestjs/common';
import { hasProcurementCapability } from './procurement-access.util';

/** Quem pode abrir requisição de compra (solicitante). */
export const PURCHASE_REQUISITION_REQUESTER_MODULES = ['requisicoes', 'futebol_logistica'] as const;

/** Roles que aprovam requisição antes do financeiro (gerente de futebol — não supervisor). */
export const PURCHASE_GERENTE_APPROVAL_ROLES = new Set([
  'gerente',
  'gestor',
  'company_admin',
  'super_admin',
]);

export function isPurchaseGerenteApproverRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return PURCHASE_GERENTE_APPROVAL_ROLES.has(role.trim().toLowerCase());
}

export function hasPurchaseRequisitionRequesterModule(moduleSlugs: string[]): boolean {
  return PURCHASE_REQUISITION_REQUESTER_MODULES.some((m) => moduleSlugs.includes(m));
}

/** Aprovação/reprovação por etapa do fluxo de compras. */
export function assertPurchaseRequisitionApprovalAccess(input: {
  approvalStep: 'gerente' | 'financeiro' | 'diretoria';
  platformRole: string | null | undefined;
  moduleSlugs: string[];
}): void {
  const role = (input.platformRole ?? 'user').trim().toLowerCase();
  if (role === 'super_admin' || role === 'company_admin') return;

  if (input.approvalStep === 'gerente') {
    if (!isPurchaseGerenteApproverRole(role)) {
      throw new ForbiddenException('Somente o gerente de futebol pode aprovar nesta etapa.');
    }
    if (!hasPurchaseRequisitionRequesterModule(input.moduleSlugs)) {
      throw new ForbiddenException('Sem acesso ao fluxo de requisições de compra.');
    }
    return;
  }

  if (!hasProcurementCapability(input.moduleSlugs, 'approve_quotation', role)) {
    throw new ForbiddenException('Sem permissão para aprovar nesta etapa.');
  }
}
