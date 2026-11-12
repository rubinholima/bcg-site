import {
  buildEventsPostPath,
  freezePayload,
  nextQueueSequence,
  resolveFlushSessionId,
  resolveFlushSessionIdLegacyBug,
  sortQueueForFlush,
  type ImmutableQueuedEvent,
} from './live-tag-event-queue.util';

function item(partial: Partial<ImmutableQueuedEvent> & Pick<ImmutableQueuedEvent, 'sessionId' | 'sequence'>): ImmutableQueuedEvent {
  return {
    tenantId: 't1',
    clientEventKey: `k-${partial.sequence}`,
    capturedAtMs: 1000,
    payloadSnapshot: {},
    status: 'pending',
    ...partial,
  };
}

describe('live-tag-event-queue', () => {
  it('retry nunca envia evento da sessão A para sessão B (sessão ativa mudou)', () => {
    const sessionA = 'session-a-uuid';
    const sessionB = 'session-b-uuid';
    const queued = item({ sessionId: sessionA, sequence: 1 });
    expect(resolveFlushSessionId(queued, sessionB)).toBe(sessionA);
    expect(buildEventsPostPath(resolveFlushSessionId(queued, sessionB))).toBe(
      `/performance-analysis/sessions/${sessionA}/events`,
    );
  });

  it('documenta o bug legado: flush usava sessão ativa', () => {
    const queued = item({ sessionId: 'session-a', sequence: 1 });
    expect(resolveFlushSessionIdLegacyBug(queued, 'session-b')).toBe('session-b');
  });

  it('mantém ordenação por sequence no flush', () => {
    const q = [
      item({ sessionId: 's1', sequence: 3, status: 'pending' }),
      item({ sessionId: 's1', sequence: 1, status: 'synced' }),
      item({ sessionId: 's1', sequence: 2, status: 'failed' }),
    ];
    const order = sortQueueForFlush(q).map((x) => x.sequence);
    expect(order).toEqual([2, 3]);
  });

  it('payload congelado inclui tenant e sessão de origem', () => {
    const snap = freezePayload('tenant-x', 'sess-y', { tagDefinitionId: 'tag1', startMs: 500 }, 'ce-1');
    expect(snap._queueTenantId).toBe('tenant-x');
    expect(snap._queueSessionId).toBe('sess-y');
    expect(snap.clientEventKey).toBe('ce-1');
    expect(snap.startMs).toBe(500);
  });

  it('sequence monotônica', () => {
    const q = [item({ sessionId: 's', sequence: 4 }), item({ sessionId: 's', sequence: 9 })];
    expect(nextQueueSequence(q)).toBe(10);
  });
});
