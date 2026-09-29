import { computeMedicalOperationalState } from './medical-player-operational.util';

describe('computeMedicalOperationalState', () => {
  it('marca indisponível quando treino e jogo restritos', () => {
    const r = computeMedicalOperationalState({
      restrictTraining: true,
      restrictMatch: true,
      rtpDecision: null,
    });
    expect(r.status).toBe('unavailable');
    expect(r.summary).toContain('treino e jogo');
  });

  it('marca restrito só para jogo', () => {
    const r = computeMedicalOperationalState({
      restrictTraining: false,
      restrictMatch: true,
      rtpDecision: null,
    });
    expect(r.status).toBe('restricted');
    expect(r.summary).toContain('jogo');
  });

  it('RTP restrito prevalece sobre liberado sem flags', () => {
    const r = computeMedicalOperationalState({
      restrictTraining: false,
      restrictMatch: false,
      rtpDecision: 'restrito',
    });
    expect(r.status).toBe('unavailable');
    expect(r.summary).toContain('RTP');
  });

  it('não inclui texto de diagnóstico', () => {
    const r = computeMedicalOperationalState({
      restrictTraining: true,
      restrictMatch: false,
      rtpDecision: null,
    });
    expect(r.summary).not.toMatch(/entorse|fratura|dx/i);
  });
});
