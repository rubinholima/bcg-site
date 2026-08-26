import { getPlayerListDisplayName } from '../common/player-list-display-name.util';

export const COACH_TEAM_REPORT_PERIOD_KEYS = [
  'fevereiro',
  'julho',
  'setembro',
  'fim_temporada',
] as const;

export type CoachTeamReportPeriodKey = (typeof COACH_TEAM_REPORT_PERIOD_KEYS)[number];

export const COACH_TEAM_REPORT_PERIOD_KEY_LABELS: Record<CoachTeamReportPeriodKey, string> = {
  fevereiro: 'Fevereiro',
  julho: 'Julho',
  setembro: 'Setembro',
  fim_temporada: 'Fim da temporada',
};

export const PERIOD_KEY_ORDER: Record<CoachTeamReportPeriodKey, number> = {
  fevereiro: 1,
  julho: 2,
  setembro: 3,
  fim_temporada: 4,
};

export type CoachTeamEvaluationPeriodRange = {
  periodKey: CoachTeamReportPeriodKey;
  season: number;
  start: string;
  end: string;
};

export type CoachTeamEvaluationPlayerStats = {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  gamesCount: number;
  gamesMinutes: number;
  trainingMinutes: number;
  avgMatchRating: number | null;
  coachFinalRating: number | null;
  periodicAverage: number | null;
};

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function resolveQuarterlyPeriodRange(
  season: number,
  periodKey: CoachTeamReportPeriodKey,
): CoachTeamEvaluationPeriodRange {
  switch (periodKey) {
    case 'fevereiro':
      return {
        periodKey,
        season,
        start: `${season}-02-01`,
        end: `${season}-02-${String(lastDayOfMonth(season, 2)).padStart(2, '0')}`,
      };
    case 'julho':
      return {
        periodKey,
        season,
        start: `${season}-07-01`,
        end: `${season}-07-31`,
      };
    case 'setembro':
      return {
        periodKey,
        season,
        start: `${season}-09-01`,
        end: `${season}-09-30`,
      };
    case 'fim_temporada':
      return {
        periodKey,
        season,
        start: `${season}-11-01`,
        end: `${season}-12-31`,
      };
    default:
      return resolveQuarterlyPeriodRange(season, 'fevereiro');
  }
}

export function suggestQuarterlyPeriodKey(date = new Date()): CoachTeamReportPeriodKey {
  const month = date.getMonth() + 1;
  if (month <= 2) return 'fevereiro';
  if (month <= 7) return 'julho';
  if (month <= 9) return 'setembro';
  return 'fim_temporada';
}

export function dateKeyInRange(dateKey: string, from: string, to: string): boolean {
  const key = dateKey.slice(0, 10);
  return key >= from && key <= to;
}

function roundRating(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return roundRating(nums.reduce((s, n) => s + n, 0) / nums.length);
}

