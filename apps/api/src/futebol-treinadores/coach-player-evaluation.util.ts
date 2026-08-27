import {
  resolveTravelEventCategories,
} from '../common/category-subida.util';
import {
  COACH_TEAM_REPORT_PERIOD_KEYS,
  type CoachTeamEvaluationPeriodRange,
  type CoachTeamReportPeriodKey,
  dateKeyInRange,
  resolveQuarterlyPeriodRange,
  sessionDurationMinutes,
} from './coach-team-evaluation.util';

export {
  COACH_TEAM_REPORT_PERIOD_KEYS,
  COACH_TEAM_REPORT_PERIOD_KEY_LABELS,
  PERIOD_KEY_ORDER,
  resolveQuarterlyPeriodRange,
  suggestQuarterlyPeriodKey,
} from './coach-team-evaluation.util';
export type { CoachTeamReportPeriodKey } from './coach-team-evaluation.util';

export const COACH_PLAYER_EVALUATION_STATUS = ['pendente', 'rascunho', 'concluido'] as const;
export const COACH_PLAYER_EVALUATION_FINAL_RESULT = ['aprovado', 'manter', 'reprovado'] as const;
export const COACH_PLAYER_EVALUATION_CLASSIFICATION = [
  'internacional_elite',
  'nacional_elite',
  'estadual',
  'nao_pro',
] as const;

export type CoachPlayerEvaluationClassification =
  (typeof COACH_PLAYER_EVALUATION_CLASSIFICATION)[number];

export type CoachPlayerPeriodStats = {
  gamesListed: number;
  gamesPlayed: number;
  gamesStarted: number;
  gamesListedHigherCategory: number;
  gamesPlayedHigherCategory: number;
  matchMinutes: number;
  trainingMinutes: number;
  goals: number;
  assists: number;
};

type MatchAggregate = {
  listed: boolean;
  played: boolean;
  started: boolean;
  higherListed: boolean;
  higherPlayed: boolean;
  minutes: number;
  goals: number;
  assists: number;
};

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function averageScores(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return roundScore(nums.reduce((s, n) => s + n, 0) / nums.length);
}

export function clampEvaluationScore(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 5) return null;
  return roundScore(num);
}

export function buildCategorySortOrderMap(
  categories: Array<{ value: string; sortOrder: number }>,
): Map<string, number> {
  return new Map(categories.map((c) => [c.value, c.sortOrder]));
}

export function isHigherCategory(
  playerCategory: string | null | undefined,
  eventCategory: string | null | undefined,
  sortOrderMap: Map<string, number>,
): boolean {
  const player = playerCategory?.trim();
  const event = eventCategory?.trim();
  if (!player || !event || player === event) return false;
  const playerOrder = sortOrderMap.get(player);
  const eventOrder = sortOrderMap.get(event);
  if (playerOrder == null || eventOrder == null) return false;
  return eventOrder > playerOrder;
}

export function resolvePrimaryEventCategory(eventCategories: string[]): string {
  if (eventCategories.length === 0) return '';
  return eventCategories[0] ?? '';
}

function pickPrimaryCategoryForDedupe(
  eventCategories: string[],
  sortOrderMap: Map<string, number>,
): string {
  if (eventCategories.length === 0) return '';
  const sorted = [...eventCategories].sort((a, b) => {
    const ao = sortOrderMap.get(a) ?? sortOrderFallback(a);
    const bo = sortOrderMap.get(b) ?? sortOrderFallback(b);
    return bo - ao;
  });
  return sorted[0] ?? eventCategories[0] ?? '';
}

