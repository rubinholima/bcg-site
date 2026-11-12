import { ForbiddenException } from '@nestjs/common';

export function assertRhTenantAccess(
  allowedTenantIds: string[] | null | undefined,
  tenantId: string,
): void {
  if (allowedTenantIds === null || allowedTenantIds === undefined) return;
  if (!allowedTenantIds.includes(tenantId)) {
    throw new ForbiddenException('Acesso negado a esta empresa.');
  }
}

/** Filtra leituras por escopo de empresas do usuário. */
export function applyRhTenantFilter<T extends Record<string, unknown>>(
  where: T,
  allowedTenantIds: string[] | null | undefined,
  requestedTenantId?: string,
): void {
  if (allowedTenantIds === null || allowedTenantIds === undefined) {
    if (requestedTenantId?.trim()) (where as { tenantId?: unknown }).tenantId = requestedTenantId.trim();
    return;
  }
  if (allowedTenantIds.length === 0) {
    (where as { tenantId?: unknown }).tenantId = { in: [] };
    return;
  }
  if (requestedTenantId?.trim()) {
    assertRhTenantAccess(allowedTenantIds, requestedTenantId.trim());
    (where as { tenantId?: unknown }).tenantId = requestedTenantId.trim();
    return;
  }
  (where as { tenantId?: unknown }).tenantId = { in: allowedTenantIds };
}
