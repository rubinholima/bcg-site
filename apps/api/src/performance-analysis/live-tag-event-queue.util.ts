/** Contrato da fila Live Tag — usado em testes e como referência para o cliente web. */

export type QueueItemStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export type ImmutableQueuedEvent = {
  sequence: number;
  tenantId: string;
  sessionId: string;
  clientEventKey: string;
  capturedAtMs: number;
  payloadSnapshot: Record<string, unknown>;
  status: QueueItemStatus;
  error?: string;
  serverEventId?: string;
};

/** Destino do POST: sempre a sessão gravada no item — nunca a sessão ativa na UI. */
export function resolveFlushSessionId(item: Pick<ImmutableQueuedEvent, 'sessionId'>, _activeUiSessionId: string | null): string {
  return item.sessionId;
}

export function buildEventsPostPath(sessionId: string): string {
  return `/performance-analysis/sessions/${sessionId}/events`;
}

/** Reproduz o bug antigo (enviar para sessão B) para testes de regressão. */
export function resolveFlushSessionIdLegacyBug(
  item: Pick<ImmutableQueuedEvent, 'sessionId'>,
  activeUiSessionId: string | null,
): string {
  return activeUiSessionId ?? item.sessionId;
}

export function sortQueueForFlush(items: ImmutableQueuedEvent[]): ImmutableQueuedEvent[] {
  return [...items]
    .filter((q) => q.status === 'pending' || q.status === 'failed')
    .sort((a, b) => a.sequence - b.sequence);
}

export function nextQueueSequence(items: ImmutableQueuedEvent[]): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.sequence)) + 1;
}

export function freezePayload(
  tenantId: string,
  sessionId: string,
  payload: Record<string, unknown>,
  clientEventKey: string,
): Record<string, unknown> {
  return {
    ...payload,
    clientEventKey,
    source: payload.source ?? 'LIVE',
    _queueTenantId: tenantId,
    _queueSessionId: sessionId,
  };
}
