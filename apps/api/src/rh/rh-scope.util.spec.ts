import { ForbiddenException } from '@nestjs/common';
import { applyRhTenantFilter, assertRhTenantAccess } from './rh-scope.util';

describe('rh-scope.util', () => {
  it('super escopo não restringe tenant único', () => {
    const where: { tenantId?: string | { in: string[] } } = {};
    applyRhTenantFilter(where, null, 't1');
    expect(where.tenantId).toBe('t1');
  });

  it('lista vazia bloqueia leituras', () => {
    const where: { tenantId?: string | { in: string[] } } = {};
    applyRhTenantFilter(where, []);
    expect(where.tenantId).toEqual({ in: [] });
  });

  it('nega tenant fora do escopo', () => {
    expect(() => assertRhTenantAccess(['t1'], 't2')).toThrow(ForbiddenException);
  });
});
