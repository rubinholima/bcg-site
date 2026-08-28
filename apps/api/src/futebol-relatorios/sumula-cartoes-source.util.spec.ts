import { resolveSumulaCartoesSource, getConfiguredSumulaCartoesSource } from './sumula-cartoes-source.util';
import type { MatchReconciliationDetail } from '../fmf-scraper/match-official-event.types';

const emptyReconciliation: MatchReconciliationDetail = {
  roster: {
    player: { source: 0, structured: 0, resolved: 0, unresolved: 0, ambiguous: 0, rows: [] },
    staff: { source: 0, structured: 0, rows: [] },
  },
  events: {
    player: [],
    staff: [],
    summary: {
      matched: 0,
      unresolved: 0,
      ambiguous: 0,
      missing: 0,
      drifted: 0,
      stale: 0,
      extra: 0,
    },
  },
  messages: [],
  limitations: [],
};

describe('sumula-cartoes-source.util', () => {
  it('getConfiguredSumulaCartoesSource default auto', () => {
    const prev = process.env.SUMULA_CARTOES_SOURCE;
    delete process.env.SUMULA_CARTOES_SOURCE;
    expect(getConfiguredSumulaCartoesSource()).toBe('auto');
    process.env.SUMULA_CARTOES_SOURCE = prev;
  });

  it('legacy mode nunca usa events', () => {
    const decision = resolveSumulaCartoesSource({
      configured: 'legacy',
      parsed: {} as never,
      persistedEventCount: 10,
      reconciliation: emptyReconciliation,
      integrityStatus: 'synced',
      limitations: [],
    });
    expect(decision.effectiveMode).toBe('legacy');
  });

  it('auto usa events com identidade unresolved (fidelidade da fonte)', () => {
    const decision = resolveSumulaCartoesSource({
      configured: 'auto',
      parsed: {} as never,
      persistedEventCount: 5,
      reconciliation: {
        ...emptyReconciliation,
        events: {
          ...emptyReconciliation.events,
          summary: {
            matched: 3,
            unresolved: 2,
            ambiguous: 0,
            missing: 0,
            drifted: 0,
            stale: 0,
            extra: 0,
          },
        },
      },
      integrityStatus: 'unresolved',
      limitations: [],
    });
    expect(decision.effectiveMode).toBe('events');
    expect(decision.fallbackReason).toBeUndefined();
  });

  it('auto faz fallback quando integridade failed (missing)', () => {
    const decision = resolveSumulaCartoesSource({
      configured: 'auto',
      parsed: {} as never,
      persistedEventCount: 3,
      reconciliation: {
        ...emptyReconciliation,
        events: {
          ...emptyReconciliation.events,
          summary: {
            matched: 2,
            unresolved: 0,
            ambiguous: 0,
            missing: 1,
            drifted: 0,
            stale: 0,
            extra: 0,
          },
        },
      },
      integrityStatus: 'failed',
      limitations: [],
    });
    expect(decision.effectiveMode).toBe('legacy');
    expect(decision.fallbackReason).toContain('ausente');
  });

  it('events mode faz fallback sem eventos persistidos', () => {
    const decision = resolveSumulaCartoesSource({
      configured: 'events',
      parsed: {} as never,
      persistedEventCount: 0,
      reconciliation: null,
      integrityStatus: null,
      limitations: [],
    });
    expect(decision.effectiveMode).toBe('legacy');
    expect(decision.fallbackReason).toContain('Nenhum evento');
  });
});
