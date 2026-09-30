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

  it('falha de resolução = deny (base vazia)', () => {
    expect(
      resolveEffectiveModuleSlugs({
        role: 'editor',
        allModuleSlugs: all,
        implications,
        baseSlugs: [],
        overrides: [],
      }),
    ).toEqual([]);
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