export function sessionDurationMinutes(session: {
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

type MatchReportRow = {
  id: string;
  matchDate: Date | null;
  status: string;
  playerRatings: Array<{ playerId: string; rating: number | null }>;
  fmfMatchReport: {
    matchDate: Date;
    playerStats: Array<{ playerId: string; minutesPlayed: number; played: boolean }>;
  } | null;
};

type TrainingSessionRow = {
  sessionDate: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  activities: Array<{ durationMinutes: number | null }>;
  playerEntries: Array<{ playerId: string; available: boolean }>;
};

type FmfOnlyMatchRow = {
  matchDate: Date;
  playerStats: Array<{ playerId: string; minutesPlayed: number; played: boolean }>;
};

type PlayerRow = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  registrationProfile?: unknown;
};

export function buildPlayerEvaluationStats(input: {
  players: PlayerRow[];
  from: string;
  to: string;
  matchReports: MatchReportRow[];
  fmfOnlyMatches: FmfOnlyMatchRow[];
  trainingSessions: TrainingSessionRow[];
  savedRatings?: Map<string, number | null>;
  periodicRatings?: Map<string, number[]>;
}): CoachTeamEvaluationPlayerStats[] {
  const stats = new Map<
    string,
    {
      gamesCount: number;
      gamesMinutes: number;
      trainingMinutes: number;
      matchRatings: number[];
    }
  >();

  for (const player of input.players) {
    stats.set(player.id, {
      gamesCount: 0,
      gamesMinutes: 0,
      trainingMinutes: 0,
      matchRatings: [],
    });
  }

  const matchIdsSeen = new Set<string>();

  for (const report of input.matchReports) {
    if (report.status !== 'finalizado') continue;
    const dateKey = report.matchDate
      ? report.matchDate.toISOString().slice(0, 10)
      : report.fmfMatchReport?.matchDate.toISOString().slice(0, 10);
    if (!dateKey || !dateKeyInRange(dateKey, input.from, input.to)) continue;

    matchIdsSeen.add(report.id);

    for (const rating of report.playerRatings) {
      const row = stats.get(rating.playerId);
      if (!row) continue;
      if (rating.rating != null) {
        row.matchRatings.push(rating.rating);
      }
    }

    if (report.fmfMatchReport) {
      for (const ps of report.fmfMatchReport.playerStats) {
        const row = stats.get(ps.playerId);
        if (!row || !ps.played) continue;
        row.gamesCount += 1;
        row.gamesMinutes += ps.minutesPlayed;
      }
    } else {
      for (const rating of report.playerRatings) {
        if (rating.rating == null) continue;
        const row = stats.get(rating.playerId);
        if (!row) continue;
        row.gamesCount += 1;
      }
    }
  }

  for (const match of input.fmfOnlyMatches) {
    const dateKey = match.matchDate.toISOString().slice(0, 10);
    if (!dateKeyInRange(dateKey, input.from, input.to)) continue;
    for (const ps of match.playerStats) {
      const row = stats.get(ps.playerId);
      if (!row || !ps.played) continue;
      row.gamesCount += 1;
      row.gamesMinutes += ps.minutesPlayed;
    }
  }

  for (const session of input.trainingSessions) {
    if (session.status !== 'finalizado') continue;
    if (!dateKeyInRange(session.sessionDate, input.from, input.to)) continue;
    const duration = sessionDurationMinutes(session);
    for (const entry of session.playerEntries) {
      if (!entry.available) continue;
      const row = stats.get(entry.playerId);
      if (!row) continue;
      row.trainingMinutes += duration;
    }
  }

  return input.players
    .map((player) => {
      const row = stats.get(player.id)!;
      const periodic = input.periodicRatings?.get(player.id);
      return {
        playerId: player.id,
        name: getPlayerListDisplayName(player),
        jerseyNumber: player.jerseyNumber,
        category: player.category,
        gamesCount: row.gamesCount,
        gamesMinutes: row.gamesMinutes,
        trainingMinutes: row.trainingMinutes,
        avgMatchRating: average(row.matchRatings),
        coachFinalRating: input.savedRatings?.get(player.id) ?? null,
        periodicAverage: periodic && periodic.length > 0 ? average(periodic) : null,
      };
    })
    .sort((a, b) => {
      const ja = a.jerseyNumber ?? 9999;
      const jb = b.jerseyNumber ?? 9999;
      if (ja !== jb) return ja - jb;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
}

export function computePeriodicRatingsByPlayer(
  evaluations: Array<{
    playerId: string;
    coachFinalRating: number | null;
    report: { season: number | null; periodKey: string | null; status: string };
  }>,
  season: number,
  upToPeriodKey: CoachTeamReportPeriodKey,
): Map<string, number[]> {
  const limit = PERIOD_KEY_ORDER[upToPeriodKey];
  const byPlayer = new Map<string, number[]>();

  for (const ev of evaluations) {
    if (ev.report.status !== 'enviado') continue;
    if (ev.report.season !== season) continue;
    if (!ev.report.periodKey) continue;
    if (!(COACH_TEAM_REPORT_PERIOD_KEYS as readonly string[]).includes(ev.report.periodKey)) {
      continue;
    }
    const order = PERIOD_KEY_ORDER[ev.report.periodKey as CoachTeamReportPeriodKey];
    if (order > limit) continue;
    if (ev.coachFinalRating == null) continue;
    const list = byPlayer.get(ev.playerId) ?? [];
    list.push(ev.coachFinalRating);
    byPlayer.set(ev.playerId, list);
  }

  return byPlayer;
}

export function validateQuarterlyTeamReportSubmit(input: {
  periodKey: string | null | undefined;
  generalDescription: string | null | undefined;
  playerEvaluations: Array<{ playerId: string; coachFinalRating: number | null | undefined }>;
  squadPlayerIds: string[];
}): string | null {
  if (!input.periodKey) {
    return 'Selecione a janela trimestral (fevereiro, julho, setembro ou fim da temporada).';
  }
  if (!input.generalDescription?.trim()) {
    return 'A descrição do período é obrigatória.';
  }
  const missing = input.squadPlayerIds.filter((id) => {
    const row = input.playerEvaluations.find((e) => e.playerId === id);
    return row?.coachFinalRating == null || Number.isNaN(Number(row.coachFinalRating));
  });
  if (missing.length > 0) {
    return `Preencha a nota final do treinador para todos os atletas (${missing.length} pendente${missing.length > 1 ? 's' : ''}).`;
  }
  return null;
}
