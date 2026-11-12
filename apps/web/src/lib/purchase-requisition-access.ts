/** Solicitante de requisição de compra (logística / requisições). */
export function canAccessPurchaseRequisitions(
  canAccessModule: (slug: string) => boolean,
): boolean {
  return canAccessModule("requisicoes") || canAccessModule("futebol_logistica");
}

/** Gerente de futebol (ex.: Odair) — supervisor só solicita, não aprova. */
const GERENTE_APPROVER_ROLES = new Set([
  "gerente",
  "gestor",
  "company_admin",
  "super_admin",
]);

export function canApprovePurchaseAsGerente(
  role: string | null | undefined,
  canAccessModule: (slug: string) => boolean,
  isSuperAdmin?: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!role || !GERENTE_APPROVER_ROLES.has(role)) return false;
  return canAccessModule("futebol_logistica") || canAccessModule("requisicoes");
}
