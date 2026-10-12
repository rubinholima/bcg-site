import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/** Itens com tenantId=null são credenciais do grupo — somente super_admin. */
export function canAccessGroupVaultItems(role: string | undefined): boolean {
  return role === 'super_admin';
}

export function assertVaultItemTenantAllowed(
  allowedTenantIds: string[] | null,
  role: string | undefined,
  itemTenantId: string | null,
): void {
  if (itemTenantId === null) {
    if (!canAccessGroupVaultItems(role)) {
      throw new ForbiddenException('Acesso negado a credenciais do grupo.');
    }
    return;
  }
  if (allowedTenantIds === null) return;
  if (!allowedTenantIds.includes(itemTenantId)) {
    throw new ForbiddenException('Acesso negado a esta empresa.');
  }
}

/** Valida tenant de destino em create/update (null = grupo). */
export function assertVaultTargetTenantAllowed(
  allowedTenantIds: string[] | null,
  role: string | undefined,
  targetTenantId: string | null | undefined,
): void {
  const normalized = targetTenantId === undefined ? null : targetTenantId;
  assertVaultItemTenantAllowed(allowedTenantIds, role, normalized);
}

export type VaultListFilter = {
  tenantId?: string;
  category?: string;
  search?: string;
  status?: string;
};

/**
 * Monta cláusula Prisma de tenant para listagem, sem expandir escopo do filtro.
 */
export function buildVaultListWhere(
  allowedTenantIds: string[] | null,
  role: string | undefined,
  filters?: VaultListFilter,
): Prisma.VaultItemWhereInput {
  const and: Prisma.VaultItemWhereInput[] = [];

  const scope = buildTenantScopeClause(allowedTenantIds, role, filters?.tenantId);
  if (scope) and.push(scope);

  if (filters?.category) {
    and.push({ category: { contains: filters.category, mode: 'insensitive' } });
  }
  if (filters?.status) {
    and.push({ status: filters.status });
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    and.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length === 0) return {};
  if (and.length === 1) return and[0]!;
  return { AND: and };
}

function buildTenantScopeClause(
  allowedTenantIds: string[] | null,
  role: string | undefined,
  filterTenantId?: string,
): Prisma.VaultItemWhereInput | null {
  const unrestricted = allowedTenantIds === null;

  if (filterTenantId !== undefined && filterTenantId !== '') {
    if (filterTenantId === '__group__') {
      if (!canAccessGroupVaultItems(role)) {
        throw new ForbiddenException('Acesso negado ao filtro de credenciais do grupo.');
      }
      return { tenantId: null };
    }
    if (!unrestricted && !allowedTenantIds!.includes(filterTenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }
    return { tenantId: filterTenantId };
  }

  if (unrestricted) return null;

  const ids = allowedTenantIds ?? [];
  if (ids.length === 0) {
    return { id: { in: [] } };
  }
  return { tenantId: { in: ids } };
}
