import {
  buildProtocolResult,
  canStartCtFieldEvaluation,
  classifyHopTest,
  classifyPerimetria,
  classifyStopDown,
  classifyStopDownProtocol,
  classifyTTest,
  classifyYBalance,
  classifyYBalanceDirection,
  resolvePhysioClearanceOperationalStatus,
} from './physio-periodic-protocols.util';

describe('physio-periodic-protocols.util', () => {
  it('classifyYBalanceDirection', () => {
    expect(classifyYBalanceDirection(8)).toBe('aprovado');
    expect(classifyYBalanceDirection(11)).toBe('aceitavel');
    expect(classifyYBalanceDirection(13)).toBe('reprovado');
  });

  it('classifyYBalance', () => {
    const r = classifyYBalance({
      right: { frontal: 90, lateral: 88, cruzado: 85 },
      left: { frontal: 80, lateral: 88, cruzado: 85 },
    });
    expect(r.overall).toBe('aceitavel');
  });

  it('classifyTTest', () => {
    expect(classifyTTest(9)).toBe('aprovado');
    expect(classifyTTest(11)).toBe('aceitavel');
    expect(classifyTTest(14)).toBe('reprovado');
  });

  it('classifyHopTest', () => {
    const r = classifyHopTest({ rightJumps: [100, 105, 102], leftJumps: [98, 100, 99] });
    expect(r.overall).toBe('aceitavel');
  });

  it('classifyStopDownProtocol', () => {
    expect(classifyStopDownProtocol({ frontal: 1, lateral: 3 }).overall).toBe('ruim');
  });

  it('classifyPerimetria', () => {
    const r = classifyPerimetria({
      right: { proximal: 50, medial: 48, distal: 45 },
      left: { proximal: 44, medial: 48, distal: 45 },
      calfRight: 35,
      calfLeft: 34,
    });
    expect(['bom', 'razoavel', 'reprovado']).toContain(r.overall);
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
