/** Online = atividade real recente; idle = heartbeat recente sem atividade. */
export const PRESENCE_ONLINE_MS = 2 * 60 * 1000;
export const PRESENCE_IDLE_MS = 15 * 60 * 1000;
export const PRESENCE_STALE_MS = 30 * 60 * 1000;

export type PresenceStatus = 'online' | 'idle';

export function resolvePresenceStatus(
  lastActivityAt: Date,
  lastSeenAt: Date,
  now = new Date(),
): PresenceStatus | null {
  const activityAge = now.getTime() - lastActivityAt.getTime();
  const seenAge = now.getTime() - lastSeenAt.getTime();
  if (seenAge > PRESENCE_IDLE_MS) return null;
  if (activityAge <= PRESENCE_ONLINE_MS) return 'online';
  return 'idle';
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function parseUserAgentLabels(userAgent?: string | null): {
  browserLabel: string | null;
  deviceLabel: string | null;
} {
  const ua = userAgent?.trim();
  if (!ua) return { browserLabel: null, deviceLabel: null };

  let browserLabel: string | null = null;
  if (/Edg\//i.test(ua)) browserLabel = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browserLabel = 'Chrome';
  else if (/Firefox\//i.test(ua)) browserLabel = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browserLabel = 'Safari';

  let deviceLabel: string | null = 'Desktop';
  if (/iPhone|iPad|iPod/i.test(ua)) deviceLabel = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
  else if (/Android/i.test(ua)) deviceLabel = 'Android';
  else if (/Mobile/i.test(ua)) deviceLabel = 'Mobile';

  return { browserLabel, deviceLabel };
}
