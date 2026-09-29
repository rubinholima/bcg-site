import { moduleMatrixRoleSlug } from './module-matrix-role.util';

describe('moduleMatrixRoleSlug', () => {
  it('mapeia gestor para gerente na matriz', () => {
    expect(moduleMatrixRoleSlug('gestor')).toBe('gerente');
    expect(moduleMatrixRoleSlug('GESTOR')).toBe('gerente');
  });

  it('mantém demais roles', () => {
    expect(moduleMatrixRoleSlug('gerente')).toBe('gerente');
    expect(moduleMatrixRoleSlug('supervisor')).toBe('supervisor');
    expect(moduleMatrixRoleSlug('comissao')).toBe('comissao');
  });
});
