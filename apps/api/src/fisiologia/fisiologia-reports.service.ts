import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  COMPOSITION_STATUS_LABELS,
  HYDRATION_STATUS_LABELS,
  protocolLabel,
} from './fisiologia-calculations.util';
import { FisiologiaTransitionService } from './fisiologia-transition.service';
import { monthDateRange } from './fisiologia-transition.util';

export const FISIOLOGIA_REPORT_KINDS = [
  'geral',
  'avaliacoes',
  'hidratacao',
  'carga_treino',
  'carga_jogo',
  'transicoes',
] as const;

export type FisiologiaReportKind = (typeof FISIOLOGIA_REPORT_KINDS)[number];

@Injectable()
export class FisiologiaReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transitions: FisiologiaTransitionService,
  ) {}

  async buildReport(input: {
    tenantId: string;
    kind: FisiologiaReportKind;
    category?: string;
    playerId?: string;
    from?: string;
    to?: string;
    month?: string;
  }) {
    if (input.kind === 'transicoes') {
      return this.buildTransitionReport(input);
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) return null;

    const dateFrom = input.from && /^\d{4}-\d{2}-\d{2}$/.test(input.from) ? input.from : null;
    const dateTo = input.to && /^\d{4}-\d{2}-\d{2}$/.test(input.to) ? input.to : null;

    const assessmentWhere: Prisma.PhysiologyAssessmentWhereInput = {
      tenantId: input.tenantId,
      ...(input.category ? { category: input.category } : {}),
      ...(input.playerId ? { playerId: input.playerId } : {}),
    };
    if (dateFrom || dateTo) {
      assessmentWhere.assessedAt = {};
      if (dateFrom) assessmentWhere.assessedAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) assessmentWhere.assessedAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const hydrationWhere: Prisma.PhysiologyHydrationWhereInput = {
      tenantId: input.tenantId,
      ...(input.playerId ? { playerId: input.playerId } : {}),
      ...(input.category
        ? { player: { category: input.category } }
        : {}),
    };
    if (dateFrom || dateTo) {
      hydrationWhere.recordedAt = {};
      if (dateFrom) hydrationWhere.recordedAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) hydrationWhere.recordedAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const loadWhere: Prisma.PhysiologyLoadSessionWhereInput = {
      tenantId: input.tenantId,
      ...(input.category ? { category: input.category } : {}),
    };
    if (input.kind === 'carga_treino') loadWhere.sessionType = 'treino';
    if (input.kind === 'carga_jogo') loadWhere.sessionType = 'jogo';
    if (dateFrom || dateTo) {
      loadWhere.sessionDate = {};
      if (dateFrom) loadWhere.sessionDate.gte = dateFrom;
      if (dateTo) loadWhere.sessionDate.lte = dateTo;
    }

    const includeAssessments = input.kind === 'geral' || input.kind === 'avaliacoes';
    const includeHydration = input.kind === 'geral' || input.kind === 'hidratacao';
    const includeLoad =
      input.kind === 'geral' || input.kind === 'carga_treino' || input.kind === 'carga_jogo';

    const assessments = includeAssessments
      ? await this.prisma.physiologyAssessment.findMany({
          where: assessmentWhere,
          orderBy: [{ assessedAt: 'desc' }],
          take: 500,
          include: {
            player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
          },
        })
      : [];

    const hydrations = includeHydration
      ? await this.prisma.physiologyHydration.findMany({
          where: hydrationWhere,
          orderBy: [{ recordedAt: 'desc' }],
          take: 500,
          include: {
            player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
          },
        })
      : [];

    const loadSessions = includeLoad
      ? await this.prisma.physiologyLoadSession.findMany({
          where: loadWhere,
          orderBy: [{ sessionDate: 'desc' }],
          take: 200,
          include: {
            entries: {
              where: input.playerId ? { playerId: input.playerId } : undefined,
              include: {
                player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
              },
            },
          },
        })
      : [];

    return {
      tenant,
      kind: input.kind,
      filters: {
        category: input.category ?? null,
        playerId: input.playerId ?? null,
        from: dateFrom,
        to: dateTo,
      },
      summary: {
        assessmentCount: assessments.length,
        hydrationCount: hydrations.length,
        loadSessionCount: loadSessions.length,
        loadEntryCount: loadSessions.reduce((n, s) => n + s.entries.length, 0),
      },
      assessments: assessments.map((a) => ({
        id: a.id,
        date: a.assessedAt.toISOString(),
        playerName: a.player.name,
        jerseyNumber: a.player.jerseyNumber,
        category: a.category ?? a.player.category,
        assessmentType: a.assessmentType,
        evaluatorRole: a.evaluatorRole,
        evaluatorName: a.evaluatorName,
        ageLabel:
          a.ageYears != null
            ? a.ageMonths
              ? `${a.ageYears} anos e ${a.ageMonths} meses`
              : `${a.ageYears} anos`
            : null,
        weight: a.weight,
        height: a.height,
        bmi: a.bmi,
        protocol: protocolLabel(a.protocol),
        bodyFatPercent: a.bodyFatPercent,
        leanMassKg: a.leanMassKg,
        compositionStatus: a.compositionStatus
          ? COMPOSITION_STATUS_LABELS[a.compositionStatus] ?? a.compositionStatus
          : null,
        vo2max: a.vo2max,
        cmjCm: a.cmjCm,
        illinoisSec: a.illinoisSec,
        tTestSec: a.tTestSec,
      })),
      hydrations: hydrations.map((h) => ({
        id: h.id,
        date: h.recordedAt.toISOString(),
        playerName: h.player.name,
        category: h.player.category,
        contextType: h.contextType,
        weightBefore: h.weightBefore,
        weightAfter: h.weightAfter,
        status: h.status ? HYDRATION_STATUS_LABELS[h.status] ?? h.status : null,
      })),
      loadSessions: loadSessions.map((s) => ({
        id: s.id,
        sessionDate: s.sessionDate,
        category: s.category,
        sessionType: s.sessionType,
        period: s.period,
        trainingType: s.trainingType,
        staffName: s.staffName,
        entries: s.entries.map((e) => ({
          playerName: e.player.name,
          present: e.present,
          rpe: e.rpe,
          trainingMinutes: e.trainingMinutes,
          gameMinutes: e.gameMinutes,
          maxDistanceM: e.maxDistanceM,
          maxSpeedKmh: e.maxSpeedKmh,
          sprintCount: e.sprintCount,
          highIntensityDistanceM: e.highIntensityDistanceM,
          lowIntensityDistanceM: e.lowIntensityDistanceM,
          sprintDistanceM: e.sprintDistanceM,
        })),
      })),
    };
  }

  private async buildTransitionReport(input: {
    tenantId: string;
    category?: string;
    playerId?: string;
    from?: string;
    to?: string;
    month?: string;
  }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) return null;

    const monthKey =
      input.month?.trim() ||
      (input.from && /^\d{4}-\d{2}-\d{2}$/.test(input.from) ? input.from.slice(0, 7) : null);
    if (!monthKey) return null;

    const range = monthDateRange(monthKey);
    if (!range) return null;

    const transitionReport = await this.transitions.buildMonthlyReport({
      tenantId: input.tenantId,
      month: monthKey,
      category: input.category,
      playerId: input.playerId,
    });
    if (!transitionReport) return null;

    return {
      tenant,
      kind: 'transicoes' as const,
      filters: {
        category: input.category ?? null,
        playerId: input.playerId ?? null,
        from: range.from,
        to: range.to,
        month: range.monthKey,
      },
      summary: {
        assessmentCount: 0,
        hydrationCount: 0,
        loadSessionCount: 0,
        loadEntryCount: 0,
        transitionEnteredInMonth: transitionReport.summary.enteredInMonth,
        transitionActivityInMonth: transitionReport.summary.withActivityInMonth,
        transitionReleasedInMonth: transitionReport.summary.releasedInMonth,
        transitionActiveAtMonthEnd: transitionReport.summary.activeAtMonthEnd,
        transitionSessionsInMonth: transitionReport.summary.sessionsInMonth,
        transitionDurationMinutesInMonth: transitionReport.summary.durationMinutesInMonth,
      },
      assessments: [],
      hydrations: [],
      loadSessions: [],
      transitionReport,
    };
  }
}
