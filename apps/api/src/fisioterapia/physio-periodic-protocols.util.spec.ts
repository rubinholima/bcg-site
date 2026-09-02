import {
  buildProtocolResult,
  canStartCtFieldEvaluation,
  classifyHopTest,
  classifyHopTestDirection,
  classifyPerimetria,
  classifyPerimetryPair,
  classifyStopDown,
  classifyStopDownProtocol,
  classifyTTest,
  classifyYBalance,
  classifyYBalanceDirection,
  pctDifference,
  resolvePhysioClearanceOperationalStatus,
} from './physio-periodic-protocols.util';

describe('physio-periodic-protocols.util', () => {
  it('pctDifference uses max absolute side as denominator', () => {
    expect(pctDifference(90, 80)).toBeCloseTo(11.111, 2);
    expect(pctDifference(80, 90)).toBeCloseTo(11.111, 2);
  });

  it('classifyYBalanceDirection', () => {
    expect(classifyYBalanceDirection(10)).toBe('aprovado');
    expect(classifyYBalanceDirection(10.01)).toBe('aceitavel');
    expect(classifyYBalanceDirection(12)).toBe('aceitavel');
    expect(classifyYBalanceDirection(12.01)).toBe('reprovado');
  });

  it('classifyHopTestDirection matches Y Balance', () => {
    expect(classifyHopTestDirection(8)).toBe('aprovado');
    expect(classifyHopTestDirection(11)).toBe('aceitavel');
    expect(classifyHopTestDirection(13)).toBe('reprovado');
  });

  it('classifyYBalance', () => {
    const r = classifyYBalance({
      right: { frontal: 90, lateral: 88, cruzado: 85 },
      left: { frontal: 80, lateral: 88, cruzado: 85 },
    });
    expect(r.overall).toBe('aceitavel');
    expect(r.differencesAbs.frontal).toBe(10);
  });

  it('classifyTTest', () => {
    expect(classifyTTest(9)).toBe('aprovado');
    expect(classifyTTest(11)).toBe('aceitavel');
    expect(classifyTTest(14)).toBe('reprovado');
  });

  it('classifyHopTest compares best jumps bilaterally', () => {
    const r = classifyHopTest({ rightJumps: [100, 105, 102], leftJumps: [98, 100, 99] });
    expect(r.rightBest).toBe(105);
    expect(r.leftBest).toBe(100);
    expect(r.overall).toBe('aprovado');
  });

  it('classifyStopDownProtocol', () => {
    expect(classifyStopDownProtocol({ frontal: 1, lateral: 3 }).overall).toBe('ruim');
  });

  it('classifyPerimetryPair boundaries', () => {
    expect(classifyPerimetryPair(100, 90)).toBe('aprovado');
    expect(classifyPerimetryPair(100, 89.9)).toBe('aceitavel');
    expect(classifyPerimetryPair(100, 85)).toBe('aceitavel');
    expect(classifyPerimetryPair(100, 84.9)).toBe('reprovado');
  });

  it('buildProtocolResult y_balance stores bilateral computed', () => {
    const r = buildProtocolResult('y_balance', {
      right: { frontal: 90, lateral: 88, cruzado: 85 },
      left: { frontal: 80, lateral: 88, cruzado: 85 },
    });
    const computed = r.payload.computed as {
      differences: Record<string, number>;
      differencesAbs: Record<string, number>;
      classifications: Record<string, string>;
    };
    expect(r.classification).toBe('aceitavel');
    expect(computed.differencesAbs.frontal).toBe(10);
    expect(computed.classifications.frontal).toBe('aceitavel');
  });

  it('buildProtocolResult hop_test uses best jumps', () => {
    const r = buildProtocolResult('hop_test', {
      rightJumps: [100, 110, 105],
      leftJumps: [98, 100, 99],
    });
    const computed = r.payload.computed as { rightBest: number; leftBest: number; diffPct: number };
    expect(computed.rightBest).toBe(110);
    expect(computed.leftBest).toBe(100);
    expect(computed.diffPct).toBeCloseTo(9.09, 1);
    expect(r.classification).toBe('aprovado');
  });

  it('classifyPerimetria', () => {
    const r = classifyPerimetria({
      right: { proximal: 50, medial: 48, distal: 45 },
      left: { proximal: 44, medial: 48, distal: 45 },
      calfRight: 35,
      calfLeft: 34,
    });
    expect(r.overall).toBe('aceitavel');
  });

  it('buildProtocolResult t_test', () => {
    const r = buildProtocolResult('t_test', { seconds: 10.5 });
    expect(r.classification).toBe('aceitavel');
  });

  it('resolvePhysioClearanceOperationalStatus', () => {
    expect(resolvePhysioClearanceOperationalStatus(null)).toBe('pendente');
    expect(resolvePhysioClearanceOperationalStatus({ outcome: 'aprovado' })).toBe('aprovado');
    expect(canStartCtFieldEvaluation('aprovado')).toBe(true);
    expect(canStartCtFieldEvaluation('pendente')).toBe(false);
  });
});
