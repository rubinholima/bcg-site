export type LiveClockState = {
  running: boolean;
  period: string;
  clockSeconds: number;
  /** Epoch ms when clock was last started/resumed */
  anchorAt: number | null;
  scoreHome: number | null;
  scoreAway: number | null;
  /** Added to video currentTime when syncing tag to video ms */
  videoSyncOffsetMs: number;
};

export const DEFAULT_LIVE_CLOCK: LiveClockState = {
  running: false,
  period: '1T',
  clockSeconds: 0,
  anchorAt: null,
  scoreHome: null,
  scoreAway: null,
  videoSyncOffsetMs: 0,
};

export function parseLiveClock(raw: unknown): LiveClockState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LIVE_CLOCK };
  const o = raw as Record<string, unknown>;
  return {
    running: Boolean(o.running),
    period: typeof o.period === 'string' ? o.period : '1T',
    clockSeconds: typeof o.clockSeconds === 'number' ? Math.max(0, Math.floor(o.clockSeconds)) : 0,
    anchorAt: typeof o.anchorAt === 'number' ? o.anchorAt : null,
    scoreHome: typeof o.scoreHome === 'number' ? o.scoreHome : null,
    scoreAway: typeof o.scoreAway === 'number' ? o.scoreAway : null,
    videoSyncOffsetMs: typeof o.videoSyncOffsetMs === 'number' ? o.videoSyncOffsetMs : 0,
  };
}

/** Effective clock seconds (includes elapsed since anchor when running). */
export function effectiveClockSeconds(state: LiveClockState, nowMs = Date.now()): number {
  if (!state.running || state.anchorAt == null) return state.clockSeconds;
  const elapsed = Math.floor((nowMs - state.anchorAt) / 1000);
  return state.clockSeconds + Math.max(0, elapsed);
}

export function applyClockCommand(
  state: LiveClockState,
  cmd: {
    action: 'start' | 'pause' | 'resume' | 'reset' | 'set_period' | 'set_clock' | 'set_score';
    period?: string;
    clockSeconds?: number;
    scoreHome?: number | null;
    scoreAway?: number | null;
  },
  nowMs = Date.now(),
): LiveClockState {
  const base = { ...state, clockSeconds: effectiveClockSeconds(state, nowMs) };
  switch (cmd.action) {
    case 'start':
      return { ...base, running: true, anchorAt: nowMs };
    case 'pause':
      return { ...base, running: false, anchorAt: null };
    case 'resume':
      return { ...base, running: true, anchorAt: nowMs };
    case 'reset':
      return { ...DEFAULT_LIVE_CLOCK };
    case 'set_period':
      return {
        ...base,
        running: false,
        anchorAt: null,
        period: cmd.period?.trim() || base.period,
      };
    case 'set_clock':
      return {
        ...base,
        running: false,
        anchorAt: null,
        clockSeconds: cmd.clockSeconds ?? 0,
      };
    case 'set_score':
      return {
        ...base,
        scoreHome: cmd.scoreHome ?? null,
        scoreAway: cmd.scoreAway ?? null,
      };
    default:
      return base;
  }
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
