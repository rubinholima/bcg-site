import {
  resolveEffectiveModuleSlugs,
} from './effective-access.util';

describe('effective-access.util', () => {
  const all = ['dashboard', 'medico', 'futebol_tryouts', 'adm_rh'];
  const implications = [{ slug: 'futebol_treinadores', impliesSlug: 'relatorios_futebol' }];

  it('menu location não altera autorização (resolver puro)', () => {
    const a = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['medico'],
      overrides: [],
    });
    const b = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['medico'],
      overrides: [],
    });
    expect(a).toEqual(b);
  });

  it('falha fechada só quando função e legado vazios', () => {
    expect(
      resolveEffectiveModuleSlugs({
        role: 'editor',
        allModuleSlugs: all,
        implications,
        baseSlugs: [],
        legacyProfileSlugs: [],
        overrides: [],
      }),
    ).toEqual([]);
  });

  it('perfil legado ModuleRole continua disponível sem defaults de função', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'editor',
      allModuleSlugs: all,
      implications,
      baseSlugs: [],
      legacyProfileSlugs: ['medico'],
      overrides: [],
    });
    expect(slugs).toEqual(['medico']);
  });

  it('defaults da função somam ao legado sem apagar slugs só no perfil', () => {
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

  it('função atribuída não zera acesso legado (base parcial + legado)', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['futebol_tryouts'],
      legacyProfileSlugs: ['adm_rh'],
      overrides: [],
    });
    expect(slugs).toContain('futebol_tryouts');
    expect(slugs).toContain('adm_rh');
  });

  it('DENY explícito remove slug presente no legado ou na função', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard'],
      legacyProfileSlugs: ['medico'],
      overrides: [{ slug: 'medico', effect: 'deny' }],
    });
    expect(slugs).toContain('dashboard');
    expect(slugs).not.toContain('medico');
  });

  it('super_admin ignora base/legado/overrides e recebe catálogo inteiro', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'super_admin',
      allModuleSlugs: all,
      implications,
      baseSlugs: [],
      legacyProfileSlugs: [],
      overrides: [{ slug: 'dashboard', effect: 'deny' }],
      isSuperAdmin: true,
    });
    expect(slugs.sort()).toEqual([...all].sort());
  });

  it('ALLOW aplicado depois de DENY prevalece no mesmo slug', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard', 'adm_rh'],
      overrides: [
        { slug: 'adm_rh', effect: 'deny' },
        { slug: 'adm_rh', effect: 'allow' },
      ],
    });
    expect(slugs).toContain('adm_rh');
  });

  it('ALLOW e DENY individual', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'editor',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard'],
      overrides: [
        { slug: 'adm_rh', effect: 'allow' },
        { slug: 'dashboard', effect: 'deny' },
      ],
    });
    expect(slugs).toContain('adm_rh');
    expect(slugs).not.toContain('dashboard');
  });

  it('novo default na função alcança usuários sem deny', () => {
    const slugs = resolveEffectiveModuleSlugs({
      role: 'gerente',
      allModuleSlugs: all,
      implications,
      baseSlugs: ['dashboard', 'futebol_tryouts'],
      overrides: [],
    });
    expect(slugs).toContain('futebol_tryouts');
  });
});
