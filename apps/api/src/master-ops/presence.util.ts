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

export type PresenceLiveSessionRow = {
  id: string;
  sessionKey: string;
  status: PresenceStatus;
  user: { id: string };
  lastActivityAt: string;
  [key: string]: unknown;
};

/** Uma linha por usuário — ONLINE prevalece; contexto da sessão mais recente. */
export function consolidateLiveUsersByUser<T extends PresenceLiveSessionRow>(
  items: T[],
): Array<T & { otherSessions?: T[] }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(item.user.id) ?? [];
    list.push(item);
    groups.set(item.user.id, list);
  }

  const consolidated: Array<T & { otherSessions?: T[] }> = [];

  for (const sessions of groups.values()) {
    if (sessions.length === 1) {
      consolidated.push(sessions[0]);
      continue;
    }

    const status: PresenceStatus = sessions.some((s) => s.status === 'online')
      ? 'online'
      : 'idle';
    const primary = sessions.reduce((best, cur) =>
      new Date(cur.lastActivityAt).getTime() >
      new Date(best.lastActivityAt).getTime()
        ? cur
        : best,
    );
    const others = sessions.filter((s) => s.id !== primary.id);

    consolidated.push({
      ...primary,
      status,
      ...(others.length ? { otherSessions: others } : {}),
    });
  }

  consolidated.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
    return (
      new Date(b.lastActivityAt).getTime() -
      new Date(a.lastActivityAt).getTime()
    );
  });

  return consolidated;
}

/** Tabela Master: uma linha por usuário, somente ONLINE (KPI ocioso separado). */
export function projectMasterLiveUsers<T extends PresenceLiveSessionRow>(
  items: T[],
): {
  items: Array<T & { otherSessions?: T[] }>;
  online: number;
  idle: number;
  total: number;
} {
  const consolidated = consolidateLiveUsersByUser(items);
  const idle = consolidated.filter((item) => item.status === 'idle').length;
  const onlineItems = consolidated
    .filter((item) => item.status === 'online')
    .map((item) => {
      const onlineOthers = item.otherSessions?.filter(
        (session) => session.status === 'online',
      );
      if (!onlineOthers?.length) {
        const { otherSessions: _removed, ...rest } = item;
        return rest as T & { otherSessions?: T[] };
      }
      return { ...item, otherSessions: onlineOthers };
    });

  return {
    items: onlineItems,
    online: onlineItems.length,
    idle,
    total: onlineItems.length,
  };
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
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua))
    browserLabel = 'Safari';

  let deviceLabel: string | null = 'Desktop';
  if (/iPhone|iPad|iPod/i.test(ua))
    deviceLabel = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
  else if (/Android/i.test(ua)) deviceLabel = 'Android';
  else if (/Mobile/i.test(ua)) deviceLabel = 'Mobile';

  return { browserLabel, deviceLabel };
}
