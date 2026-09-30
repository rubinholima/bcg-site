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

  it('base vazia sem legado = deny (fail-closed)', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'user',
      allModuleSlugs: all,
      implications,
      baseSlugs: [],
      legacyProfileSlugs: [],
      overrides: [],
    });
    expect(slugs).toEqual([]);
  });

  it('usuário sem função mantém slugs do perfil legado', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'editor',
      allModuleSlugs: all,
      implications,
      baseSlugs: [],
      legacyProfileSlugs: ['medico', 'adm_rh'],
      overrides: [],
    });
    expect(slugs).toEqual(['adm_rh', 'medico']);
  });

  it('função adiciona módulo sem remover legado', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard'],
      legacyProfileSlugs: ['medico'],
      overrides: [],
    });
    expect(slugs).toContain('dashboard');
    expect(slugs).toContain('medico');
  });

  it('ALLOW individual adiciona além de função e legado', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'editor',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard'],
      legacyProfileSlugs: ['medico'],
      overrides: [{ slug: 'futebol_treinadores', effect: 'allow' }],
    });
    expect(slugs).toContain('futebol_treinadores');
    expect(slugs).toContain('relatorios_futebol');
  });

  it('ALLOW após DENY no mesmo slug prevalece', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['adm_rh'],
      legacyProfileSlugs: [],
      overrides: [
        { slug: 'adm_rh', effect: 'deny' },
        { slug: 'adm_rh', effect: 'allow' },
      ],
    });
    expect(slugs).toContain('adm_rh');
  });

  it('hasModuleAccess', () => {
    expect(hasModuleAccess(['a'], 'a')).toBe(true);
    expect(hasModuleAccess(['a'], 'b')).toBe(false);
  });

  it('expandImplications', () => {
    expect(expandImplications(['futebol_treinadores'], implications)).toContain('relatorios_futebol');
  });
});
