import {
  computeBodyFatPercent,
  skinfoldKeysForProtocol,
} from './fisiologia-calculations.util';

describe('fisiologia-calculations protocols', () => {
  /** Valores da planilha Avaliação Danilo Silveira (maio/2022). */
  const danilo = {
    se: 32,
    tr: 16,
    pe: 17,
    ax: 19,
    si: 15,
    ab: 34,
    cx: 17,
  };

  it('Faulkner 4 bate com a planilha (%G ≈ 20,6)', () => {
    const pct = computeBodyFatPercent({
      protocol: 'faulkner_4',
      skinfolds: danilo,
    });
    expect(pct).toBe(20.6);
  });

  it('Guedes 3 masculino bate com a planilha (%G ≈ 21,5)', () => {
    const pct = computeBodyFatPercent({
      protocol: 'guedes_3',
      skinfolds: danilo,
    });
    expect(pct).toBe(21.5);
  });

  it('Jackson & Pollock 3 masculino (PE+AB+CX)', () => {
    const pct = computeBodyFatPercent({
      protocol: 'jackson_pollock_3',
      skinfolds: danilo,
      ageYears: 35,
    });
    // x1=68 → densidade e Siri
    expect(pct).toBeGreaterThan(15);
    expect(pct).toBeLessThan(25);
  });

  it('Jackson & Pollock 7 com décimos (Fluxo Fisiologia — Vanderlei)', () => {
    const pct = computeBodyFatPercent({
      protocol: 'jackson_pollock_7',
      skinfolds: {
        tr: 12.2,
        se: 13.2,
        si: 16.8,
        ab: 20.1,
        ax: 11.9,
        pe: 10.6,
        cx: 16.4,
      },
      ageYears: 14,
    });
    expect(pct).toBe(12.8);
  });

  it('exige só as dobras do protocolo', () => {
    expect(skinfoldKeysForProtocol('faulkner_4')).toEqual(['tr', 'se', 'si', 'ab']);
    expect(skinfoldKeysForProtocol('jackson_pollock_3')).toEqual(['pe', 'ab', 'cx']);
    expect(skinfoldKeysForProtocol('guedes_3')).toEqual(['tr', 'si', 'ab']);
  });

  it('não calcula Faulkner sem todas as 4 dobras', () => {
    expect(
      computeBodyFatPercent({
        protocol: 'faulkner_4',
        skinfolds: { tr: 10, se: 10, si: 10 },
      }),
    ).toBeNull();
  });
});
