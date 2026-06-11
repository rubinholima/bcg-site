/** Item mínimo para cálculo de timeline sincronizada do Canal Hall. */
export interface HallSyncItem {
  contentType: string;
  durationSeconds: number | null;
}

export function effectiveItemDurationMs(item: HallSyncItem): number {
  switch (item.contentType) {
    case 'image_url':
      return Math.max(5, item.durationSeconds ?? 10) * 1000;
    case 'youtube_video':
      return Math.max(30, item.durationSeconds ?? 480) * 1000;
    case 'video_url':
      return Math.max(30, item.durationSeconds ?? 120) * 1000;
    case 'iptv_stream':
      return Math.max(60, item.durationSeconds ?? 3600) * 1000;
    default:
      return 10_000;
  }
}

export function hallLoopDurationMs(items: HallSyncItem[]): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, it) => sum + effectiveItemDurationMs(it), 0);
}

export function hallPositionInLoop(
  items: HallSyncItem[],
  elapsedMs: number,
): { itemIndex: number; offsetMs: number } {
  const total = hallLoopDurationMs(items);
  if (items.length === 0 || total <= 0) {
    return { itemIndex: 0, offsetMs: 0 };
  }
  let pos = ((elapsedMs % total) + total) % total;
  for (let i = 0; i < items.length; i++) {
    const d = effectiveItemDurationMs(items[i]);
    if (pos < d) return { itemIndex: i, offsetMs: pos };
    pos -= d;
  }
  return { itemIndex: 0, offsetMs: 0 };
}

/** Posição no loop no início do próximo item. */
export function hallNextItemElapsedMs(items: HallSyncItem[], currentElapsedMs: number): number {
  const total = hallLoopDurationMs(items);
  if (total <= 0) return 0;
  const { itemIndex } = hallPositionInLoop(items, currentElapsedMs);
  let sum = 0;
  for (let i = 0; i <= itemIndex; i++) {
    sum += effectiveItemDurationMs(items[i]);
  }
  return sum >= total ? 0 : sum;
}

export function hallElapsedMs(
  epochAt: Date,
  isPaused: boolean,
  pausedElapsedMs: number,
  nowMs: number = Date.now(),
): number {
  if (isPaused) return pausedElapsedMs;
  return Math.max(0, nowMs - epochAt.getTime());
}
