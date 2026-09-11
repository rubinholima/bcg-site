import {
  consolidateLiveUsersByUser,
  formatDurationMs,
  projectMasterLiveUsers,
  resolvePresenceStatus,
  PRESENCE_IDLE_MS,
  PRESENCE_ONLINE_MS,
} from './presence.util';

describe('resolvePresenceStatus', () => {
  const now = new Date('2026-09-09T12:00:00.000Z');

  it('returns online when activity is recent', () => {
    const lastActivity = new Date(now.getTime() - PRESENCE_ONLINE_MS + 1000);
    expect(resolvePresenceStatus(lastActivity, lastActivity, now)).toBe('online');
  });

  it('returns idle when seen recently but activity is old', () => {
    const lastSeen = new Date(now.getTime() - 60_000);
    const lastActivity = new Date(now.getTime() - PRESENCE_ONLINE_MS - 1000);
    expect(resolvePresenceStatus(lastActivity, lastSeen, now)).toBe('idle');
  });

  it('returns null when session is stale', () => {
    const lastSeen = new Date(now.getTime() - PRESENCE_IDLE_MS - 1000);
    const lastActivity = lastSeen;
    expect(resolvePresenceStatus(lastActivity, lastSeen, now)).toBeNull();
  });
});

describe('formatDurationMs', () => {
  it('formats minutes and seconds', () => {
    expect(formatDurationMs(125_000)).toBe('2m 5s');
  });
});

describe('consolidateLiveUsersByUser', () => {
  const base = {
    user: { id: 'user-1' },
    sessionKey: 'sk',
    tenant: null,
    currentPath: null,
    currentModule: null,
    currentPageTitle: null,
    browserLabel: null,
    deviceLabel: null,
    startedAt: '2026-09-09T10:00:00.000Z',
    lastSeenAt: '2026-09-09T10:30:00.000Z',
    connectedDuration: '2m 57s',
    connectedDurationMs: 177_000,
  };

  it('returns one row per user with online status taking precedence', () => {
    const items = consolidateLiveUsersByUser([
      {
        ...base,
        id: 'sess-idle',
        status: 'idle',
        lastActivityAt: '2026-09-09T10:01:00.000Z',
        connectedDuration: '29m 13s',
        connectedDurationMs: 1_753_000,
        currentModule: 'Dashboard',
      },
      {
        ...base,
        id: 'sess-online',
        status: 'online',
        lastActivityAt: '2026-09-09T10:29:00.000Z',
        connectedDuration: '2m 57s',
        connectedDurationMs: 177_000,
        currentModule: 'Futebol',
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('online');
    expect(items[0].id).toBe('sess-online');
    expect(items[0].currentModule).toBe('Futebol');
    expect(items[0].otherSessions).toHaveLength(1);
    expect(items[0].otherSessions?.[0].id).toBe('sess-idle');
  });

  it('projectMasterLiveUsers exibe só online e oculta ocioso', () => {
    const projected = projectMasterLiveUsers([
      {
        ...base,
        id: 'sess-idle',
        status: 'idle',
        lastActivityAt: '2026-09-09T10:01:00.000Z',
        currentModule: 'Dashboard',
      },
      {
        ...base,
        id: 'sess-online',
        status: 'online',
        lastActivityAt: '2026-09-09T10:29:00.000Z',
        currentModule: 'Futebol',
      },
      {
        ...base,
        id: 'b1',
        user: { id: 'user-2' },
        status: 'idle',
        lastActivityAt: '2026-09-09T10:20:00.000Z',
      },
    ]);

    expect(projected.items).toHaveLength(1);
    expect(projected.items[0]?.user.id).toBe('user-1');
    expect(projected.items[0]?.status).toBe('online');
    expect(projected.idle).toBe(1);
    expect(projected.online).toBe(1);
  });

  it('projectMasterLiveUsers agrega super_admin em uma linha online', () => {
    const projected = projectMasterLiveUsers([
      {
        ...base,
        id: 'sa-a',
        status: 'online',
        lastActivityAt: '2026-09-09T10:29:00.000Z',
        currentModule: 'Futebol',
      },
      {
        ...base,
        id: 'sa-b',
        status: 'online',
        lastActivityAt: '2026-09-09T10:28:00.000Z',
        currentModule: 'Saúde',
      },
    ]);

    expect(projected.items).toHaveLength(1);
    expect(projected.items[0]?.currentModule).toBe('Futebol');
    expect(projected.items[0]?.otherSessions).toHaveLength(1);
  });

  it('keeps separate rows for different users', () => {
    const items = consolidateLiveUsersByUser([
      { ...base, id: 'a1', status: 'online', lastActivityAt: '2026-09-09T10:29:00.000Z' },
      {
        ...base,
        id: 'b1',
        user: { id: 'user-2' },
        status: 'idle',
        lastActivityAt: '2026-09-09T10:20:00.000Z',
      },
    ]);

    expect(items).toHaveLength(2);
  });
});
