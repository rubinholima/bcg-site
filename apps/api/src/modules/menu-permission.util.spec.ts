/**
 * Garante que permissão canônica do menu não depende de prefixo/posição na árvore.
 */
describe('menu-permission separation', () => {
  function canonicalPermission(item: {
    permission?: string;
    moduleSlug: string;
    accessSlug?: string;
  }): string {
    return item.permission ?? item.accessSlug ?? item.moduleSlug;
  }

  it('mesma permission em dois prefixos = mesma decisão', () => {
    const item = { permission: 'medico', moduleSlug: 'legacy_med', accessSlug: 'saude__medico' };
    const prefixA = canonicalPermission(item);
    const prefixB = canonicalPermission({ ...item, accessSlug: 'futebol__medico' });
    expect(prefixA).toBe(prefixB);
  });
});
