function dateKeyInRange(dateKey: string, from: string, to: string): boolean {
  const key = dateKey.slice(0, 10);
  return key >= from && key <= to;
}

function sessionDurationMinutes(session: {
  startTime: string | null;
  endTime: string | null;
  activities: Array<{ durationMinutes: number | null }>;
}): number {
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

type FmfPlayerStat = {
  playerId: string;
  played: boolean;
  minutesPlayed: number;
};

type FmfMatchRow = {
  id: string;
  matchDate: Date;
  playerStats: FmfPlayerStat[];
};

type CoachMatchReportRow = {
  id: string;
  matchDate: Date | null;
  status: string;
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
  playerRatings: Array<{ playerId: string; rating: number | null }>;
  fmfMatchReport: {
    id: string;
    matchDate: Date;
    playerStats: FmfPlayerStat[];
  } | null;
};

type TrainingSessionRow = {
  sessionDate: string;
  status: string;
  category?: string | null;
  startTime: string | null;
  endTime: string | null;
  activities: Array<{ durationMinutes: number | null }>;
  playerEntries: Array<{ playerId: string; available: boolean }>;
};

export type SquadPlayerPeriodMinutes = {
  gamesCount: number;
  gamesMinutes: number;
  trainingMinutes: number;
  matchRatings: number[];
};

function emptyRow(): SquadPlayerPeriodMinutes {
  return { gamesCount: 0, gamesMinutes: 0, trainingMinutes: 0, matchRatings: [] };
}

function hasMatchParticipation(stat: { played: boolean; minutesPlayed: number }): boolean {
  return stat.played || stat.minutesPlayed > 0;
}

function buildMatchDedupeKey(input: {
  fmfMatchId?: string | null;
  travelId?: string | null;
  coachReportId?: string | null;
  tenantId: string;
  matchDate: string;
}): string {
  if (input.fmfMatchId) return `fmf:${input.fmfMatchId}`;
  if (input.travelId) return `travel:${input.travelId}`;
  if (input.coachReportId) return `coach:${input.coachReportId}`;
  return `legacy:${input.tenantId}:${input.matchDate.slice(0, 10)}`;
}

function recordMatch(
  perPlayerMatches: Map<string, Map<string, number>>,
  playerId: string,
  matchKey: string,
  minutesPlayed: number,
) {
  let matches = perPlayerMatches.get(playerId);
  if (!matches) {
    matches = new Map();
    perPlayerMatches.set(playerId, matches);
  }
  const prev = matches.get(matchKey);
  if (prev == null) {
    matches.set(matchKey, Math.max(0, minutesPlayed));
    return;
  }
  if (minutesPlayed > prev) matches.set(matchKey, minutesPlayed);
}

function trainingSessionMatchesCategory(
  session: TrainingSessionRow,
  reportCategory: string | null | undefined,
): boolean {
  const cat = reportCategory?.trim();
  const sessionCat = session.category?.trim();
  if (!cat) return true;
  if (!sessionCat) return true;
  return sessionCat === cat;
}

/**
 * Minutos de jogo e treino por atleta num intervalo — mesma regra de participação
 * da Avaliação Individual (minutos > 0 ou played; nota pós-jogo sem súmula = jogo sem minutos).
 */
export function buildSquadPlayerPeriodMinutes(input: {
  tenantId: string;
  squadPlayerIds: string[];
  reportCategory?: string | null;
  from: string;
  to: string;
  fmfMatches: FmfMatchRow[];
  coachMatchReports: CoachMatchReportRow[];
  trainingSessions: TrainingSessionRow[];
}): Map<string, SquadPlayerPeriodMinutes> {
  const squadSet = new Set(input.squadPlayerIds);
  const result = new Map<string, SquadPlayerPeriodMinutes>();
  const perPlayerMatches = new Map<string, Map<string, number>>();

  for (const playerId of input.squadPlayerIds) {
    result.set(playerId, emptyRow());
  }

  for (const match of input.fmfMatches) {
    const dateKey = match.matchDate.toISOString().slice(0, 10);
    if (!dateKeyInRange(dateKey, input.from, input.to)) continue;
    const matchKey = buildMatchDedupeKey({
      fmfMatchId: match.id,
      tenantId: input.tenantId,
      matchDate: dateKey,
    });
    for (const ps of match.playerStats) {
      if (!squadSet.has(ps.playerId) || !hasMatchParticipation(ps)) continue;
      recordMatch(
        perPlayerMatches,
        ps.playerId,
        matchKey,
        ps.minutesPlayed > 0 ? ps.minutesPlayed : 0,
      );
    }
  }

  for (const report of input.coachMatchReports) {
    if (report.status !== 'finalizado') continue;
    const dateKey = report.matchDate
      ? report.matchDate.toISOString().slice(0, 10)
      : report.fmfMatchReport?.matchDate.toISOString().slice(0, 10);
    if (!dateKey || !dateKeyInRange(dateKey, input.from, input.to)) continue;

    const matchKey = buildMatchDedupeKey({
      fmfMatchId: report.fmfMatchReportId ?? report.fmfMatchReport?.id ?? null,
      travelId: report.travelLogisticsId,
      coachReportId: report.fmfMatchReportId || report.travelLogisticsId ? undefined : report.id,
      tenantId: input.tenantId,
      matchDate: dateKey,
    });

    const fmfByPlayer = new Map(
      (report.fmfMatchReport?.playerStats ?? []).map((ps) => [ps.playerId, ps]),
    );
    const ratedIds = new Set<string>();

    for (const rating of report.playerRatings) {
      if (!squadSet.has(rating.playerId)) continue;
      ratedIds.add(rating.playerId);
      if (rating.rating != null) {
        ensurePlayer(result, rating.playerId).matchRatings.push(rating.rating);
      }
      const fmfPs = fmfByPlayer.get(rating.playerId);
      if (fmfPs && hasMatchParticipation(fmfPs)) {
        recordMatch(
          perPlayerMatches,
          rating.playerId,
          matchKey,
          fmfPs.minutesPlayed > 0 ? fmfPs.minutesPlayed : 0,
        );
      } else if (rating.rating != null) {
        recordMatch(perPlayerMatches, rating.playerId, matchKey, 0);
      }
    }

    for (const ps of report.fmfMatchReport?.playerStats ?? []) {
      if (!squadSet.has(ps.playerId) || !hasMatchParticipation(ps)) continue;
      if (ratedIds.has(ps.playerId)) continue;
      recordMatch(
        perPlayerMatches,
        ps.playerId,
        matchKey,
        ps.minutesPlayed > 0 ? ps.minutesPlayed : 0,
      );
    }
  }

  for (const [playerId, matches] of perPlayerMatches) {
    const row = ensurePlayer(result, playerId);
    row.gamesCount = matches.size;
    row.gamesMinutes = [...matches.values()].reduce((s, m) => s + m, 0);
  }

  for (const session of input.trainingSessions) {
    if (session.status !== 'finalizado') continue;
    if (!dateKeyInRange(session.sessionDate, input.from, input.to)) continue;
    if (!trainingSessionMatchesCategory(session, input.reportCategory)) continue;

    const duration = sessionDurationMinutes(session);
    for (const entry of session.playerEntries) {
      if (!entry.available || !squadSet.has(entry.playerId)) continue;
      ensurePlayer(result, entry.playerId).trainingMinutes += duration;
    }
  }

  return result;
}

function ensurePlayer(
  map: Map<string, SquadPlayerPeriodMinutes>,
  playerId: string,
): SquadPlayerPeriodMinutes {
  let row = map.get(playerId);
  if (!row) {
    row = emptyRow();
    map.set(playerId, row);
  }
  return row;
}