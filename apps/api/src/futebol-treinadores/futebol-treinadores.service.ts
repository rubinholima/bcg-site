import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuiaPartidaService } from '../futebol-relatorios/guia-partida.service';
import { travelMatchesCategoryFilter } from '../futebol-agenda/travel-categories.util';
import {
  COACH_REPORT_STATUS,
  COACH_TRAINING_ACTIVITY_KINDS,
  coachMatchReportInclude,
  coachTrainingSessionInclude,
} from './futebol-treinadores.constants';

function clampRating(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(0, Math.round(n * 10) / 10));
}

function categoryMatches(
  travelCategory: string | null | undefined,
  categories: unknown,
  filter: string,
): boolean {
  if (!filter) return true;
  return travelMatchesCategoryFilter({ category: travelCategory ?? null, categories }, filter);
}

@Injectable()
export class FutebolTreinadoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guiaPartida: GuiaPartidaService,
  ) {}

  async getContext(tenantId: string, category?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const now = new Date();
    const travels = await this.prisma.travelLogistics.findMany({
      where: {
        tenantId,
        status: { not: 'cancelado' },
      },
      orderBy: { matchDate: 'asc' },
      take: 80,
      select: {
        id: true,
        matchDate: true,
        opponentName: true,
        championshipName: true,
        category: true,
        categories: true,
        isHomeMatch: true,
        stadiumName: true,
        city: true,
        status: true,
      },
    });

    const games = travels.filter((t) => categoryMatches(t.category, t.categories, category ?? ''));

    const playerWhere: Record<string, unknown> = {
      tenantId,
      archivedAt: null,
    };
    if (category) playerWhere.category = category;

    const players = await this.prisma.player.findMany({
      where: playerWhere,
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          yellowCards: true,
          redCards: true,
          category: true,
        },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    });

    const discipline = players
      .filter((p) => (p.yellowCards ?? 0) > 0 || (p.redCards ?? 0) > 0)
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        yellowCards: p.yellowCards ?? 0,
        redCards: p.redCards ?? 0,
      }));

    const activePhysio = await this.prisma.physioSession.findMany({
      where: {
        tenantId,
        status: 'active',
        OR: [{ disposition: 'em_tratamento' }, { disposition: null }],
        ...(category ? { category } : {}),
      },
      select: {
        playerId: true,
        player: { select: { name: true, jerseyNumber: true } },
        disposition: true,
        diagnosisLabel: true,
        estimatedEndDate: true,
      },
    });

    const inTreatment = activePhysio.map((s) => ({
      playerId: s.playerId,
      name: s.player.name,
      jerseyNumber: s.player.jerseyNumber,
      reason: s.diagnosisLabel || 'Em tratamento',
      estimatedEndDate: s.estimatedEndDate?.toISOString() ?? null,
    }));

    let standings: unknown[] = [];
    let opponents: Array<{ name: string; nextMatchDate?: string; championship?: string | null }> = [];
    const nextGame = games.find((g) => g.matchDate >= now) ?? games[games.length - 1];
    if (nextGame) {
      try {
        const guia = await this.guiaPartida.getGuiaPartida(nextGame.id);
        standings = guia.standings ?? [];
        opponents = (guia.nextMatches ?? []).slice(0, 12).map((m) => ({
          name: m.opponent,
          nextMatchDate: m.date,
          championship: m.competition,
        }));
      } catch {
        opponents = [...new Set(games.map((g) => g.opponentName).filter(Boolean))]
          .slice(0, 12)
          .map((name) => ({ name: name! }));
      }
    } else {
      opponents = [...new Set(games.map((g) => g.opponentName).filter(Boolean))]
        .slice(0, 12)
        .map((name) => ({ name: name! }));
    }

    return {
      tenant,
      upcomingGames: games.filter((g) => g.matchDate >= now).slice(0, 12),
      recentGames: games.filter((g) => g.matchDate < now).slice(-12).reverse(),
      discipline,
      inTreatment,
      standings,
      opponents,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        category: p.category,
        inTreatment: inTreatment.some((t) => t.playerId === p.id),
      })),
    };
  }

  async listMatchReports(tenantId: string, category?: string) {
    return this.prisma.coachMatchReport.findMany({
      where: {
        tenantId,
        ...(category ? { category } : {}),
      },
      orderBy: [{ matchDate: 'desc' }, { createdAt: 'desc' }],
      include: coachMatchReportInclude,
    });
  }

  async getMatchReport(id: string) {
    const row = await this.prisma.coachMatchReport.findUnique({
      where: { id },
      include: coachMatchReportInclude,
    });
    if (!row) throw new NotFoundException('Relatório não encontrado');
    return row;
  }

  async upsertMatchReport(input: {
    id?: string;
    tenantId: string;
    travelLogisticsId?: string | null;
    category?: string | null;
    staffId?: string | null;
    authorUserId?: string;
    matchDate?: string | null;
    opponentName?: string | null;
    teamReport?: string | null;
    generalNotes?: string | null;
    status?: string;
    playerRatings?: Array<{
      playerId: string;
      rating?: number | null;
      individualReport?: string | null;
    }>;
    attachments?: Array<{
      id?: string;
      label?: string | null;
      fileUrl: string;
      kind?: string | null;
    }>;
  }) {
    const status =
      input.status && COACH_REPORT_STATUS.includes(input.status as (typeof COACH_REPORT_STATUS)[number])
        ? input.status
        : 'rascunho';

    let travel: { matchDate: Date; opponentName: string | null; category: string | null; categories: unknown } | null = null;
    if (input.travelLogisticsId) {
      travel = await this.prisma.travelLogistics.findFirst({
        where: { id: input.travelLogisticsId, tenantId: input.tenantId },
        select: { matchDate: true, opponentName: true, category: true, categories: true },
      });
      if (!travel) throw new BadRequestException('Jogo/viagem inválido');
    }

    const data = {
      tenantId: input.tenantId,
      travelLogisticsId: input.travelLogisticsId ?? null,
      category: input.category ?? travel?.category ?? null,
      staffId: input.staffId ?? null,
      authorUserId: input.authorUserId ?? null,
      matchDate: input.matchDate ? new Date(input.matchDate) : travel?.matchDate ?? null,
      opponentName: input.opponentName ?? travel?.opponentName ?? null,
      teamReport: input.teamReport?.trim() || null,
      generalNotes: input.generalNotes?.trim() || null,
      status,
    };

    const report = input.id
      ? await this.prisma.coachMatchReport.update({
          where: { id: input.id },
          data,
          include: coachMatchReportInclude,
        })
      : await this.prisma.coachMatchReport.create({
          data,
          include: coachMatchReportInclude,
        });

    if (input.playerRatings) {
      await this.prisma.coachMatchReportPlayerRating.deleteMany({ where: { reportId: report.id } });
      if (input.playerRatings.length > 0) {
        await this.prisma.coachMatchReportPlayerRating.createMany({
          data: input.playerRatings.map((r) => ({
            reportId: report.id,
            playerId: r.playerId,
            rating: clampRating(r.rating),
            individualReport: r.individualReport?.trim() || null,
          })),
        });
      }
    }

    if (input.attachments) {
      await this.prisma.coachMatchReportAttachment.deleteMany({ where: { reportId: report.id } });
      if (input.attachments.length > 0) {
        await this.prisma.coachMatchReportAttachment.createMany({
          data: input.attachments.map((a) => ({
            reportId: report.id,
            label: a.label?.trim() || null,
            fileUrl: a.fileUrl.trim(),
            kind: a.kind?.trim() || null,
          })),
        });
      }
    }

    return this.getMatchReport(report.id);
  }

  async deleteMatchReport(id: string) {
    await this.getMatchReport(id);
    await this.prisma.coachMatchReport.delete({ where: { id } });
    return { ok: true };
  }

  async listTrainingSessions(tenantId: string, category?: string) {
    return this.prisma.coachTrainingSession.findMany({
      where: { tenantId, ...(category ? { category } : {}) },
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      include: coachTrainingSessionInclude,
    });
  }

  async getTrainingSession(id: string) {
    const row = await this.prisma.coachTrainingSession.findUnique({
      where: { id },
      include: coachTrainingSessionInclude,
    });
    if (!row) throw new NotFoundException('Treino não encontrado');
    return row;
  }

  async upsertTrainingSession(input: {
    id?: string;
    tenantId: string;
    category?: string | null;
    staffId?: string | null;
    authorUserId?: string;
    sessionDate: string;
    startTime?: string | null;
    endTime?: string | null;
    objectives?: string | null;
    notes?: string | null;
    status?: string;
    activities?: Array<{
      id?: string;
      kind: string;
      title: string;
      description?: string | null;
      durationMinutes?: number | null;
      sortOrder?: number;
      mediaUrl?: string | null;
    }>;
    playerEntries?: Array<{
      playerId: string;
      available?: boolean;
      unavailableReason?: string | null;
      rating?: number | null;
      notes?: string | null;
    }>;
  }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
      throw new BadRequestException('Data do treino inválida');
    }

    const status =
      input.status && COACH_REPORT_STATUS.includes(input.status as (typeof COACH_REPORT_STATUS)[number])
        ? input.status
        : 'rascunho';

    const data = {
      tenantId: input.tenantId,
      category: input.category ?? null,
      staffId: input.staffId ?? null,
      authorUserId: input.authorUserId ?? null,
      sessionDate: input.sessionDate,
      startTime: input.startTime?.trim() || null,
      endTime: input.endTime?.trim() || null,
      objectives: input.objectives?.trim() || null,
      notes: input.notes?.trim() || null,
      status,
    };

    const session = input.id
      ? await this.prisma.coachTrainingSession.update({
          where: { id: input.id },
          data,
        })
      : await this.prisma.coachTrainingSession.create({ data });

    if (input.activities) {
      await this.prisma.coachTrainingActivity.deleteMany({ where: { sessionId: session.id } });
      const acts = input.activities.filter((a) => a.title?.trim());
      if (acts.length > 0) {
        await this.prisma.coachTrainingActivity.createMany({
          data: acts.map((a, i) => ({
            sessionId: session.id,
            kind: COACH_TRAINING_ACTIVITY_KINDS.includes(a.kind as (typeof COACH_TRAINING_ACTIVITY_KINDS)[number])
              ? a.kind
              : 'principal',
            title: a.title.trim(),
            description: a.description?.trim() || null,
            durationMinutes:
              typeof a.durationMinutes === 'number' && Number.isFinite(a.durationMinutes)
                ? Math.max(0, Math.round(a.durationMinutes))
                : null,
            sortOrder: a.sortOrder ?? i,
            mediaUrl: a.mediaUrl?.trim() || null,
          })),
        });
      }
    }

    if (input.playerEntries) {
      await this.prisma.coachTrainingPlayerEntry.deleteMany({ where: { sessionId: session.id } });
      if (input.playerEntries.length > 0) {
        await this.prisma.coachTrainingPlayerEntry.createMany({
          data: input.playerEntries.map((e) => ({
            sessionId: session.id,
            playerId: e.playerId,
            available: e.available !== false,
            unavailableReason: e.available === false ? e.unavailableReason?.trim() || 'Indisponível' : null,
            rating: clampRating(e.rating),
            notes: e.notes?.trim() || null,
          })),
        });
      }
    }

    return this.getTrainingSession(session.id);
  }

  async deleteTrainingSession(id: string) {
    await this.getTrainingSession(id);
    await this.prisma.coachTrainingSession.delete({ where: { id } });
    return { ok: true };
  }
}
