import { buildCanonicalOperationalPatch } from './performance-analysis-tag-normalization.util';
import { DEFAULT_ANALYSIS_TAGS } from './performance-analysis.constants';

describe('performance-analysis-tag-normalization.util', () => {
  const finalCanon = DEFAULT_ANALYSIS_TAGS.find((t) => t.key === 'finalizacao')!;

  it('preenche shortcutKey ausente sem alterar label customizado', () => {
    const patch = buildCanonicalOperationalPatch(
      {
        key: 'finalizacao',
        label: 'Chute custom',
        outcomes: ['gol', 'no_gol', 'bloqueada', 'fora'],
        shortcutKey: null,
        requiresPlayer: false,
        autoClipEnabled: false,
        autoClipPreMs: 8000,
        autoClipPostMs: 4000,
      },
      finalCanon,
    );
    expect(patch.shortcutKey).toBe('f');
    expect(patch).not.toHaveProperty('label');
  });

  it('atualiza outcomes legados de finalização', () => {
    const patch = buildCanonicalOperationalPatch(
      {
        key: 'finalizacao',
        label: 'Finalização',
        outcomes: ['gol', 'no_gol', 'bloqueada', 'fora'],
        shortcutKey: 'f',
        requiresPlayer: true,
        autoClipEnabled: false,
        autoClipPreMs: 8000,
        autoClipPostMs: 4000,
      },
      finalCanon,
    );
    expect(patch.outcomes).toEqual(finalCanon.outcomes);
    expect(patch.autoClipEnabled).toBe(true);
  });

  it('segunda passagem idempotente quando já normalizado', () => {
    const row = {
      key: 'passe',
      label: 'Passe',
      outcomes: ['certo', 'errado'],
      shortcutKey: 'p',
      requiresPlayer: true,
      autoClipEnabled: false,
      autoClipPreMs: 8000,
      autoClipPostMs: 4000,
    };
    const canon = DEFAULT_ANALYSIS_TAGS.find((t) => t.key === 'passe')!;
    expect(buildCanonicalOperationalPatch(row, canon)).toEqual({});
  });
});
