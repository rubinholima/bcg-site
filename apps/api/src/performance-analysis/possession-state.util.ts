export const POSSESSION_STATE_KEYS = {
  our: 'state_posse_proprio',
  opponent: 'state_posse_adversario',
  out: 'state_bola_fora',
} as const;

export type PossessionTransitionTarget = keyof typeof POSSESSION_STATE_KEYS;

export type OpenStateInterval = {
  eventId: string;
  tagKey: string;
  startMs: number;
  endMs: number | null;
};

/** Fecha intervalos abertos no mesmo instante; não abre novo se já ativo com mesma chave. */
export function planPossessionTransition(
  openIntervals: OpenStateInterval[],
  target: PossessionTransitionTarget,
  atMs: number,
  targetTagKey: string,
): { closeIds: string[]; createNew: boolean } {
  const sameActive = openIntervals.find((i) => i.endMs == null && i.tagKey === targetTagKey);
  if (sameActive) {
    return { closeIds: [], createNew: false };
  }
  const closeIds = openIntervals.filter((i) => i.endMs == null).map((i) => i.eventId);
  return { closeIds, createNew: true };
}

export function sumDurationMs(intervals: OpenStateInterval[], tagKey: string): number {
  let total = 0;
  for (const i of intervals) {
    if (i.tagKey !== tagKey) continue;
    const end = i.endMs ?? i.startMs;
    if (end > i.startMs) total += end - i.startMs;
  }
  return total;
}

export function possessionPercent(
  ourMs: number,
  opponentMs: number,
): { ourPct: number | null; opponentPct: number | null } {
  const played = ourMs + opponentMs;
  if (played <= 0) return { ourPct: null, opponentPct: null };
  const ourPct = Math.round((ourMs / played) * 1000) / 10;
  const opponentPct = Math.round((opponentMs / played) * 1000) / 10;
  return { ourPct, opponentPct };
}
