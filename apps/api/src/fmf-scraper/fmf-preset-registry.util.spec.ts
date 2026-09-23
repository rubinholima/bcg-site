import {
  FMF_BUILTIN_PRESET_EXTENSIONS,
  listFmfPresetKeysForImport,
  mergeFmfPresetMaps,
  parseFmfPresetExtensions,
} from './fmf-preset-registry.util';

describe('fmf-preset-registry.util', () => {
  it('parseia extensões válidas ignorando entradas inválidas', () => {
    const parsed = parseFmfPresetExtensions({
      copa: {
        key: 'copa_master_mg',
        fmfD: 12,
        slug: 'copa-master-mg-2026',
        name: 'Copa Master MG 2026',
        fixtureCategory: 'copa_master_mg',
        competitionLabelTemplate: 'COPA MASTER - {year}',
      },
      bad: { fmfD: 9 },
    });
    expect(Object.keys(parsed)).toEqual(['copa_master_mg']);
    expect(parsed.copa_master_mg?.fmfD).toBe(12);
  });

  it('mescla preset builtin Copa Inconfidência Sub-20 (d=35)', () => {
    const merged = mergeFmfPresetMaps({});
    expect(merged.sub20_inconfidencia?.fmfD).toBe(35);
    expect(FMF_BUILTIN_PRESET_EXTENSIONS.sub20_inconfidencia.fixtureCategory).toBe(
      'sub20',
    );
    const keys = listFmfPresetKeysForImport({});
    expect(keys).toContain('sub20_inconfidencia');
  });

  it('lista builtins antes de extensões extras', () => {
    const keys = listFmfPresetKeysForImport({
      copa_master_mg: {
        key: 'copa_master_mg',
        fmfD: 12,
        slug: 'copa-master-mg-2026',
        name: 'Copa Master MG 2026',
        fixtureCategory: 'copa_master_mg',
        competitionLabelTemplate: 'COPA MASTER - {year}',
      },
    });
    expect(keys[0]).toBe('modulo_ii');
    expect(keys).toContain('copa_master_mg');
  });
});
