/** Quem pode abrir requisição de compra (solicitante). */
export const PURCHASE_REQUISITION_REQUESTER_MODULES = ['requisicoes', 'futebol_logistica'] as const;

/** Roles que aprovam requisição antes do financeiro (gerente de futebol). */
export const PURCHASE_GERENTE_APPROVAL_ROLES = new Set([
  'gerente',
  'gestor',
  'supervisor',
  'company_admin',
  'super_admin',
]);

export function isPurchaseGerenteApproverRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return PURCHASE_GERENTE_APPROVAL_ROLES.has(role.trim().toLowerCase());
}
