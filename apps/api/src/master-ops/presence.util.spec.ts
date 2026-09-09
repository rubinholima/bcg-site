import {
  formatDurationMs,
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
