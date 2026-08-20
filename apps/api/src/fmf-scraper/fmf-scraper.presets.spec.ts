import {
  competitionLabelForTenantCategory,
  findFmfPresetByFixtureCategory,
  fmfCompetitionLabelForPreset,
  inferCategoryFromCompetitionLabel,
} from './fmf-scraper.presets';

describe('fmf-scraper.presets', () => {
  it('inclui preset sub13 com d=40', () => {
    const preset = findFmfPresetByFixtureCategory('sub13');
    expect(preset?.key).toBe('sub13');
    expect(preset?.fmfD).toBe(40);
    expect(fmfCompetitionLabelForPreset('sub13', 2026)).toBe(
      'SUB 13 - 1ª DIVISÃO - 2026',
    );
  });

  it('infere categoria a partir do rótulo FMF', () => {
    expect(
      inferCategoryFromCompetitionLabel('SUB 20 - 1ª DIVISÃO - 2026'),
    ).toBe('sub20');
    expect(
      inferCategoryFromCompetitionLabel('SUB 13 - 1ª DIVISÃO 2026'),
    ).toBe('sub13');
    expect(inferCategoryFromCompetitionLabel('MÓDULO II - 2026')).toBe(
      'modulo_ii',
    );
  });

  it('gera rótulo sintético para categoria sem preset FMF', () => {
    expect(competitionLabelForTenantCategory('sub12', 2026)).toBe(
      'SUB 12 - 2026',
    );
    expect(inferCategoryFromCompetitionLabel('SUB 12 - 2026')).toBe('sub12');
  });
});
