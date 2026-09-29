import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FutebolTreinadoresService } from '../futebol-treinadores/futebol-treinadores.service';
import {
  COACH_REPORT_STATUS,
  COACH_TRAINING_ACTIVITY_KINDS,
  COACH_TRAINING_ATTACHMENT_KINDS,
  coachTrainingSessionInclude,
} from '../futebol-treinadores/futebol-treinadores.constants';
import {
  buildTrainingPeriodReport,
  buildTrainingSessionReport,
} from '../futebol-treinadores/coach-training-reports.util';
import { TRAINING_SESSION_DOMAIN } from '../prep-fisica/prep-training.constants';
import { PrepLoadSyncService } from '../prep-fisica/prep-load-sync.service';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
  normalizeSportsSituation,
} from '../common/sports-situation.util';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';
import { TreinadorGoleirosDistributionService } from './treinador-goleiros-distribution.service';
import { GK_ANALYSIS_STATUS, GK_ATTACHMENT_KINDS } from './treinador-goleiros.constants';
import {
  crossCategoryLabel,
  isGoalkeeperPosition,
  normalizeYoutubeUrl,
} from './treinador-goleiros.util';

function clampRating(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(0, Math.round(n * 10) / 10));
}

export type UpsertGkSessionInput = {
  id?: string;
  tenantId: string;
  category?: string | null;
  staffId?: string | null;
  authorUserId?: string;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  characteristics?: string | null;
  objectives?: string | null;
  physicalQualities?: string | null;
  notes?: string | null;
  status?: string;
  agendaEntryId?: string | null;
  planTemplateId?: string | null;
  attachments?: Array<{ label?: string | null; fileUrl: string; kind?: string | null }>;
  activities?: Array<{
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
};

const gkAnalysisInclude = {
  players: {
    include: {
      player: {
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          category: true,
          registrationProfile: true,
        },
      },
    },
  },
  attachments: true,
  staff: { select: { id: true, name: true, role: true } },
  coachMatchReport: {
    select: { id: true, matchDate: true, opponentName: true, category: true },
  },
} as const;

