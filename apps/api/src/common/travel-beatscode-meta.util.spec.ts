import {
  mergeTravelBeatscodeMeta,
  PRESERVED_TRAVEL_BEATSCODE_META_KEYS,
} from './travel-beatscode-meta.util';

describe('mergeTravelBeatscodeMeta', () => {
  it('preserva pressKit ao sincronizar FMF', () => {
    const existing = {
      source: 'manual',
      pressKit: {
        starterPlayerIds: ['p1', 'p2'],
        persistedAt: '2026-08-28T10:00:00.000Z',
      },
      logisticsCadastros: { hotel: 'abc' },
    };
    const patch = {
      source: 'fmf',
      presetKey: 'sub13',
      phaseLabel: 'Final',
    };

    const merged = mergeTravelBeatscodeMeta(existing, patch);

    expect(merged.source).toBe('fmf');
    expect(merged.presetKey).toBe('sub13');
    expect(merged.pressKit).toEqual(existing.pressKit);
    expect(merged.logisticsCadastros).toEqual(existing.logisticsCadastros);
  });

  it('cria meta nova quando viagem não tinha beatscodeMeta', () => {
    const merged = mergeTravelBeatscodeMeta(undefined, { source: 'fmf' });
    expect(merged).toEqual({ source: 'fmf' });
  });

  it('expõe chaves preservadas esperadas', () => {
    expect(PRESERVED_TRAVEL_BEATSCODE_META_KEYS).toContain('pressKit');
  });
});
