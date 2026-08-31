import {
  FISIO_STATUS_PREFIX,
  PROTECTED_PLAYER_STATUSES,
  TRANSITION_STATUS_PREFIX,
  resolvePhysioTransitionAvailability,
  shouldClearFisioTransitionStatus,
} from './physio-player-availability.util';

describe('resolvePhysioTransitionAvailability', () => {
  const base = {
    playerStatus: 'available',
    playerStatusDetails: null,
    physioDetailsBase: 'Joelho',
    physioLatestEnd: null,
    transitionSummary: 'Origem',
  };

  it('A — em_tratamento mantém available com detalhe fisio', () => {
    const r = resolvePhysioTransitionAvailability({
      ...base,
      activePhysioSessions: [{ disposition: 'em_tratamento' }],
      hasActiveTransitionProgram: false,
    });
    expect(r).toEqual({
      kind: 'update',
      status: 'available',
      statusDetails: `${FISIO_STATUS_PREFIX} EM TRATAMENTO (pode treinar) · Joelho`,
      statusUntil: null,
    });
  });

  it('B — nao_apto bloqueia treino', () => {
    const r = resolvePhysioTransitionAvailability({
      ...base,
      activePhysioSessions: [{ disposition: 'nao_apto' }],
      hasActiveTransitionProgram: false,
    });
    expect(r.kind).toBe('update');
    if (r.kind === 'update') {
      expect(r.status).toBe('injured');
      expect(r.statusDetails).toContain('NÃO APTO');
    }
  });

  it('D — transição active bloqueia mesmo sem fisio active', () => {
    const r = resolvePhysioTransitionAvailability({
      ...base,
      activePhysioSessions: [],
      hasActiveTransitionProgram: true,
    });
    expect(r).toEqual({
      kind: 'update',
      status: 'injured',
      statusDetails: `${TRANSITION_STATUS_PREFIX} EM TRANSIÇÃO · Origem`,
      statusUntil: null,
    });
  });

  it('prioriza nao_apto sobre transição active', () => {
    const r = resolvePhysioTransitionAvailability({
      ...base,
      activePhysioSessions: [{ disposition: 'nao_apto' }],
      hasActiveTransitionProgram: true,
    });
    expect(r.kind).toBe('update');
    if (r.kind === 'update') {
      expect(r.statusDetails).toContain(FISIO_STATUS_PREFIX);
    }
  });

  it('não altera status protegido (suspensão)', () => {
    const r = resolvePhysioTransitionAvailability({
      ...base,
      playerStatus: 'suspended',
      activePhysioSessions: [{ disposition: 'nao_apto' }],
      hasActiveTransitionProgram: true,
    });
    expect(r).toEqual({ kind: 'no_change' });
  });

  it('C/F — sem fisio active e sem transição limpa restrição', () => {
    const r = resolvePhysioTransitionAvailability({
      ...base,
      activePhysioSessions: [],
      hasActiveTransitionProgram: false,
    });
    expect(r).toEqual({ kind: 'clear_fisio_transition' });
  });
});

describe('shouldClearFisioTransitionStatus', () => {
  it('limpa apenas prefixos fisio/transição', () => {
    expect(shouldClearFisioTransitionStatus('injured', `${FISIO_STATUS_PREFIX} x`)).toBe(true);
    expect(shouldClearFisioTransitionStatus('available', `${TRANSITION_STATUS_PREFIX} x`)).toBe(
      true,
    );
    expect(shouldClearFisioTransitionStatus('injured', 'Suspenso')).toBe(false);
  });

  it('não limpa status protegidos', () => {
    for (const s of PROTECTED_PLAYER_STATUSES) {
      expect(shouldClearFisioTransitionStatus(s, `${FISIO_STATUS_PREFIX} x`)).toBe(false);
    }
  });
});
