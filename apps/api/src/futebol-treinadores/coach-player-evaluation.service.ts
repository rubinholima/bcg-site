import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  clampEvaluationScore,
  COACH_PLAYER_EVALUATION_FINAL_RESULT,
  COACH_PLAYER_EVALUATION_SCORE_FIELDS,
  COACH_PLAYER_EVALUATION_STATUS,
  computeEvaluationAverages,
  computePeriodicEvaluationAverage,
  buildCategorySortOrderMap,
  buildIndividualPlayerPeriodStats,
  isValidPlayerEvaluationPeriodKey,
  resolvePlayerEvaluationPeriod,
  validatePlayerEvaluationSubmit,
  type CoachTeamReportPeriodKey,
} from './coach-player-evaluation.util';

const coachPlayerEvaluationInclude = {
  player: {
    select: {
      id: true,
      name: true,
      photoUrl: true,
      category: true,
      jerseyNumber: true,
      registrationProfile: true,
    },
  },
} as const;

@Injectable()
export class CoachPlayerEvaluationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: {
    tenantId: string;
    category?: string;
    season?: number;
    periodKey?: string;
    playerId?: string;
    status?: string;
  }) {
    const status =
      filters.status &&
      COACH_PLAYER_EVALUATION_STATUS.includes(
        filters.status as (typeof COACH_PLAYER_EVALUATION_STATUS)[number],
      )
        ? filters.status
        : undefined;

    return this.prisma.coachPlayerEvaluation.findMany({
      where: {
        tenantId: filters.tenantId,
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.season ? { season: filters.season } : {}),
        ...(filters.periodKey ? { periodKey: filters.periodKey } : {}),
        ...(filters.playerId ? { playerId: filters.playerId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ season: 'desc' }, { periodKey: 'asc' }, { updatedAt: 'desc' }],
      include: coachPlayerEvaluationInclude,
    });
  }

  async getSummary(tenantId: string, category: string, season: number) {
    const rows = await this.prisma.coachPlayerEvaluation.findMany({
      where: { tenantId, category, season },
      select: { playerId: true, periodKey: true, status: true },
    });
    const players = await this.prisma.player.findMany({
      where: { tenantId, category },
      select: { id: true },
    });
    const periodKeys = ['fevereiro', 'julho', 'setembro', 'fim_temporada'] as const;
    const byPlayer = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const map = byPlayer.get(row.playerId) ?? {};
      map[row.periodKey] = row.status;
      byPlayer.set(row.playerId, map);
    }
    return {
      season,
      category,
      players: players.map((p) => ({
        playerId: p.id,
        periods: periodKeys.map((periodKey) => ({
          periodKey,
          status: byPlayer.get(p.id)?.[periodKey] ?? 'pendente',
        })),
      })),
    };
  }

  async getHistory(playerId: string, season: number) {
    const rows = await this.prisma.coachPlayerEvaluation.findMany({
      where: { playerId, season },
      orderBy: [{ periodKey: 'asc' }],
      include: coachPlayerEvaluationInclude,
    });
    const periodicAverage = computePeriodicEvaluationAverage(rows);
    return { season, evaluations: rows, periodicAverage };
  }

  async getStats(
    tenantId: string,
    playerId: string,
    season: number,
    periodKey: string,
  ) {
    if (!isValidPlayerEvaluationPeriodKey(periodKey)) {
      throw new BadRequestException('Período de avaliação inválido');
    }
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, tenantId },
      select: { id: true, category: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado');

    const range = resolvePlayerEvaluationPeriod(season, periodKey);
    const categorySortOrder = await this.loadCategorySortOrder();

    const [fmfStats, travelsRaw, coachMatchReports, trainingSessions] = await Promise.all([
      this.prisma.fmfPlayerMatchStat.findMany({
        where: {
          playerId,
          match: {
            tenantId,
            matchDate: {
              gte: new Date(`${range.start}T00:00:00-03:00`),
              lte: new Date(`${range.end}T23:59:59-03:00`),
            },
          },
        },
        select: {
          listed: true,
          played: true,
          starter: true,
          minutesPlayed: true,
          goals: true,
          match: { select: { id: true, matchDate: true, category: true } },
        },
      }),
      this.prisma.travelLogistics.findMany({
        where: {
          tenantId,
          status: { notIn: ['rascunho', 'cancelado'] },
          matchDate: {
            gte: new Date(`${range.start}T00:00:00-03:00`),
            lte: new Date(`${range.end}T23:59:59-03:00`),
          },
          participants: { some: { playerId, personType: 'player' } },
        },
        select: {
          id: true,
          matchDate: true,
          category: true,
          categories: true,
          status: true,
          coachMatchReport: { select: { fmfMatchReportId: true } },
        },
      }),
      this.prisma.coachMatchReport.findMany({
        where: {
          tenantId,
          status: 'finalizado',
          playerRatings: { some: { playerId } },
        },
        select: {
          id: true,
          matchDate: true,
          status: true,
          fmfMatchReportId: true,
          travelLogisticsId: true,
          playerRatings: {
            where: { playerId },
            select: { rating: true, assists: true },
          },
          fmfMatchReport: {
            select: {
              id: true,
              matchDate: true,
              category: true,
              playerStats: {
                where: { playerId },
                select: {
                  listed: true,
                  played: true,
                  starter: true,
                  minutesPlayed: true,
                  goals: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.coachTrainingSession.findMany({
        where: {
          tenantId,
          status: 'finalizado',
          sessionDate: { gte: range.start, lte: range.end },
          playerEntries: { some: { playerId } },
        },
        select: {
          sessionDate: true,
          status: true,
          startTime: true,
          endTime: true,
          activities: { select: { durationMinutes: true } },
          playerEntries: {
            where: { playerId },
            select: { available: true },
          },
        },
      }),
    ]);

    const stats = buildIndividualPlayerPeriodStats({
      tenantId,
      playerId,
      playerCategory: player.category,
      from: range.start,
      to: range.end,
      categorySortOrder,
      fmfStats: fmfStats.map((row) => ({
        matchId: row.match.id,
        matchDate: row.match.matchDate,
        category: row.match.category,
        listed: row.listed,
        played: row.played,
        starter: row.starter,
        minutesPlayed: row.minutesPlayed,
        goals: row.goals,
      })),
      travels: travelsRaw.map((t) => ({
        id: t.id,
        matchDate: t.matchDate,
        category: t.category,
        categories: t.categories,
        status: t.status,
        fmfMatchReportId: t.coachMatchReport?.fmfMatchReportId ?? null,
      })),
      coachMatchReports: coachMatchReports.map((r) => ({
        id: r.id,
        matchDate: r.matchDate,
        status: r.status,
        fmfMatchReportId: r.fmfMatchReportId,
        travelLogisticsId: r.travelLogisticsId,
        playerRatings: r.playerRatings,
        fmfMatchReport: r.fmfMatchReport
          ? {
              id: r.fmfMatchReport.id,
              matchDate: r.fmfMatchReport.matchDate,
              category: r.fmfMatchReport.category,
              playerStats: r.fmfMatchReport.playerStats,
            }
          : null,
      })),
      trainingSessions,
    });

    return {
      ...range,
      playerCategory: player.category,
      stats,
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.coachPlayerEvaluation.findUnique({
      where: { id },
      include: coachPlayerEvaluationInclude,
    });
    if (!row) throw new NotFoundException('Avaliação não encontrada');
    return row;
  }

  async upsert(input: {
    id?: string;
    tenantId: string;
    playerId: string;
    category: string;
    season: number;
    periodKey: string;
    authorUserId?: string;
    staffId?: string | null;
    technicalAssessment?: string | null;
    finalResult?: string | null;
    submit?: boolean;
    scores: Record<string, number | null | undefined>;
  }) {
    if (!isValidPlayerEvaluationPeriodKey(input.periodKey)) {
      throw new BadRequestException('Período de avaliação inválido');
    }

    const player = await this.prisma.player.findFirst({
      where: { id: input.playerId, tenantId: input.tenantId },
      select: { id: true, category: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado');

    const range = resolvePlayerEvaluationPeriod(
      input.season,
      input.periodKey as CoachTeamReportPeriodKey,
    );
    const statsPayload = await this.getStats(
      input.tenantId,
      input.playerId,
      input.season,
      input.periodKey,
    );

    const parsedScores = Object.fromEntries(
      COACH_PLAYER_EVALUATION_SCORE_FIELDS.map((key) => [
        key,
        clampEvaluationScore(input.scores[key]),
      ]),
    ) as Record<(typeof COACH_PLAYER_EVALUATION_SCORE_FIELDS)[number], number | null>;

    const submit = input.submit === true;
    if (submit) {
      const err = validatePlayerEvaluationSubmit({
        technicalAssessment: input.technicalAssessment,
        finalResult: input.finalResult,
        scores: parsedScores,
        requiredScoreKeys: [...COACH_PLAYER_EVALUATION_SCORE_FIELDS],
      });
      if (err) throw new BadRequestException(err);
    }

    const averages = computeEvaluationAverages(parsedScores);
    const status = submit ? 'concluido' : 'rascunho';

    if (input.id) {
      const current = await this.findOne(input.id);
      if (current.status === 'concluido') {
        throw new BadRequestException('Avaliação concluída não pode ser alterada.');
      }
    }

    const data = {
      tenantId: input.tenantId,
      playerId: input.playerId,
      category: input.category,
      season: input.season,
      periodKey: input.periodKey,
      periodStart: range.start,
      periodEnd: range.end,
      status,
      ...statsPayload.stats,
      ...parsedScores,
      ...averages,
      technicalAssessment: input.technicalAssessment?.trim() || null,
      finalResult: submit
        ? input.finalResult
        : input.finalResult &&
            COACH_PLAYER_EVALUATION_FINAL_RESULT.includes(
              input.finalResult as (typeof COACH_PLAYER_EVALUATION_FINAL_RESULT)[number],
            )
          ? input.finalResult
          : null,
      authorUserId: input.authorUserId ?? null,
      staffId: input.staffId ?? null,
      submittedAt: submit ? new Date() : null,
    };

    try {
      if (input.id) {
        return this.prisma.coachPlayerEvaluation.update({
          where: { id: input.id },
          data,
          include: coachPlayerEvaluationInclude,
        });
      }
      return this.prisma.coachPlayerEvaluation.create({
        data,
        include: coachPlayerEvaluationInclude,
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new BadRequestException(
          'Já existe avaliação para este atleta neste período.',
        );
      }
      throw err;
    }
  }

  async submit(id: string) {
    const row = await this.findOne(id);
    if (row.status === 'concluido') return row;
    return this.upsert({
      id,
      tenantId: row.tenantId,
      playerId: row.playerId,
      category: row.category,
      season: row.season,
      periodKey: row.periodKey,
      technicalAssessment: row.technicalAssessment,
      finalResult: row.finalResult,
      authorUserId: row.authorUserId ?? undefined,
      staffId: row.staffId,
      submit: true,
      scores: Object.fromEntries(
        COACH_PLAYER_EVALUATION_SCORE_FIELDS.map((key) => [
          key,
          row[key as keyof typeof row] as number | null,
        ]),
      ),
    });
  }

  private async loadCategorySortOrder() {
    const rows = await this.prisma.fixtureCategory.findMany({
      where: { active: true },
      select: { value: true, sortOrder: true },
    });
    return buildCategorySortOrderMap(rows);
  }
}
