import {
  FOOTBALL_MANAGEMENT_ROLE_SLUGS,
  isFootballManagementRole,
  isFootballOperationalModuleSlug,
} from './football-domain-access.util';

describe('Football domain access — management roles', () => {
  it('reconhece gerente, supervisor e gestor (alias Cup360)', () => {
    expect(FOOTBALL_MANAGEMENT_ROLE_SLUGS).toEqual(
      expect.arrayContaining(['gerente', 'supervisor', 'gestor']),
    );
    expect(isFootballManagementRole('gerente')).toBe(true);
    expect(isFootballManagementRole('GERENTE')).toBe(true);
    expect(isFootballManagementRole('supervisor')).toBe(true);
    expect(isFootballManagementRole('gestor')).toBe(true);
  });

  it('não inclui perfis operacionais específicos', () => {
    expect(isFootballManagementRole('treinador')).toBe(false);
    expect(isFootballManagementRole('rh')).toBe(false);
    expect(isFootballManagementRole('financeiro')).toBe(false);
    expect(isFootballManagementRole('analista')).toBe(false);
  });
});

describe('Football domain access — operational modules', () => {
  it('inclui módulos operacionais de Futebol', () => {
    expect(isFootballOperationalModuleSlug('futebol_logistica', 'futebol_tecnico')).toBe(true);
    expect(isFootballOperationalModuleSlug('futebol_jogos')).toBe(true);
    expect(isFootballOperationalModuleSlug('futebol_treinadores')).toBe(true);
    expect(isFootballOperationalModuleSlug('relatorios_futebol')).toBe(true);
    expect(isFootballOperationalModuleSlug('futebol/futebol_cadastros__cad_jogadores')).toBe(true);
    expect(isFootballOperationalModuleSlug('futebol_assistencia_social')).toBe(true);
    expect(isFootballOperationalModuleSlug('agenda__agenda')).toBe(true);
  });

  it('exclui módulos ADM/RH/Financeiro e relatórios globais', () => {
    expect(isFootballOperationalModuleSlug('adm_rh')).toBe(false);
    expect(isFootballOperationalModuleSlug('adm_financeiro')).toBe(false);
    expect(isFootballOperationalModuleSlug('relatorios_adm')).toBe(false);
    expect(isFootballOperationalModuleSlug('relatorios_saude')).toBe(false);
    expect(isFootballOperationalModuleSlug('adm__adm_rh')).toBe(false);
    expect(isFootballOperationalModuleSlug('saude__saude_visao')).toBe(false);
  });

  it('não classifica RH/Financeiro como Futebol só por slug ambíguo', () => {
    expect(isFootballOperationalModuleSlug('adm_nutricao')).toBe(false);
    expect(isFootballOperationalModuleSlug('marketing__marketing_noticias')).toBe(false);
  });
});

describe('Football domain access — representative module slugs', () => {
  const representative = [
    'futebol_logistica',
    'futebol_jogos',
    'futebol_treinadores',
    'futebol_fisiologia',
    'relatorios_futebol',
  ];

  it.each(representative)('%s é operacional Futebol', (slug) => {
    expect(isFootballOperationalModuleSlug(slug)).toBe(true);
  });
});
