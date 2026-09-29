export type TrainingSessionForMinutes = {
  id: string;
  sessionDomain: string;
  agendaEntryId: string | null;
  blockGroupId: string | null;
  blockSequence: number;
  startTime: string | null;
  endTime: string | null;
  activities: Array<{ durationMinutes: number | null }>;
  playerEntries: Array<{ playerId: string; available: boolean }>;
};

function sessionDurationMinutes(session: TrainingSessionForMinutes): number {
  if (session.startTime && session.endTime) {
    const [sh, sm] = session.startTime.split(':').map(Number);
    const [eh, em] = session.endTime.split(':').map(Number);
    if (
      Number.isFinite(sh) &&
      Number.isFinite(sm) &&
      Number.isFinite(eh) &&
      Number.isFinite(em)
    ) {
      const mins = eh * 60 + em - (sh * 60 + sm);
      if (mins > 0) return mins;
    }
  }
  const actSum = session.activities.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
  if (actSum > 0) return actSum;
  return 90;
}

function blockKey(session: TrainingSessionForMinutes): string {
  if (session.blockGroupId?.trim()) return `bg:${session.blockGroupId.trim()}`;
  if (session.agendaEntryId?.trim()) return `ag:${session.agendaEntryId.trim()}`;
  return `solo:${session.id}`;
}

/** Minutos canônicos por atleta/dia — blocos simultâneos contam uma vez; sequenciais somam. */
export function computeCanonicalTrainingMinutesForPlayer(
  sessions: TrainingSessionForMinutes[],
  playerId: string,
): { total: number; byDomain: Record<string, number> } {
  const finalized = sessions.filter((s) =>
    s.playerEntries.some((e) => e.playerId === playerId && e.available),
  );
  if (finalized.length === 0) return { total: 0, byDomain: {} };

  const groups = new Map<string, TrainingSessionForMinutes[]>();
  for (const s of finalized) {
    const key = blockKey(s);
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  let total = 0;
  const byDomain: Record<string, number> = {};
  const orderedGroups = [...groups.entries()].sort((a, b) => {
    const seqA = Math.min(...a[1].map((s) => s.blockSequence ?? 0));
    const seqB = Math.min(...b[1].map((s) => s.blockSequence ?? 0));
    return seqA - seqB || a[0].localeCompare(b[0]);
  });

  for (const [, groupSessions] of orderedGroups) {
    const blockMinutes = Math.max(...groupSessions.map(sessionDurationMinutes));
    total += blockMinutes;
    const domains = [...new Set(groupSessions.map((s) => s.sessionDomain))];
    const share = domains.length > 0 ? blockMinutes / domains.length : blockMinutes;
    for (const d of domains) {
      byDomain[d] = (byDomain[d] ?? 0) + share;
    }
  }

  return { total, byDomain };
}

export function computeActualLoad(rpe: number | null | undefined, trainingMinutes: number | null | undefined): number | null {
  if (rpe == null || trainingMinutes == null) return null;
  if (!Number.isFinite(rpe) || !Number.isFinite(trainingMinutes)) return null;
  return Math.round(rpe * trainingMinutes * 10) / 10;
}

export function entryHasAuthoritativeGps(entry: {
  gpsData?: unknown;
  maxDistanceM?: number | null;
  sourceFileName?: string | null;
}): boolean {
  if (entry.gpsData != null && typeof entry.gpsData === 'object') return true;
  if (entry.maxDistanceM != null && entry.maxDistanceM > 0) return true;
  return false;
}