function sortOrderFallback(value: string): number {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function buildMatchDedupeKey(input: {
  fmfMatchId?: string | null;
  travelId?: string | null;
  tenantId: string;
  matchDate: string;
  eventCategory: string;
}): string {
  if (input.fmfMatchId) return `fmf:${input.fmfMatchId}`;
  if (input.travelId) return `travel:${input.travelId}`;
  return `legacy:${input.tenantId}:${input.matchDate.slice(0, 10)}:${input.eventCategory}`;
}

export function computeEvaluationAverages(input: {
  techIndividualSkill?: number | null;
  techBilaterality?: number | null;
  techNonDominantLeg?: number | null;
  tacCollective?: number | null;
  tacIndividual?: number | null;
  tacGameVision?: number | null;
  tacDecisionMaking?: number | null;
  physStrength?: number | null;
  physSpeed?: number | null;
  physPotential?: number | null;
  physMaturity?: number | null;
  behEmotionalControl?: number | null;
  behPersonality?: number | null;
  behDetermination?: number | null;
  behIntelligence?: number | null;
  offBuildUp?: number | null;
  offOrganization?: number | null;
  offPositioning?: number | null;
  defOrganization?: number | null;
  defRecovery?: number | null;
  defPositioning?: number | null;
  competitiveness?: number | null;
}) {
  const techAverage = averageScores([
    input.techIndividualSkill,
    input.techBilaterality,
    input.techNonDominantLeg,
  ]);
  const tacAverage = averageScores([
    input.tacCollective,
    input.tacIndividual,
    input.tacGameVision,
    input.tacDecisionMaking,
  ]);
  const physAverage = averageScores([
    input.physStrength,
    input.physSpeed,
    input.physPotential,
    input.physMaturity,
  ]);
  const behAverage = averageScores([
    input.behEmotionalControl,
    input.behPersonality,
    input.behDetermination,
    input.behIntelligence,
  ]);
  const offAverage = averageScores([
    input.offBuildUp,
    input.offOrganization,
    input.offPositioning,
  ]);
  const defAverage = averageScores([
    input.defOrganization,
    input.defRecovery,
    input.defPositioning,
  ]);

  const overallAverage = averageScores([
    techAverage,
    tacAverage,
    physAverage,
    behAverage,
    offAverage,
    defAverage,
    input.competitiveness,
  ]);

  const percentage =
    overallAverage != null ? roundScore((overallAverage / 5) * 100) : null;
  const classification =
    percentage != null ? classifyEvaluationPercentage(percentage) : null;

  return {
    techAverage,
    tacAverage,
    physAverage,
    behAverage,
    offAverage,
    defAverage,
    overallAverage,
    percentage,
    classification,
  };
}

export function classifyEvaluationPercentage(percentage: number): CoachPlayerEvaluationClassification {
  if (percentage >= 90) return 'internacional_elite';
  if (percentage >= 80) return 'nacional_elite';
  if (percentage >= 60) return 'estadual';
  return 'nao_pro';
}

export function computePeriodicEvaluationAverage(
  evaluations: Array<{ periodKey: string; overallAverage: number | null; status: string }>,
): number | null {
  const values = evaluations
    .filter((row) => row.status === 'concluido' && row.overallAverage != null)
    .map((row) => row.overallAverage as number);
  return averageScores(values);
}

type FmfStatRow = {
  matchId: string;
  matchDate: Date;
  category: string;
  listed: boolean;
  played: boolean;
  starter: boolean;
  minutesPlayed: number;
  goals: number;
};

type TravelRow = {
  id: string;
  matchDate: Date;
  category: string | null;
  categories: unknown;
  status: string;
  fmfMatchReportId: string | null;
};

type CoachMatchRow = {
  id: string;
  matchDate: Date | null;
  status: string;
  fmfMatchReportId: string | null;
  travelLogisticsId: string | null;
  playerRatings: Array<{ rating: number | null; assists: number }>;
  fmfMatchReport: {
    id: string;
    matchDate: Date;
    category: string;
    playerStats: Array<{
      listed: boolean;
      played: boolean;
      starter: boolean;
      minutesPlayed: number;
      goals: number;
    }>;
  } | null;
};

type TrainingRow = {
  sessionDate: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  activities: Array<{ durationMinutes: number | null }>;
  playerEntries: Array<{ available: boolean }>;
};

export function buildIndividualPlayerPeriodStats(input: {
  tenantId: string;
  playerId: string;
  playerCategory: string | null;
  from: string;
  to: string;
  categorySortOrder: Map<string, number>;
  fmfStats: FmfStatRow[];
  travels: TravelRow[];
  coachMatchReports: CoachMatchRow[];
  trainingSessions: TrainingRow[];
}): CoachPlayerPeriodStats {
  const aggregates = new Map<string, MatchAggregate>();

  const ensure = (key: string): MatchAggregate => {
    const existing = aggregates.get(key);
    if (existing) return existing;
    const created: MatchAggregate = {
      listed: false,
      played: false,
      started: false,
      higherListed: false,
      higherPlayed: false,
      minutes: 0,
      goals: 0,
      assists: 0,
    };
    aggregates.set(key, created);
    return created;
  };

  const applyListed = (key: string, eventCategory: string) => {
    const row = ensure(key);
    row.listed = true;
    if (isHigherCategory(input.playerCategory, eventCategory, input.categorySortOrder)) {
      row.higherListed = true;
    }
  };

  const applyPlayed = (
    key: string,
    eventCategory: string,
    partial: { started?: boolean; minutes?: number; goals?: number; assists?: number },
  ) => {
    const row = ensure(key);
    row.played = true;
    if (partial.started) row.started = true;
    if (partial.minutes != null) row.minutes = Math.max(row.minutes, partial.minutes);
    if (partial.goals != null) row.goals += partial.goals;
    if (partial.assists != null) row.assists += partial.assists;
    if (isHigherCategory(input.playerCategory, eventCategory, input.categorySortOrder)) {
      row.higherPlayed = true;
    }
  };

  for (const stat of input.fmfStats) {
    const dateKey = stat.matchDate.toISOString().slice(0, 10);
    if (!dateKeyInRange(dateKey, input.from, input.to)) continue;
    const key = buildMatchDedupeKey({
      fmfMatchId: stat.matchId,
      tenantId: input.tenantId,
      matchDate: dateKey,
      eventCategory: stat.category,
    });
    if (stat.listed) applyListed(key, stat.category);
    if (stat.played || stat.minutesPlayed > 0) {
      applyPlayed(key, stat.category, {
        started: stat.starter,
        minutes: stat.minutesPlayed,
        goals: stat.goals,
      });
    }
  }

  for (const travel of input.travels) {
    if (['rascunho', 'cancelado'].includes(travel.status)) continue;
    const dateKey = travel.matchDate.toISOString().slice(0, 10);
    if (!dateKeyInRange(dateKey, input.from, input.to)) continue;
    const eventCategories = resolveTravelEventCategories(travel);
    const eventCategory = pickPrimaryCategoryForDedupe(eventCategories, input.categorySortOrder);
    if (!eventCategory) continue;
    const key = buildMatchDedupeKey({
      fmfMatchId: travel.fmfMatchReportId,
      travelId: travel.id,
      tenantId: input.tenantId,
      matchDate: dateKey,
      eventCategory,
    });
    applyListed(key, eventCategory);
    if (
      eventCategories.some((cat) =>
        isHigherCategory(input.playerCategory, cat, input.categorySortOrder),
      )
    ) {
      ensure(key).higherListed = true;
    }
  }

  for (const report of input.coachMatchReports) {
    if (report.status !== 'finalizado') continue;
    const dateKey = report.matchDate
      ? report.matchDate.toISOString().slice(0, 10)
      : report.fmfMatchReport?.matchDate.toISOString().slice(0, 10);
    if (!dateKey || !dateKeyInRange(dateKey, input.from, input.to)) continue;

    const eventCategory =
      report.fmfMatchReport?.category ??
      (report.travelLogisticsId ? 'unknown' : 'unknown');
    const fmfId = report.fmfMatchReportId ?? report.fmfMatchReport?.id ?? null;
    const key = buildMatchDedupeKey({
      fmfMatchId: fmfId,
      travelId: report.travelLogisticsId,
      tenantId: input.tenantId,
      matchDate: dateKey,
      eventCategory,
    });

    const rating = report.playerRatings[0];
    if (rating?.assists) {
      const row = ensure(key);
      row.assists += rating.assists;
    }

    if (report.fmfMatchReport) {
      const ps = report.fmfMatchReport.playerStats[0];
      if (ps) {
        if (ps.listed) applyListed(key, report.fmfMatchReport.category);
        if (ps.played || ps.minutesPlayed > 0) {
          applyPlayed(key, report.fmfMatchReport.category, {
            started: ps.starter,
            minutes: ps.minutesPlayed,
            goals: ps.goals,
          });
        }
      }
    } else if (rating?.rating != null) {
      applyPlayed(key, eventCategory, {});
    }
  }

  let gamesListed = 0;
  let gamesPlayed = 0;
  let gamesStarted = 0;
  let gamesListedHigherCategory = 0;
  let gamesPlayedHigherCategory = 0;
  let matchMinutes = 0;
  let goals = 0;
  let assists = 0;

  for (const row of aggregates.values()) {
    if (row.listed) gamesListed += 1;
    if (row.played) gamesPlayed += 1;
    if (row.started) gamesStarted += 1;
    if (row.higherListed) gamesListedHigherCategory += 1;
    if (row.higherPlayed) gamesPlayedHigherCategory += 1;
    matchMinutes += row.minutes;
    goals += row.goals;
    assists += row.assists;
  }

  let trainingMinutes = 0;
  for (const session of input.trainingSessions) {
    if (session.status !== 'finalizado') continue;
    if (!dateKeyInRange(session.sessionDate, input.from, input.to)) continue;
    const entry = session.playerEntries[0];
    if (!entry?.available) continue;
    trainingMinutes += sessionDurationMinutes(session);
  }

  return {
    gamesListed,
    gamesPlayed,
    gamesStarted,
    gamesListedHigherCategory,
    gamesPlayedHigherCategory,
    matchMinutes,
    trainingMinutes,
    goals,
    assists,
  };
}

export function validatePlayerEvaluationSubmit(input: {
  technicalAssessment?: string | null;
  finalResult?: string | null;
  scores: Record<string, number | null | undefined>;
  requiredScoreKeys: string[];
}): string | null {
  for (const key of input.requiredScoreKeys) {
    if (input.scores[key] == null) {
      return 'Preencha todos os indicadores de avaliação (0 a 5).';
    }
  }
  if (!input.technicalAssessment?.trim()) {
    return 'O parecer técnico é obrigatório.';
  }
  if (
    !input.finalResult ||
    !COACH_PLAYER_EVALUATION_FINAL_RESULT.includes(
      input.finalResult as (typeof COACH_PLAYER_EVALUATION_FINAL_RESULT)[number],
    )
  ) {
    return 'Selecione o resultado final (Aprovado, Manter ou Reprovado).';
  }
  return null;
}

export const COACH_PLAYER_EVALUATION_SCORE_FIELDS = [
  'techIndividualSkill',
  'techBilaterality',
  'techNonDominantLeg',
  'tacCollective',
  'tacIndividual',
  'tacGameVision',
  'tacDecisionMaking',
  'physStrength',
  'physSpeed',
  'physPotential',
  'physMaturity',
  'behEmotionalControl',
  'behPersonality',
  'behDetermination',
  'behIntelligence',
  'offBuildUp',
  'offOrganization',
  'offPositioning',
  'defOrganization',
  'defRecovery',
  'defPositioning',
  'competitiveness',
] as const;

export function resolvePlayerEvaluationPeriod(
  season: number,
  periodKey: CoachTeamReportPeriodKey,
) {
  return resolveQuarterlyPeriodRange(season, periodKey);
}

/** Acumulado season-to-date: início do ano calendário até o fim da janela do período avaliativo. */
export function resolvePlayerEvaluationCumulativeRange(
  season: number,
  periodKey: CoachTeamReportPeriodKey,
): CoachTeamEvaluationPeriodRange {
  const evaluationWindow = resolveQuarterlyPeriodRange(season, periodKey);
  return {
    periodKey,
    season,
    start: `${season}-01-01`,
    end: evaluationWindow.end,
  };
}

export function isValidPlayerEvaluationPeriodKey(value: string): value is CoachTeamReportPeriodKey {
  return (COACH_TEAM_REPORT_PERIOD_KEYS as readonly string[]).includes(value);
}
