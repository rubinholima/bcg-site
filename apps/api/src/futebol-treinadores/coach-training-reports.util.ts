import { getPlayerListDisplayName } from '../common/player-list-display-name.util';
import { dateKeyInBrazil } from '../common/brazil-time.util';

type SessionRow = {
  id: string;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  category: string | null;
  objectives: string | null;
  notes: string | null;
  status: string;
  staff: { name: string; role: string | null } | null;
  attachments: Array<{ label: string | null; fileUrl: string; kind: string | null }>;
  activities: Array<{ kind: string; title: string; durationMinutes: number | null }>;
  playerEntries: Array<{
    playerId: string;
    available: boolean;
    unavailableReason: string | null;
    rating: number | null;
    notes: string | null;
    player: {
      id: string;
      name: string;
      jerseyNumber: number | null;
      category: string | null;
      registrationProfile?: unknown;
    };
  }>;
  agendaEntry: {
    id: string;
    title: string;
    location: string | null;
    startAt: Date;
  } | null;
  planTemplate: { id: string; title: string; fileUrl: string } | null;
};

export type CoachTrainingSessionReport = {
  session: {
    id: string;
    sessionDate: string;
    startTime: string | null;
    endTime: string | null;
    category: string | null;
    objectives: string | null;
    notes: string | null;
    status: string;
    staffName: string | null;
    agendaTitle: string | null;
    agendaLocation: string | null;
    planTemplateTitle: string | null;
  };
  attachments: SessionRow['attachments'];
  activities: SessionRow['activities'];
  players: Array<{
    playerId: string;
    name: string;
    jerseyNumber: number | null;
    category: string | null;
    available: boolean;
    unavailableReason: string | null;
    rating: number | null;
    notes: string | null;
  }>;
  summary: {
    totalPlayers: number;
    availableCount: number;
    unavailableCount: number;
    ratedCount: number;
    averageRating: number | null;
  };
};

export type CoachTrainingPeriodPlayerRow = {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  sessionsTotal: number;
  sessionsAvailable: number;
  sessionsUnavailable: number;
  averageRating: number | null;
  lastRating: number | null;
  lastNotes: string | null;
};

export type CoachTrainingPeriodReport = {
  from: string;
  to: string;
  category: string | null;
  sessions: Array<{
    id: string;
    sessionDate: string;
    status: string;
    availableCount: number;
    averageRating: number | null;
    attachmentCount: number;
  }>;
  summary: {
    sessionCount: number;
    finalizedCount: number;
    averageTeamRating: number | null;
    averageAttendancePct: number | null;
  };
  players: CoachTrainingPeriodPlayerRow[];
  highlights: {
    lowRating: CoachTrainingPeriodPlayerRow[];
    frequentAbsences: CoachTrainingPeriodPlayerRow[];
  };
};

function roundRating(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return roundRating(nums.reduce((s, n) => s + n, 0) / nums.length);
}

