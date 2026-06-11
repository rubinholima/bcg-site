/** Espelho client-side de apps/api/src/boston-tv/boston-tv-hall-sync.util.ts */

export interface HallSyncItem {
  contentType: string;
  durationSeconds: number | null;
}

export interface HallSyncSnapshot {
  serverNow: string;
  paused: boolean;
  playlistVersion: number;
  itemIndex: number;
  offsetMs: number;
  itemDurationMs: number;
  loopDurationMs: number;
}

export function effectiveItemDurationMs(item: HallSyncItem): number {
  switch (item.contentType) {
    case "image_url":
      return Math.max(5, item.durationSeconds ?? 10) * 1000;
    case "youtube_video":
      return Math.max(30, item.durationSeconds ?? 480) * 1000;
    case "video_url":
      return Math.max(30, item.durationSeconds ?? 120) * 1000;
    case "iptv_stream":
      if (item.durationSeconds != null && item.durationSeconds < 3600) {
        return 3600 * 1000;
      }
      return (item.durationSeconds ?? 86400) * 1000;
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

/** Posição atual no loop a partir do snapshot do servidor + relógio local. */
export function extrapolateHallPosition(
  sync: HallSyncSnapshot,
  items: HallSyncItem[],
  clientNowMs: number = Date.now(),
): { itemIndex: number; offsetMs: number } {
  if (items.length === 0) {
    return { itemIndex: 0, offsetMs: 0 };
  }

  if (sync.paused) {
    return { itemIndex: sync.itemIndex, offsetMs: sync.offsetMs };
  }

  const serverNowMs = new Date(sync.serverNow).getTime();
  const driftMs = Math.max(0, clientNowMs - serverNowMs);

  let elapsedInItem = sync.offsetMs + driftMs;
  let idx = sync.itemIndex % items.length;

  for (let step = 0; step < items.length; step++) {
    const dur = effectiveItemDurationMs(items[idx]);
    if (elapsedInItem < dur) {
      return { itemIndex: idx, offsetMs: elapsedInItem };
    }
    elapsedInItem -= dur;
    idx = (idx + 1) % items.length;
  }

  return { itemIndex: sync.itemIndex, offsetMs: sync.offsetMs };
}
