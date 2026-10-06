/** Espelho dos rótulos da API — UI adversário. */
export type ObservedMatchAnalysisUiStatus =
  | "NAO_INICIADA"
  | "EM_ANALISE"
  | "EM_REVISAO"
  | "CONCLUIDA";

export type ObservedMatchAnalysisAction = "analyze" | "continue" | "review" | "view";

export const OBSERVED_MATCH_STATUS_LABEL: Record<ObservedMatchAnalysisUiStatus, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANALISE: "Em análise",
  EM_REVISAO: "Em revisão",
  CONCLUIDA: "Concluída",
};

export const OBSERVED_MATCH_ACTION_LABEL: Record<ObservedMatchAnalysisAction, string> = {
  analyze: "Analisar",
  continue: "Continuar",
  review: "Revisar",
  view: "Ver análise",
};

export function mapObservedMatchAnalysisState(input: {
  taggedEventCount: number;
  sessionStatus: string | null;
  sessionId: string | null;
}): {
  status: ObservedMatchAnalysisUiStatus;
  action: ObservedMatchAnalysisAction;
} {
  if (input.taggedEventCount <= 0 || !input.sessionId) {
    return { status: "NAO_INICIADA", action: "analyze" };
  }
  const st = (input.sessionStatus ?? "preparation").toLowerCase();
  if (st === "review") return { status: "EM_REVISAO", action: "review" };
  if (st === "completed") return { status: "CONCLUIDA", action: "view" };
  return { status: "EM_ANALISE", action: "continue" };
}

export function observedMatchSessionHref(
  action: ObservedMatchAnalysisAction,
  sessionId: string,
  observedMatchId: string,
  querySuffix: string,
): string {
  const base = `/dashboard/futebol/analise-desempenho/sessoes/${sessionId}`;
  const params = new URLSearchParams(querySuffix.replace(/^\?/, ""));
  params.set("observedMatchId", observedMatchId);
  if (action === "review") {
    return `${base}/revisao?${params.toString()}`;
  }
  if (action === "continue" || action === "analyze" || action === "view") {
    params.set("tab", action === "view" ? "visao" : "tagging");
    return `${base}?${params.toString()}`;
  }
  return `${base}?${params.toString()}`;
}
