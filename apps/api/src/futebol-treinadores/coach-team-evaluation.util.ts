import { getPlayerListDisplayName } from '../common/player-list-display-name.util';
import { travelMatchesCategoryFilter } from '../futebol-agenda/travel-categories.util';
import { buildSquadPlayerPeriodMinutes } from './player-period-minutes.util';

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
  individualObservation?: string | null;
  playerStrengths?: string | null;
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

export const MONTHLY_PERIOD_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type CoachTeamMonthlyPeriodRange = {
  periodKey: string;
  season: number;
  start: string;
  end: string;
};

export type MonthlyReportStatus = 'pendente' | 'rascunho' | 'enviado' | 'atrasado';

export function isValidMonthlyPeriodKey(value: string): boolean {
  return MONTHLY_PERIOD_KEY_RE.test(value.trim());
}

export function resolveMonthlyPeriodRange(periodKey: string): CoachTeamMonthlyPeriodRange {
  const key = periodKey.trim();
  if (!isValidMonthlyPeriodKey(key)) {
    throw new Error(`periodKey mensal inválido: ${periodKey}`);
  }
  const [yearRaw, monthRaw] = key.split('-');
  const season = Number(yearRaw);
  const month = Number(monthRaw);
  const lastDay = lastDayOfMonth(season, month);
  const mm = String(month).padStart(2, '0');
  return {
    periodKey: key,
    season,
    start: `${season}-${mm}-01`,
    end: `${season}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function suggestMonthlyPeriodKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthlyPeriodKeyLabel(periodKey: string): string {
  if (!isValidMonthlyPeriodKey(periodKey)) return periodKey;
  const [year, month] = periodKey.split('-');
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const idx = Number(month) - 1;
  return `${monthNames[idx] ?? month} ${year}`;
}

export function isMonthlyPeriodEnded(periodKey: string, today = new Date()): boolean {
  const range = resolveMonthlyPeriodRange(periodKey);
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayKey = `${y}-${m}-${d}`;
  return todayKey > range.end;
}

export function resolveMonthlyReportStatus(input: {
  periodKey: string;
  reportStatus?: string | null;
  today?: Date;
}): MonthlyReportStatus {
  if (input.reportStatus === 'enviado') return 'enviado';
  if (input.reportStatus === 'rascunho') {
    return isMonthlyPeriodEnded(input.periodKey, input.today) ? 'atrasado' : 'rascunho';
  }
  return isMonthlyPeriodEnded(input.periodKey, input.today) ? 'atrasado' : 'pendente';
}

export function listMonthlyPeriodKeysForSeason(season: number, upToMonth = 12): string[] {
  const keys: string[] = [];
  for (let m = 1; m <= upToMonth; m += 1) {
    keys.push(`${season}-${String(m).padStart(2, '0')}`);
  }
  return keys;
}

export function buildMonthlyPeriodStatuses(input: {
  season: number;
  reports: Array<{ periodKey: string | null; status: string; id: string }>;
  today?: Date;
}): Array<{ periodKey: string; status: MonthlyReportStatus; reportId: string | null }> {
  const today = input.today ?? new Date();
  const currentMonth = today.getFullYear() === input.season ? today.getMonth() + 1 : 12;
  const byKey = new Map(
    input.reports
      .filter((r) => r.periodKey && isValidMonthlyPeriodKey(r.periodKey))
      .map((r) => [r.periodKey!, r]),
  );

  return listMonthlyPeriodKeysForSeason(input.season, currentMonth).map((periodKey) => {
    const row = byKey.get(periodKey);
    return {
      periodKey,
      status: resolveMonthlyReportStatus({
        periodKey,
        reportStatus: row?.status ?? null,
        today,
      }),
      reportId: row?.id ?? null,
    };
  });
}

export function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s\-_]/g, '');
}

export type CategoryResolutionContext = {
  sortOrderMap: Map<string, number>;
  resolveCanonical: (raw: string | null | undefined) => string | null;
};

/** Mapeia value, labelPT e labelEN para o slug canônico de FixtureCategory. */
export function buildCategoryResolutionContext(
  categories: Array<{ value: string; sortOrder: number; labelPT: string; labelEN?: string | null }>,
): CategoryResolutionContext {
  const sortOrderMap = new Map<string, number>();
  const aliasMap = new Map<string, string>();

  for (const c of categories) {
    sortOrderMap.set(c.value, c.sortOrder);
    for (const alias of [c.value, c.labelPT, c.labelEN ?? '']) {
      if (!alias.trim()) continue;
      aliasMap.set(normalizeCategoryKey(alias), c.value);
    }
  }

  return {
    sortOrderMap,
    resolveCanonical: (raw) => {
      if (!raw?.trim()) return null;
      return aliasMap.get(normalizeCategoryKey(raw)) ?? null;
    },
  };
}

export function isLowerCategory(
  playerCategory: string | null | undefined,
  coachCategory: string | null | undefined,
  sortOrderMap: Map<string, number>,
): boolean {
  const player = playerCategory?.trim();
  const coach = coachCategory?.trim();
  if (!player || !coach || player === coach) return false;
  const playerOrder = sortOrderMap.get(player);
  const coachOrder = sortOrderMap.get(coach);
  if (playerOrder == null || coachOrder == null) return false;
  return playerOrder < coachOrder;
}

/** Compara categorias após resolver aliases (label/slug) para FixtureCategory. */
export function isLowerCategoryResolved(
  playerCategory: string | null | undefined,
  coachCategory: string | null | undefined,
  ctx: CategoryResolutionContext,
): boolean {
  const player = ctx.resolveCanonical(playerCategory);
  const coach = ctx.resolveCanonical(coachCategory);
  if (!player || !coach || player === coach) return false;
  const playerOrder = ctx.sortOrderMap.get(player);
  const coachOrder = ctx.sortOrderMap.get(coach);
  if (playerOrder == null || coachOrder == null) return false;
  return playerOrder < coachOrder;
}

export function buildCategorySortOrderMap(
  categories: Array<{ value: string; sortOrder: number }>,
): Map<string, number> {
  return new Map(categories.map((c) => [c.value, c.sortOrder]));
}

/** Atletas convocados/listados no período (FMF listed + viagem oficial), deduplicados. */
export function collectConvokedPlayerIdsInPeriod(input: {
  from: string;
  to: string;
  reportCategory?: string | null;
  squadPlayerIds: Set<string>;
  fmfListed: Array<{ playerId: string; matchDate: Date }>;
  travels: Array<{
    matchDate: Date;
    category: string | null;
    categories: unknown;
    status: string;
    participants: Array<{ playerId: string | null; personType: string }>;
  }>;
}): Set<string> {
  const ids = new Set<string>();

  for (const row of input.fmfListed) {
    const dateKey = row.matchDate.toISOString().slice(0, 10);
    if (!dateKeyInRange(dateKey, input.from, input.to)) continue;
    if (input.squadPlayerIds.has(row.playerId)) ids.add(row.playerId);
  }

  for (const travel of input.travels) {
    if (['rascunho', 'cancelado'].includes(travel.status)) continue;
    const dateKey = travel.matchDate.toISOString().slice(0, 10);
    if (!dateKeyInRange(dateKey, input.from, input.to)) continue;
    if (!travelMatchesCategoryFilter(travel, input.reportCategory)) continue;
    for (const participant of travel.participants) {
      if (participant.personType !== 'player') continue;
      const playerId = participant.playerId?.trim();
      if (!playerId || !input.squadPlayerIds.has(playerId)) continue;
      ids.add(playerId);
    }
  }

  return ids;
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
  fmfMatchReportId?: string | null;
  travelLogisticsId?: string | null;
  playerRatings: Array<{ playerId: string; rating: number | null }>;
  fmfMatchReport: {
    id: string;
    matchDate: Date;
    playerStats: Array<{ playerId: string; minutesPlayed: number; played: boolean }>;
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

type FmfMatchRow = {
  id: string;
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
  tenantId: string;
  reportCategory?: string | null;
  players: PlayerRow[];
  from: string;
  to: string;
  matchReports: MatchReportRow[];
  fmfMatches: FmfMatchRow[];
  trainingSessions: TrainingSessionRow[];
  savedRatings?: Map<string, number | null>;
  savedObservations?: Map<string, string | null>;
  savedStrengths?: Map<string, string | null>;
}): CoachTeamEvaluationPlayerStats[] {
  const squadIds = input.players.map((p) => p.id);
  const minutesMap = buildSquadPlayerPeriodMinutes({
    tenantId: input.tenantId,
    squadPlayerIds: squadIds,
    reportCategory: input.reportCategory,
    from: input.from,
    to: input.to,
    fmfMatches: input.fmfMatches,
    coachMatchReports: input.matchReports.map((r) => ({
      id: r.id,
      matchDate: r.matchDate,
      status: r.status,
      fmfMatchReportId: r.fmfMatchReportId ?? r.fmfMatchReport?.id ?? null,
      travelLogisticsId: r.travelLogisticsId ?? null,
      playerRatings: r.playerRatings,
      fmfMatchReport: r.fmfMatchReport,
    })),
    trainingSessions: input.trainingSessions,
  });

  return input.players
    .map((player) => {
      const row = minutesMap.get(player.id) ?? {
        gamesCount: 0,
        gamesMinutes: 0,
        trainingMinutes: 0,
        matchRatings: [],
      };
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
        individualObservation: input.savedObservations?.get(player.id) ?? null,
        playerStrengths: input.savedStrengths?.get(player.id) ?? null,
        periodicAverage: null,
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
