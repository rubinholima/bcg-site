import {
  canChooseSensitiveDossierSections,
  listAvailableOptionalSections,
  resolveIncludedOptionalSections,
} from './player-dossier-access.util';

describe('player-dossier-access.util', () => {
  describe('canChooseSensitiveDossierSections', () => {
    it('permite gerente e diretoria', () => {
      expect(canChooseSensitiveDossierSections('gerente')).toBe(true);
      expect(canChooseSensitiveDossierSections('diretoria')).toBe(true);
    });

    it('nega super_admin, company_admin, gestor e supervisor', () => {
      expect(canChooseSensitiveDossierSections('super_admin')).toBe(false);
      expect(canChooseSensitiveDossierSections('company_admin')).toBe(false);
      expect(canChooseSensitiveDossierSections('gestor')).toBe(false);
      expect(canChooseSensitiveDossierSections('supervisor')).toBe(false);
    });

    it('nega perfis operacionais comuns', () => {
      expect(canChooseSensitiveDossierSections('treinador')).toBe(false);
      expect(canChooseSensitiveDossierSections('analista')).toBe(false);
    });
  });

  describe('resolveIncludedOptionalSections', () => {
    const modules = ['saude', 'futebol_treinadores', 'adm_nutricao'];

    it('retorna vazio para supervisor mesmo com módulos', () => {
      expect(
        resolveIncludedOptionalSections({
          role: 'supervisor',
          moduleSlugs: modules,
          requested: ['psychology', 'training', 'nutrition'],
        }),
      ).toEqual([]);
    });

    it('filtra por RBAC de módulo para gerente', () => {
      expect(
        resolveIncludedOptionalSections({
          role: 'gerente',
          moduleSlugs: modules,
          requested: ['psychology', 'training', 'nutrition', 'scouting'],
        }),
      ).toEqual(['psychology', 'training', 'nutrition']);
    });

    it('lista disponíveis conforme módulos do usuário', () => {
      expect(listAvailableOptionalSections(modules)).toEqual([
        'psychology',
        'physio',
        'nursing',
        'medical',
        'nutrition',
        'training',
      ]);
    });

    it('super_admin não bypassa seções opcionais', () => {
      expect(listAvailableOptionalSections([], 'super_admin')).toEqual([]);
      expect(
        resolveIncludedOptionalSections({
          role: 'super_admin',
          moduleSlugs: modules,
          requested: ['psychology', 'scouting', 'training'],
        }),
      ).toEqual([]);
    });
  });
});
