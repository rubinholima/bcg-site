import {
  expandImplications,
  hasModuleAccess,
  resolveEffectiveModuleSlugs,
} from './effective-access';

describe('effective-access', () => {
  const all = ['dashboard', 'medico', 'futebol_treinadores', 'adm_rh'];
  const implications = [{ slug: 'futebol_treinadores', impliesSlug: 'relatorios_futebol' }];

  it('herda defaults da função', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard', 'medico'],
      overrides: [],
    });
    expect(slugs).toEqual(['dashboard', 'medico']);
  });

  it('ALLOW individual adiciona módulo', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'editor',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard'],
      overrides: [{ slug: 'adm_rh', effect: 'allow' }],
    });
    expect(slugs).toContain('adm_rh');
  });

  it('DENY individual remove módulo herdado', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard', 'medico'],
      overrides: [{ slug: 'medico', effect: 'deny' }],
    });
    expect(slugs).not.toContain('medico');
    expect(slugs).toContain('dashboard');
  });

  it('novo default na função alcança usuário sem deny', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard', 'medico', 'futebol_treinadores'],
      overrides: [],
    });
    expect(slugs).toContain('relatorios_futebol');
  });

  it('super_admin recebe todos', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'super_admin',
      allModuleSlugs: all,
      implications,
      baseSlugs: [],
      overrides: [],
      isSuperAdmin: true,
    });
    expect(slugs.length).toBe(all.length);
  });

  it('base vazia sem super_admin = deny (fail-closed)', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'user',
      allModuleSlugs: all,
      implications,
      baseSlugs: [],
      overrides: [],
    });
    expect(slugs).toEqual([]);
  });

  it('hasModuleAccess', () => {
    expect(hasModuleAccess(['a'], 'a')).toBe(true);
    expect(hasModuleAccess(['a'], 'b')).toBe(false);
  });

  it('expandImplications', () => {
    expect(expandImplications(['futebol_treinadores'], implications)).toContain('relatorios_futebol');
  });
});
