import {
  getTenantOperationalCategoriesForFmf,
  readTenantCategoryKeys,
  tenantCategoriesUnchanged,
  unionOperationalCategoriesFromTenants,
} from './fmf-sync-tenants.config';

describe('fmf-sync-tenants.config', () => {
  it('readTenantCategoryKeys preserva ordem administrativa', () => {
    expect(readTenantCategoryKeys(['sub20', 'sub17', 'sub20_2div'])).toEqual([
      'sub20',
      'sub17',
      'sub20_2div',
    ]);
  });

  it('getTenantOperationalCategoriesForFmf deduplica operacional sem persistir', () => {
    expect(getTenantOperationalCategoriesForFmf(['sub20', 'sub20_2div', 'sub17'])).toEqual([
      'sub20',
      'sub17',
    ]);
  });

  it('tenantCategoriesUnchanged compara chaves administrativas', () => {
    const before = ['modulo_ii', 'sub17', 'sub20_2div'];
    expect(tenantCategoriesUnchanged(before, [...before])).toBe(true);
    expect(tenantCategoriesUnchanged(before, ['modulo_ii', 'sub17'])).toBe(false);
  });

  it('unionOperationalCategoriesFromTenants agrega tenants FMF', () => {
    expect(
      unionOperationalCategoriesFromTenants([
        { categories: ['sub13', 'sub14'] },
        { categories: ['sub20', 'sub20_2div'] },
      ]),
    ).toEqual(['sub13', 'sub14', 'sub20']);
  });
});