@Injectable()
export class TreinadorGoleirosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly treinadores: FutebolTreinadoresService,
    private readonly loadSync: PrepLoadSyncService,
    private readonly distribution: TreinadorGoleirosDistributionService,
  ) {}

  async getContext(tenantId: string, category?: string) {
    const ctx = await this.treinadores.getContext(tenantId, category);
    const goalkeepers = ctx.players.filter((p) => isGoalkeeperPosition(p.position ?? null));
    const staff = await this.prisma.technicalStaff.findMany({
      where: { tenantId, role: 'treinador_goleiros' },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
    return { ...ctx, players: goalkeepers, allPlayersCount: ctx.players.length, staff };
  }

  async listAgendaTreinos(tenantId: string, sessionDate: string, category?: string) {
    return this.treinadores.listAgendaTreinosForLink(tenantId, sessionDate, category);
  }

  async listMatchReportsForGk(tenantId: string, category?: string) {
    return this.treinadores.listMatchReports(tenantId, category);
  }

  async searchGoalkeepers(tenantId: string, search?: string) {
    const rows = await this.prisma.player.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        category: true,
        position: true,
        registrationProfile: true,
      },
      orderBy: [{ category: 'asc' }, { jerseyNumber: 'asc' }, { name: 'asc' }],
    });
    const q = search?.trim().toLowerCase();
    return rows
      .filter((p) => {
        const profile = p.registrationProfile as { sports?: { situation?: string } } | null;
        const situation = normalizeSportsSituation(profile?.sports?.situation);
        if (isArchivedSportsSituation(situation) || isLoanedSportsSituation(situation)) return false;
        if (!isGoalkeeperPosition(p.position)) return false;
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q);
      })
      .map((p) => ({
        id: p.id,
        name: getPlayerListDisplayName(p),
        jerseyNumber: p.jerseyNumber,
        category: p.category,
        position: p.position,
      }));
  }

  private async enrichPlayerEntries(
    tenantId: string,
    sessionCategory: string | null | undefined,
    entries: NonNullable<UpsertGkSessionInput['playerEntries']>,
  ) {
    const ids = entries.map((e) => e.playerId);
    const players = await this.prisma.player.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, category: true },
    });
    const map = new Map(players.map((p) => [p.id, p.category]));
    const sessionCat = sessionCategory?.trim() || null;
    return entries.map((e) => {
      const home = map.get(e.playerId) ?? null;
      const cross =
        !!sessionCat && !!home?.trim() && home.trim().toLowerCase() !== sessionCat.toLowerCase();
      return {
        ...e,
        playerCategoryAtEntry: home,
        crossCategory: cross,
      };
    });
  }

  async listTrainingSessions(tenantId: string, category?: string) {
    return this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        sessionDomain: TRAINING_SESSION_DOMAIN.GOALKEEPER,
        ...(category ? { category } : {}),
      },
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      include: coachTrainingSessionInclude,
    });
  }

  async getTrainingSession(id: string, tenantId?: string) {
    const row = await this.prisma.coachTrainingSession.findFirst({
      where: {
        id,
        ...(tenantId ? { tenantId, sessionDomain: TRAINING_SESSION_DOMAIN.GOALKEEPER } : {}),
      },
      include: coachTrainingSessionInclude,
    });
    if (!row) throw new NotFoundException('Treino de goleiros não encontrado');
    return row;
  }

  async upsertTrainingSession(input: UpsertGkSessionInput) {
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
      characteristics: input.characteristics?.trim() || null,
      objectives: input.objectives?.trim() || null,
      physicalQualities: input.physicalQualities?.trim() || null,
      notes: input.notes?.trim() || null,
      status,
      sessionDomain: TRAINING_SESSION_DOMAIN.GOALKEEPER,
      agendaEntryId: input.agendaEntryId ?? null,
      planTemplateId: input.planTemplateId ?? null,
    };

    let session;
    if (input.id) {
      const existing = await this.prisma.coachTrainingSession.findFirst({
        where: {
          id: input.id,
          tenantId: input.tenantId,
          sessionDomain: TRAINING_SESSION_DOMAIN.GOALKEEPER,
        },
      });
      if (!existing) throw new NotFoundException('Treino de goleiros não encontrado');
      session = await this.prisma.coachTrainingSession.update({
        where: { id: input.id },
        data,
      });
    } else {
      session = await this.prisma.coachTrainingSession.create({ data });
    }

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
      const enriched = await this.enrichPlayerEntries(input.tenantId, input.category, input.playerEntries);
      await this.prisma.coachTrainingPlayerEntry.deleteMany({ where: { sessionId: session.id } });
      if (enriched.length > 0) {
        await this.prisma.coachTrainingPlayerEntry.createMany({
          data: enriched.map((e) => ({
            sessionId: session.id,
            playerId: e.playerId,
            available: e.available !== false,
            unavailableReason: e.available === false ? e.unavailableReason?.trim() || 'Indisponível' : null,
            rating: clampRating(e.rating),
            notes: e.notes?.trim() || null,
            playerCategoryAtEntry: e.playerCategoryAtEntry,
            crossCategory: e.crossCategory,
          })),
        });
      }
    }

    if (input.attachments) {
      await this.prisma.coachTrainingSessionAttachment.deleteMany({ where: { sessionId: session.id } });
      const rows = input.attachments.filter((a) => a.fileUrl?.trim());
      if (rows.length > 0) {
        await this.prisma.coachTrainingSessionAttachment.createMany({
          data: rows.map((a) => ({
            sessionId: session.id,
            label: a.label?.trim() || null,
            fileUrl: a.fileUrl.trim(),
            kind:
              a.kind &&
              COACH_TRAINING_ATTACHMENT_KINDS.includes(
                a.kind as (typeof COACH_TRAINING_ATTACHMENT_KINDS)[number],
              )
                ? a.kind
                : 'keeper_scout',
          })),
        });
      }
    }

    if (status === 'finalizado' && session.category) {
      await this.loadSync.syncForTrainingDay(session.tenantId, session.category, session.sessionDate);
    }

    return this.getTrainingSession(session.id);
  }

  async updateSessionPlayerEntries(
    sessionId: string,
    tenantId: string,
    playerEntries: NonNullable<UpsertGkSessionInput['playerEntries']>,
    sessionNotes?: string | null,
  ) {
    const session = await this.getTrainingSession(sessionId, tenantId);
    const enriched = await this.enrichPlayerEntries(tenantId, session.category, playerEntries);
    await this.prisma.coachTrainingPlayerEntry.deleteMany({ where: { sessionId } });
    if (enriched.length > 0) {
      await this.prisma.coachTrainingPlayerEntry.createMany({
        data: enriched.map((e) => ({
          sessionId,
          playerId: e.playerId,
          available: e.available !== false,
          unavailableReason: e.available === false ? e.unavailableReason?.trim() || 'Indisponível' : null,
          rating: clampRating(e.rating),
          notes: e.notes?.trim() || null,
          playerCategoryAtEntry: e.playerCategoryAtEntry,
          crossCategory: e.crossCategory,
        })),
      });
    }
    if (sessionNotes !== undefined) {
      await this.prisma.coachTrainingSession.update({
        where: { id: sessionId },
        data: { notes: sessionNotes?.trim() || null },
      });
    }
    return this.getTrainingSession(sessionId, tenantId);
  }

  async deleteTrainingSession(id: string, tenantId: string) {
    await this.getTrainingSession(id, tenantId);
    await this.prisma.coachTrainingSession.delete({ where: { id } });
    return { ok: true };
  }

  async getSessionReport(id: string, tenantId: string) {
    const session = await this.getTrainingSession(id, tenantId);
    const report = buildTrainingSessionReport(session);
    return {
      ...report,
      players: report.players.map((p) => ({
        ...p,
        crossCategoryLabel: crossCategoryLabel(p.category, session.category),
      })),
    };
  }

  async getPeriodReport(tenantId: string, from: string, to: string, category?: string) {
    const sessions = await this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        sessionDomain: TRAINING_SESSION_DOMAIN.GOALKEEPER,
        sessionDate: { gte: from, lte: to },
        ...(category ? { category } : {}),
      },
      include: coachTrainingSessionInclude,
      orderBy: [{ sessionDate: 'asc' }],
    });
    return buildTrainingPeriodReport(sessions, from, to, category ?? null);
  }

  async listComissaoSessions(tenantId: string, category?: string) {
    return this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        sessionDomain: TRAINING_SESSION_DOMAIN.COMISSAO,
        ...(category ? { category } : {}),
      },
      orderBy: [{ sessionDate: 'desc' }],
      include: coachTrainingSessionInclude,
    });
  }

  async getComissaoSession(id: string, tenantId: string) {
    const row = await this.prisma.coachTrainingSession.findFirst({
      where: { id, tenantId, sessionDomain: TRAINING_SESSION_DOMAIN.COMISSAO },
      include: coachTrainingSessionInclude,
    });
    if (!row) throw new NotFoundException('Treino da comissão não encontrado');
    return row;
  }

  async listMatchAnalyses(tenantId: string, category?: string) {
    return this.prisma.goalkeeperMatchAnalysis.findMany({
      where: { tenantId, ...(category ? { category } : {}) },
      orderBy: [{ matchDate: 'desc' }, { updatedAt: 'desc' }],
      include: gkAnalysisInclude,
    });
  }

  async getMatchAnalysis(id: string, tenantId: string) {
    const row = await this.prisma.goalkeeperMatchAnalysis.findFirst({
      where: { id, tenantId },
      include: gkAnalysisInclude,
    });
    if (!row) throw new NotFoundException('Análise não encontrada');
    return row;
  }

  async upsertMatchAnalysis(input: {
    id?: string;
    tenantId: string;
    category?: string | null;
    staffId?: string | null;
    authorUserId?: string;
    coachMatchReportId?: string | null;
    travelLogisticsId?: string | null;
    fmfMatchReportId?: string | null;
    observations?: string | null;
    highlightsVideoUrl?: string | null;
    status?: string;
    playerIds?: string[];
    attachments?: Array<{ label?: string | null; fileUrl: string; kind?: string | null }>;
  }) {
    if (
      !input.coachMatchReportId &&
      !input.travelLogisticsId &&
      !input.fmfMatchReportId
    ) {
      throw new BadRequestException('Vincule a análise a um jogo existente.');
    }

    let matchDate: Date | null = null;
    let opponentName: string | null = null;
    if (input.coachMatchReportId) {
      const r = await this.prisma.coachMatchReport.findFirst({
        where: { id: input.coachMatchReportId, tenantId: input.tenantId },
      });
      if (!r) throw new BadRequestException('Relatório pós-jogo inválido');
      matchDate = r.matchDate;
      opponentName = r.opponentName;
      input.travelLogisticsId = input.travelLogisticsId ?? r.travelLogisticsId;
      input.fmfMatchReportId = input.fmfMatchReportId ?? r.fmfMatchReportId;
    } else if (input.travelLogisticsId) {
      const t = await this.prisma.travelLogistics.findFirst({
        where: { id: input.travelLogisticsId, tenantId: input.tenantId },
      });
      if (!t) throw new BadRequestException('Viagem inválida');
      matchDate = t.matchDate;
      opponentName = t.opponentName;
    } else if (input.fmfMatchReportId) {
      const f = await this.prisma.fmfMatchReport.findFirst({
        where: { id: input.fmfMatchReportId, tenantId: input.tenantId },
      });
      if (!f) throw new BadRequestException('Súmula FMF inválida');
      matchDate = f.matchDate;
      opponentName = `${f.homeTeam} x ${f.awayTeam}`;
    }

    const video = normalizeYoutubeUrl(input.highlightsVideoUrl);
    if (input.highlightsVideoUrl?.trim() && !video) {
      throw new BadRequestException('URL do YouTube inválida.');
    }

    const status =
      input.status && GK_ANALYSIS_STATUS.includes(input.status as (typeof GK_ANALYSIS_STATUS)[number])
        ? input.status
        : 'rascunho';

    const data = {
      tenantId: input.tenantId,
      category: input.category ?? null,
      staffId: input.staffId ?? null,
      authorUserId: input.authorUserId ?? null,
      coachMatchReportId: input.coachMatchReportId ?? null,
      travelLogisticsId: input.travelLogisticsId ?? null,
      fmfMatchReportId: input.fmfMatchReportId ?? null,
      matchDate,
      opponentName,
      observations: input.observations?.trim() || null,
      highlightsVideoUrl: video,
      status,
    };

    let analysis;
    if (input.id) {
      const ok = await this.prisma.goalkeeperMatchAnalysis.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });
      if (!ok) throw new NotFoundException('Análise não encontrada');
      analysis = await this.prisma.goalkeeperMatchAnalysis.update({ where: { id: input.id }, data });
    } else {
      analysis = await this.prisma.goalkeeperMatchAnalysis.create({ data });
    }

    if (input.playerIds) {
      const players = await this.prisma.player.findMany({
        where: { id: { in: input.playerIds }, tenantId: input.tenantId },
        select: { id: true, category: true },
      });
      await this.prisma.goalkeeperMatchAnalysisPlayer.deleteMany({ where: { analysisId: analysis.id } });
      if (players.length > 0) {
        await this.prisma.goalkeeperMatchAnalysisPlayer.createMany({
          data: players.map((p) => ({
            analysisId: analysis.id,
            playerId: p.id,
            playerCategoryAtEntry: p.category,
          })),
        });
      }
    }

    if (input.attachments) {
      await this.prisma.goalkeeperMatchAnalysisAttachment.deleteMany({
        where: { analysisId: analysis.id },
      });
      const rows = input.attachments.filter((a) => a.fileUrl?.trim());
      if (rows.length > 0) {
        await this.prisma.goalkeeperMatchAnalysisAttachment.createMany({
          data: rows.map((a) => ({
            analysisId: analysis.id,
            label: a.label?.trim() || null,
            fileUrl: a.fileUrl.trim(),
            kind:
              a.kind && GK_ATTACHMENT_KINDS.includes(a.kind as (typeof GK_ATTACHMENT_KINDS)[number])
                ? a.kind
                : 'keeper_scout',
          })),
        });
      }
    }

    return this.getMatchAnalysis(analysis.id, input.tenantId);
  }

  async deleteMatchAnalysis(id: string, tenantId: string) {
    await this.getMatchAnalysis(id, tenantId);
    await this.prisma.goalkeeperMatchAnalysis.delete({ where: { id } });
    return { ok: true };
  }

  async getKpis(tenantId: string, category?: string, from?: string, to?: string) {
    const dateFilter =
      from && to ? { sessionDate: { gte: from, lte: to } } : {};
    const cat = category?.trim();
    const sessionWhere = {
      tenantId,
      sessionDomain: TRAINING_SESSION_DOMAIN.GOALKEEPER,
      ...(cat ? { category: cat } : {}),
      ...dateFilter,
    };
    const sessions = await this.prisma.coachTrainingSession.findMany({
      where: sessionWhere,
      include: { playerEntries: true, attachments: true },
    });
    const analyses = await this.prisma.goalkeeperMatchAnalysis.findMany({
      where: {
        tenantId,
        ...(cat ? { category: cat } : {}),
        ...(from && to && { matchDate: { gte: new Date(from), lte: new Date(to) } }),
      },
      include: { attachments: true, players: true },
    });

    const gkIds = new Set<string>();
    let crossCount = 0;
    let ratingSum = 0;
    let ratingN = 0;
    let availableN = 0;
    for (const s of sessions) {
      for (const e of s.playerEntries) {
        gkIds.add(e.playerId);
        if (e.crossCategory) crossCount += 1;
        if (e.available) availableN += 1;
        if (e.available && e.rating != null) {
          ratingSum += e.rating;
          ratingN += 1;
        }
      }
    }

    const withPdf = analyses.filter((a) => a.attachments.some((x) => x.kind === 'keeper_scout')).length;
    const withVideo = analyses.filter((a) => a.highlightsVideoUrl).length;
    const finalizedAnalyses = analyses.filter((a) => a.status === 'finalizado').length;

    return {
      gkSessions: sessions.length,
      activeGoalkeepers: gkIds.size,
      attendanceEntries: availableN,
      averageRating: ratingN > 0 ? Math.round((ratingSum / ratingN) * 10) / 10 : null,
      crossCategoryParticipations: crossCount,
      matchAnalyses: analyses.length,
      matchAnalysesCompleted: finalizedAnalyses,
      analysesWithKeeperPdf: withPdf,
      analysesWithVideo: withVideo,
      missingAnalysisArtifacts: analyses.filter(
        (a) => a.status === 'finalizado' && a.attachments.length === 0 && !a.highlightsVideoUrl,
      ).length,
    };
  }

  async getGoalkeeperConsolidatedHistory(playerId: string, tenantId: string) {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, tenantId },
      select: { id: true, name: true, category: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado');

    const training = await this.prisma.coachTrainingPlayerEntry.findMany({
      where: {
        playerId,
        session: { tenantId, sessionDomain: TRAINING_SESSION_DOMAIN.GOALKEEPER },
      },
      orderBy: [{ session: { sessionDate: 'desc' } }],
      include: {
        session: { include: { attachments: true, staff: { select: { name: true } } } },
      },
    });

    const analyses = await this.prisma.goalkeeperMatchAnalysisPlayer.findMany({
      where: { playerId, analysis: { tenantId } },
      orderBy: [{ analysis: { matchDate: 'desc' } }],
      include: {
        analysis: { include: { attachments: true, staff: { select: { name: true } } } },
      },
    });

    return {
      player,
      training: training.map((e) => ({
        kind: 'training' as const,
        sessionId: e.session.id,
        sessionDate: e.session.sessionDate,
        sessionCategory: e.session.category,
        playerCategory: e.playerCategoryAtEntry ?? player.category,
        crossCategory: e.crossCategory,
        crossCategoryLabel: crossCategoryLabel(
          e.playerCategoryAtEntry ?? player.category,
          e.session.category,
        ),
        rating: e.rating,
        notes: e.notes,
        available: e.available,
        attachments: e.session.attachments,
        staffName: e.session.staff?.name ?? null,
      })),
      matchAnalyses: analyses.map((row) => ({
        kind: 'match_analysis' as const,
        analysisId: row.analysis.id,
        matchDate: row.analysis.matchDate,
        opponentName: row.analysis.opponentName,
        observations: row.analysis.observations,
        highlightsVideoUrl: row.analysis.highlightsVideoUrl,
        attachments: row.analysis.attachments,
        staffName: row.analysis.staff?.name ?? null,
        playerCategory: row.playerCategoryAtEntry ?? player.category,
      })),
    };
  }

  async distributeReport(input: {
    tenantId: string;
    kind: string;
    referenceId: string;
    sentByUserId?: string;
    summary: string;
  }) {
    const subject = `CUP360 · Treinador de goleiros — ${input.kind}`;
    return this.distribution.sendAndAudit({
      tenantId: input.tenantId,
      kind: input.kind,
      referenceId: input.referenceId,
      sentByUserId: input.sentByUserId,
      subject,
      text: input.summary,
    });
  }

  async getExecutiveSummary(tenantId: string, category: string | undefined, periodDays: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - periodDays);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const kpis = await this.getKpis(tenantId, category, fmt(from), fmt(to));
    return {
      ...kpis,
      actionUrl: '/dashboard/futebol/treinador-goleiros',
    };
  }
}
