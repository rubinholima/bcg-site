import { ForbiddenException } from '@nestjs/common';
import {
  assertVaultItemTenantAllowed,
  buildVaultListWhere,
  canAccessGroupVaultItems,
} from './vault-tenant-access.util';

describe('vault-tenant-access', () => {
  it('group items só super_admin', () => {
    expect(canAccessGroupVaultItems('super_admin')).toBe(true);
    expect(canAccessGroupVaultItems('company_admin')).toBe(false);
  });

  it('rejeita item de tenant fora do escopo', () => {
    expect(() =>
      assertVaultItemTenantAllowed(['t-a'], 'editor', 't-b'),
    ).toThrow(ForbiddenException);
  });

  it('list scope limita a tenants permitidos', () => {
    const where = buildVaultListWhere(['t-a'], 'editor', undefined);
    expect(where).toEqual({ tenantId: { in: ['t-a'] } });
  });

  it('filtro tenantId não expande escopo', () => {
    expect(() => buildVaultListWhere(['t-a'], 'editor', { tenantId: 't-b' })).toThrow(
      ForbiddenException,
    );
  });

  it('filtro grupo exige super_admin', () => {
    expect(() =>
      buildVaultListWhere(['t-a'], 'editor', { tenantId: '__group__' }),
    ).toThrow(ForbiddenException);
    const where = buildVaultListWhere(null, 'super_admin', { tenantId: '__group__' });
    expect(where).toEqual({ tenantId: null });
  });
});
