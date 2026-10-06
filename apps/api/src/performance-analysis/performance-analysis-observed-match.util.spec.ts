import {
  mapObservedMatchAnalysisState,
  OBSERVED_MATCH_ACTION_LABEL,
  OBSERVED_MATCH_STATUS_LABEL,
} from './performance-analysis-observed-match.util';

describe('performance-analysis-observed-match.util', () => {
  it('sem eventos ligados → não iniciada / analisar', () => {
    const r = mapObservedMatchAnalysisState({
      taggedEventCount: 0,
      sessionStatus: 'live',
      sessionId: 's1',
    });
    expect(r.status).toBe('NAO_INICIADA');
    expect(r.action).toBe('analyze');
    expect(OBSERVED_MATCH_STATUS_LABEL[r.status]).toBe('Não iniciada');
  });

  it('com eventos e sessão live → em análise / continuar', () => {
    const r = mapObservedMatchAnalysisState({
      taggedEventCount: 3,
      sessionStatus: 'live',
      sessionId: 's1',
    });
    expect(r.status).toBe('EM_ANALISE');
    expect(r.action).toBe('continue');
  });

  it('com eventos e sessão review → em revisão', () => {
    const r = mapObservedMatchAnalysisState({
      taggedEventCount: 1,
      sessionStatus: 'review',
      sessionId: 's1',
    });
    expect(r.status).toBe('EM_REVISAO');
    expect(r.action).toBe('review');
    expect(OBSERVED_MATCH_ACTION_LABEL[r.action]).toBe('Revisar');
  });

  it('com eventos e sessão completed → concluída', () => {
    const r = mapObservedMatchAnalysisState({
      taggedEventCount: 10,
      sessionStatus: 'completed',
      sessionId: 's1',
    });
    expect(r.status).toBe('CONCLUIDA');
    expect(r.action).toBe('view');
  });
});
