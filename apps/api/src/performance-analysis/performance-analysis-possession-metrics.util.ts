import { POSSESSION_STATE_KEYS } from './possession-state.util';
import { sumDurationMs, possessionPercent, type OpenStateInterval } from './possession-state.util';

export type PossessionDurationMetrics = {
  ourPossessionMs: number;
  opponentPossessionMs: number;
  ballOutMs: number;
  ourPossessionPct: number | null;
  opponentPossessionPct: number | null;
  legacyPossessionMarks: number;
  usesDurationIntervals: boolean;
};

type DurationEvent = {
  tagKey: string;
  startMs: number;
  endMs: number | null;
};

export function computePossessionDurationMetrics(
  events: DurationEvent[],
  legacyPossessionMarkCount: number,
): PossessionDurationMetrics {
  const intervals: OpenStateInterval[] = events.map((e, idx) => ({
    eventId: `ev-${idx}`,
    tagKey: e.tagKey,
    startMs: e.startMs,
    endMs: e.endMs,
  }));

  const ourMs = sumDurationMs(intervals, POSSESSION_STATE_KEYS.our);
  const oppMs = sumDurationMs(intervals, POSSESSION_STATE_KEYS.opponent);
  const outMs = sumDurationMs(intervals, POSSESSION_STATE_KEYS.out);
  const pct = possessionPercent(ourMs, oppMs);
  const usesDurationIntervals = events.some(
    (e) =>
      (e.tagKey === POSSESSION_STATE_KEYS.our ||
        e.tagKey === POSSESSION_STATE_KEYS.opponent ||
        e.tagKey === POSSESSION_STATE_KEYS.out) &&
      e.endMs != null &&
      e.endMs > e.startMs,
  );

  return {
    ourPossessionMs: ourMs,
    opponentPossessionMs: oppMs,
    ballOutMs: outMs,
    ourPossessionPct: pct.ourPct,
    opponentPossessionPct: pct.opponentPct,
    legacyPossessionMarks: legacyPossessionMarkCount,
    usesDurationIntervals,
  };
}
