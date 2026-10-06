import { ForbiddenException } from '@nestjs/common';
import {
  assertAnalysisMaterialAccess,
  canAccessAnalysisMaterialInDossier,
  dedupeMaterialIds,
  parseAnalysisMaterialIdsRaw,
} from './player-dossier-analysis-material.util';

describe('player-dossier-analysis-material.util', () => {
  it('dedupe e parse de IDs', () => {
    expect(parseAnalysisMaterialIdsRaw(' a, b ,a,c ')).toEqual(['a', 'b', 'c']);
    expect(dedupeMaterialIds(['x', 'x', 'y'])).toEqual(['x', 'y']);
  });

  it('acesso exige módulo futebol_analise_desempenho', () => {
    expect(canAccessAnalysisMaterialInDossier(['futebol_analise_desempenho'], 'editor')).toBe(true);
    expect(canAccessAnalysisMaterialInDossier(['futebol_analise'], 'editor')).toBe(false);
    expect(canAccessAnalysisMaterialInDossier([], 'company_admin')).toBe(true);
  });

  it('assertAnalysisMaterialAccess bloqueia seleção sem módulo', () => {
    expect(() =>
      assertAnalysisMaterialAccess(['futebol_analise'], 'editor', true),
    ).toThrow(ForbiddenException);
    expect(() => assertAnalysisMaterialAccess(['futebol_analise'], 'editor', false)).not.toThrow();
  });
});
