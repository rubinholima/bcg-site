import { computePossessionDurationMetrics } from './performance-analysis-possession-metrics.util';
import { POSSESSION_STATE_KEYS } from './possession-state.util';

describe('possession duration metrics', () => {
  it('não reinterpreta posse_bola legado como duração', () => {
    const m = computePossessionDurationMetrics(
      [{ tagKey: 'posse_bola', startMs: 0, endMs: null }],
      3,
    );
    expect(m.ourPossessionMs).toBe(0);
    expect(m.legacyPossessionMarks).toBe(3);
    expect(m.usesDurationIntervals).toBe(false);
  });

  it('soma intervalos de estado novo', () => {
    const m = computePossessionDurationMetrics(
      [
        {
          tagKey: POSSESSION_STATE_KEYS.our,
          startMs: 0,
          endMs: 10000,
        },
        {
          tagKey: POSSESSION_STATE_KEYS.opponent,
          startMs: 10000,
          endMs: 25000,
        },
      ],
      0,
    );
    expect(m.ourPossessionMs).toBe(10000);
    expect(m.opponentPossessionMs).toBe(15000);
    expect(m.usesDurationIntervals).toBe(true);
    expect(m.ourPossessionPct).toBe(40);
  });
});