export function buildTrainingSessionReport(session: SessionRow): CoachTrainingSessionReport {
  const players = session.playerEntries
    .map((e) => ({
      playerId: e.playerId,
      name: getPlayerListDisplayName(e.player),
      jerseyNumber: e.player.jerseyNumber,
      category: e.player.category,
      available: e.available,
      unavailableReason: e.unavailableReason,
      rating: e.rating,
      notes: e.notes,
    }))
    .sort((a, b) => {
      const ja = a.jerseyNumber ?? 999;
      const jb = b.jerseyNumber ?? 999;
      if (ja !== jb) return ja - jb;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const ratings = players.filter((p) => p.available && p.rating != null).map((p) => p.rating!);
  const availableCount = players.filter((p) => p.available).length;

  return {
    session: {
      id: session.id,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      category: session.category,
      objectives: session.objectives,
      notes: session.notes,
      status: session.status,
      staffName: session.staff?.name ?? null,
      agendaTitle: session.agendaEntry?.title ?? null,
      agendaLocation: session.agendaEntry?.location ?? null,
      planTemplateTitle: session.planTemplate?.title ?? null,
    },
    attachments: session.attachments,
    activities: session.activities,
    players,
    summary: {
      totalPlayers: players.length,
      availableCount,
      unavailableCount: players.length - availableCount,
      ratedCount: ratings.length,
      averageRating: average(ratings),
    },
  };
}

export function buildTrainingPeriodReport(
  sessions: SessionRow[],
  from: string,
  to: string,
  category: string | null,
): CoachTrainingPeriodReport {
  const byPlayer = new Map<
    string,
    CoachTrainingPeriodPlayerRow & { ratings: number[]; notesByDate: Array<{ date: string; notes: string }> }
  >();

  const sessionSummaries = sessions.map((s) => {
    const available = s.playerEntries.filter((e) => e.available);
    const ratings = available.filter((e) => e.rating != null).map((e) => e.rating!);
    const avg = average(ratings);

    for (const entry of s.playerEntries) {
      const existing = byPlayer.get(entry.playerId);
      const base: CoachTrainingPeriodPlayerRow & {
        ratings: number[];
        notesByDate: Array<{ date: string; notes: string }>;
      } = existing ?? {
        playerId: entry.playerId,
        name: getPlayerListDisplayName(entry.player),
        jerseyNumber: entry.player.jerseyNumber,
        category: entry.player.category,
        sessionsTotal: 0,
        sessionsAvailable: 0,
        sessionsUnavailable: 0,
        averageRating: null,
        lastRating: null,
        lastNotes: null,
        ratings: [],
        notesByDate: [],
      };
      base.sessionsTotal += 1;
      if (entry.available) {
        base.sessionsAvailable += 1;
        if (entry.rating != null) base.ratings.push(entry.rating);
      } else {
        base.sessionsUnavailable += 1;
      }
      if (entry.notes?.trim()) {
        base.notesByDate.push({ date: s.sessionDate, notes: entry.notes.trim() });
      }
      byPlayer.set(entry.playerId, base);
    }

    return {
      id: s.id,
      sessionDate: s.sessionDate,
      status: s.status,
      availableCount: available.length,
      averageRating: avg,
      attachmentCount: s.attachments.length,
    };
  });

  const players = [...byPlayer.values()]
    .map((p) => {
      const sortedNotes = [...p.notesByDate].sort((a, b) => b.date.localeCompare(a.date));
      const sortedSessions = sessions
        .filter((s) => s.playerEntries.some((e) => e.playerId === p.playerId))
        .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
      let lastRating: number | null = null;
      for (const s of sortedSessions) {
        const row = s.playerEntries.find((e) => e.playerId === p.playerId);
        if (row?.available && row.rating != null) {
          lastRating = row.rating;
          break;
        }
      }
      return {
        playerId: p.playerId,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        category: p.category,
        sessionsTotal: p.sessionsTotal,
        sessionsAvailable: p.sessionsAvailable,
        sessionsUnavailable: p.sessionsUnavailable,
        averageRating: average(p.ratings),
        lastRating,
        lastNotes: sortedNotes[0]?.notes ?? null,
      } satisfies CoachTrainingPeriodPlayerRow;
    })
    .sort((a, b) => {
      const ja = a.jerseyNumber ?? 999;
      const jb = b.jerseyNumber ?? 999;
      if (ja !== jb) return ja - jb;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const allRatings: number[] = [];
  let attendanceSlots = 0;
  let attendedSlots = 0;
  for (const s of sessions) {
    for (const e of s.playerEntries) {
      attendanceSlots += 1;
      if (e.available) {
        attendedSlots += 1;
        if (e.rating != null) allRatings.push(e.rating);
      }
    }
  }

  const lowRating = players
    .filter((p) => p.averageRating != null && p.sessionsAvailable >= 2 && p.averageRating <= 2.5)
    .slice(0, 8);
  const frequentAbsences = players
    .filter((p) => p.sessionsTotal >= 2 && p.sessionsUnavailable >= 2)
    .sort((a, b) => b.sessionsUnavailable - a.sessionsUnavailable)
    .slice(0, 8);

  return {
    from,
    to,
    category,
    sessions: sessionSummaries.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)),
    summary: {
      sessionCount: sessions.length,
      finalizedCount: sessions.filter((s) => s.status === 'finalizado').length,
      averageTeamRating: average(allRatings),
      averageAttendancePct:
        attendanceSlots > 0 ? Math.round((attendedSlots / attendanceSlots) * 1000) / 10 : null,
    },
    players,
    highlights: { lowRating, frequentAbsences },
  };
}

export function sessionDateInRange(sessionDate: string, from: string, to: string): boolean {
  const key = sessionDate.slice(0, 10);
  return key >= from && key <= to;
}

export function defaultPeriodRange(): { from: string; to: string } {
  const now = new Date();
  const to = dateKeyInBrazil(now);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 30);
  return { from: dateKeyInBrazil(fromDate), to };
}
