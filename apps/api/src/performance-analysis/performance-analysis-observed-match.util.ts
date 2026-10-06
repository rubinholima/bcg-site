/** Status de análise por jogo observado — só com eventos ligados (observedMatchId). */
export type ObservedMatchAnalysisUiStatus =
  | 'NAO_INICIADA'
  | 'EM_ANALISE'
  | 'EM_REVISAO'
  | 'CONCLUIDA';

export type ObservedMatchAnalysisAction = 'analyze' | 'continue' | 'review' | 'view';

export function mapObservedMatchAnalysisState(input: {
  taggedEventCount: number;
  sessionStatus: string | null;
  sessionId: string | null;
}): {
  status: ObservedMatchAnalysisUiStatus;
  action: ObservedMatchAnalysisAction;
  sessionId: string | null;
} {
  if (input.taggedEventCount <= 0 || !input.sessionId) {
    return { status: 'NAO_INICIADA', action: 'analyze', sessionId: input.sessionId };
  }

  const st = (input.sessionStatus ?? 'preparation').toLowerCase();
  if (st === 'review') {
    return { status: 'EM_REVISAO', action: 'review', sessionId: input.sessionId };
  }
  if (st === 'completed') {
    return { status: 'CONCLUIDA', action: 'view', sessionId: input.sessionId };
  }
  return { status: 'EM_ANALISE', action: 'continue', sessionId: input.sessionId };
}

export const OBSERVED_MATCH_STATUS_LABEL: Record<ObservedMatchAnalysisUiStatus, string> = {
  NAO_INICIADA: 'Não iniciada',
  EM_ANALISE: 'Em análise',
  EM_REVISAO: 'Em revisão',
  CONCLUIDA: 'Concluída',
};

export const OBSERVED_MATCH_ACTION_LABEL: Record<ObservedMatchAnalysisAction, string> = {
  analyze: 'Analisar',
  continue: 'Continuar',
  review: 'Revisar',
  view: 'Ver análise',
};
