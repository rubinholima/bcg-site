import {
  POSSESSION_STATE_KEYS,
  planPossessionTransition,
  possessionPercent,
  sumDurationMs,
  type OpenStateInterval,
} from './possession-state.util';

describe('possession-state', () => {
  const ourKey = POSSESSION_STATE_KEYS.our;
  const oppKey = POSSESSION_STATE_KEYS.opponent;
  const outKey = POSSESSION_STATE_KEYS.out;

  it('Our → Opponent fecha no mesmo instante', () => {
    const open: OpenStateInterval[] = [{ eventId: 'e1', tagKey: ourKey, startMs: 1000, endMs: null }];
    const plan = planPossessionTransition(open, 'opponent', 5000, oppKey);
    expect(plan.closeIds).toEqual(['e1']);
    expect(plan.createNew).toBe(true);
  });

  it('repetir mesmo estado não cria intervalo duplicado', () => {
    const open: OpenStateInterval[] = [{ eventId: 'e1', tagKey: ourKey, startMs: 1000, endMs: null }];
    const plan = planPossessionTransition(open, 'our', 3000, ourKey);
    expect(plan.createNew).toBe(false);
    expect(plan.closeIds).toEqual([]);
  });

  it('Possession → Out', () => {
    const open: OpenStateInterval[] = [{ eventId: 'e1', tagKey: oppKey, startMs: 0, endMs: null }];
    const plan = planPossessionTransition(open, 'out', 2000, outKey);
    expect(plan.closeIds).toEqual(['e1']);
    expect(plan.createNew).toBe(true);
  });

  it('Out → Possession', () => {
    const open: OpenStateInterval[] = [{ eventId: 'e1', tagKey: outKey, startMs: 100, endMs: null }];
    const plan = planPossessionTransition(open, 'our', 400, ourKey);
    expect(plan.closeIds).toEqual(['e1']);
    expect(plan.createNew).toBe(true);
  });

  it('sem overlaps na soma de duração', () => {
    const intervals: OpenStateInterval[] = [
      { eventId: 'a', tagKey: ourKey, startMs: 0, endMs: 10000 },
      { eventId: 'b', tagKey: ourKey, startMs: 15000, endMs: 20000 },
    ];
    expect(sumDurationMs(intervals, ourKey)).toBe(15000);
  });

  it('percentual só com intervalos válidos', () => {
    expect(possessionPercent(60000, 40000)).toEqual({ ourPct: 60, opponentPct: 40 });
    expect(possessionPercent(0, 0).ourPct).toBeNull();
  });
});
