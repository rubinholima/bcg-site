import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
  normalizeSportsSituation,
} from '../common/sports-situation.util';
import { PrismaService } from '../prisma/prisma.service';
import { GuiaPartidaService } from '../futebol-relatorios/guia-partida.service';
import { travelMatchesCategoryFilter } from '../futebol-agenda/travel-categories.util';
import { dedupeTravelLogisticsList } from '../logistica/travel-logistics-dedup.util';
import {
  FMF_SYNC_TENANT_DEFAULTS,
  isFmfSyncTenantSlug,
} from '../fmf-scraper/fmf-sync-tenants.config';
import type { FmfScraperStore } from '../fmf-scraper/fmf-scraper.service';
import {
  buildCompletedGames,
  buildLastRoundFromStore,
  buildStandingsFromStore,
  resolveStoreCategory,
} from './coach-context.helper';
import {
  buildTrainingPeriodReport,
  buildTrainingSessionReport,
  defaultPeriodRange,
} from './coach-training-reports.util';
import {
  COACH_REPORT_STATUS,
  COACH_TEAM_PLAYER_ACTION,
  COACH_TEAM_REPORT_PERIOD,
  COACH_TEAM_REPORT_STATUS,
  COACH_TRAINING_ACTIVITY_KINDS,
  COACH_TRAINING_ATTACHMENT_KINDS,
  coachMatchReportInclude,
  coachTeamReportInclude,
  coachTrainingSessionInclude,
} from './futebol-treinadores.constants';
import {
  CoachMatchStatsService,
  type UpsertMatchStatOverrideInput,
} from '../coach-match-stats/coach-match-stats.service';

const FMF_STORE_KEY = 'fmf_scraper_data';

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
    private readonly matchStats: CoachMatchStatsService,
  ) {}

  private async tenantAliases(tenantId: string, name: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (tenant?.slug && isFmfSyncTenantSlug(tenant.slug)) {
      return [...FMF_SYNC_TENANT_DEFAULTS[tenant.slug].fmfTeamNames];
    }
    return [name];
  }

  private async loadFmfStore(): Promise<FmfScraperStore | null> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: FMF_STORE_KEY },
    });
    if (!row?.config || typeof row.config !== 'object') return null;
    return row.config as unknown as FmfScraperStore;
  }

  async getContext(tenantId: string, category?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, tradeName: true, categories: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const clubName = tenant.tradeName?.trim() || tenant.name;
    const aliases = await this.tenantAliases(tenantId, tenant.name);
    const now = new Date();
    const catFilter = category?.trim() ?? '';

    const travelsRaw = await this.prisma.travelLogistics.findMany({
      where: {
        tenantId,
        status: { not: 'cancelado' },
      },
      orderBy: { matchDate: 'asc' },
      select: {
        id: true,
        tenantId: true,
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

    const travels = dedupeTravelLogisticsList(travelsRaw) as typeof travelsRaw;
    const games = travels.filter((t) => categoryMatches(t.category, t.categories, catFilter));

    const playersRaw = await this.prisma.player.findMany({
      where: {
        tenantId,
        ...(catFilter ? { category: catFilter } : {}),
      },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        yellowCards: true,
        redCards: true,
        category: true,
        registrationProfile: true,
      },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    });

    const players = playersRaw.filter((p) => {
      const profile = p.registrationProfile as { sports?: { situation?: string } } | null;
      const situation = normalizeSportsSituation(profile?.sports?.situation);
      return !isArchivedSportsSituation(situation) && !isLoanedSportsSituation(situation);
    });

    const activePhysio = await this.prisma.physioSession.findMany({
      where: {
        tenantId,
        status: 'active',
        OR: [{ disposition: 'em_tratamento' }, { disposition: null }],
        ...(catFilter ? { category: catFilter } : {}),
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

    const treatmentIds = new Set(inTreatment.map((t) => t.playerId));

    const fmfReports = await this.prisma.fmfMatchReport.findMany({
      where: { tenantId },
      orderBy: { matchDate: 'desc' },
      include: {
        playerStats: {
          select: { goals: true, yellowCards: true, redCards: true },
        },
      },
    });

    const statOverrides = await this.prisma.coachMatchStatOverride.findMany({
      where: {
        tenantId,
        ...(catFilter
          ? { OR: [{ category: catFilter }, { category: null }] }
          : {}),
      },
    });

    const completedGames = buildCompletedGames({
      now,
      category: catFilter,
      clubName,
      aliases,
      travels,
      fmfReports,
      overrides: statOverrides,
    });

    const store = await this.loadFmfStore();
    const fallbackCategories = [
      ...new Set(
        [
          catFilter,
          ...games.map((g) => g.category).filter((c): c is string => !!c?.trim()),
          ...(Array.isArray(tenant.categories)
            ? tenant.categories.filter((c): c is string => typeof c === 'string' && !!c.trim())
            : []),
        ].filter((c): c is string => !!c?.trim()),
      ),
    ];
    const storeCategory = resolveStoreCategory(store, catFilter, fallbackCategories);
    let standings = buildStandingsFromStore(store, storeCategory, clubName, aliases);
    const lastRound = buildLastRoundFromStore(store, storeCategory, clubName, aliases);

    let opponents: Array<{ name: string; nextMatchDate?: string; championship?: string | null }> = [];
    const nextGame = games.find((g) => g.matchDate >= now) ?? games[games.length - 1];
    if (nextGame) {
      try {
        const guia = await this.guiaPartida.getGuiaPartida(nextGame.id);
        if (standings.length === 0) standings = guia.standings ?? [];
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

    const discipline = players
      .filter((p) => (p.yellowCards ?? 0) > 0 || (p.redCards ?? 0) > 0)
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        yellowCards: p.yellowCards ?? 0,
        redCards: p.redCards ?? 0,
      }));

    const availableSquad = players
      .filter((p) => !treatmentIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        category: p.category,
      }));

    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      upcomingGames: games.filter((g) => g.matchDate >= now).slice(0, 12),
      recentGames: completedGames.slice(0, 12).map((g) => ({
        id: g.travelLogisticsId ?? g.fmfMatchReportId ?? g.gameKey,
        matchDate: g.matchDate,
        opponentName: g.opponentName,
        championshipName: g.competition,
        category: catFilter || null,
        categories: null,
        isHomeMatch: g.isHome,
        stadiumName: null,
        city: null,
        status: 'realizado',
      })),
      completedGames,
      lastRound,
      discipline,
      inTreatment,
      availableSquad,
      standings,
      opponents,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        category: p.category,
        inTreatment: treatmentIds.has(p.id),
      })),
    };
  }

  async upsertMatchStatOverride(input: UpsertMatchStatOverrideInput) {
    return this.matchStats.upsert(input);
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
    fmfMatchReportId?: string | null;
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

    let fmfReport: { matchDate: Date; homeTeam: string; awayTeam: string; category: string } | null = null;
    if (input.fmfMatchReportId) {
      fmfReport = await this.prisma.fmfMatchReport.findFirst({
        where: { id: input.fmfMatchReportId, tenantId: input.tenantId },
        select: { matchDate: true, homeTeam: true, awayTeam: true, category: true },
      });
      if (!fmfReport) throw new BadRequestException('Jogo inválido');
    }

    const data = {
      tenantId: input.tenantId,
      travelLogisticsId: input.travelLogisticsId ?? null,
      fmfMatchReportId: input.fmfMatchReportId ?? null,
      category: input.category ?? travel?.category ?? fmfReport?.category ?? null,
      staffId: input.staffId ?? null,
      authorUserId: input.authorUserId ?? null,
      matchDate: input.matchDate ? new Date(input.matchDate) : travel?.matchDate ?? fmfReport?.matchDate ?? null,
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
    agendaEntryId?: string | null;
    planTemplateId?: string | null;
    attachments?: Array<{
      id?: string;
      label?: string | null;
      fileUrl: string;
      kind?: string | null;
    }>;
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

    if (input.agendaEntryId) {
      const agenda = await this.prisma.footballAgendaEntry.findFirst({
        where: { id: input.agendaEntryId, tenantId: input.tenantId },
        select: { id: true },
      });
      if (!agenda) throw new BadRequestException('Compromisso da agenda inválido');
    }

    if (input.planTemplateId) {
      const template = await this.prisma.coachTrainingPlanTemplate.findFirst({
        where: { id: input.planTemplateId, tenantId: input.tenantId },
        select: { id: true },
      });
      if (!template) throw new BadRequestException('Plano da biblioteca inválido');
    }

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
      agendaEntryId: input.agendaEntryId ?? null,
      planTemplateId: input.planTemplateId ?? null,
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
                : 'plano_treino',
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

  async listPlanTemplates(tenantId: string, category?: string) {
    return this.prisma.coachTrainingPlanTemplate.findMany({
      where: {
        tenantId,
        ...(category ? { OR: [{ category }, { category: null }] } : {}),
      },
      orderBy: [{ title: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async upsertPlanTemplate(input: {
    id?: string;
    tenantId: string;
    category?: string | null;
    title: string;
    fileUrl: string;
    notes?: string | null;
    authorUserId?: string;
  }) {
    const title = input.title?.trim();
    const fileUrl = input.fileUrl?.trim();
    if (!title) throw new BadRequestException('Título do plano é obrigatório');
    if (!fileUrl) throw new BadRequestException('Arquivo do plano é obrigatório');

    const data = {
      tenantId: input.tenantId,
      category: input.category ?? null,
      title,
      fileUrl,
      notes: input.notes?.trim() || null,
      authorUserId: input.authorUserId ?? null,
    };

    if (input.id) {
      const existing = await this.prisma.coachTrainingPlanTemplate.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });
      if (!existing) throw new NotFoundException('Plano não encontrado');
      return this.prisma.coachTrainingPlanTemplate.update({
        where: { id: input.id },
        data,
      });
    }

    return this.prisma.coachTrainingPlanTemplate.create({ data });
  }

  async deletePlanTemplate(id: string, tenantId: string) {
    const row = await this.prisma.coachTrainingPlanTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Plano não encontrado');
    await this.prisma.coachTrainingPlanTemplate.delete({ where: { id } });
    return { ok: true };
  }

  async listAgendaTreinosForLink(tenantId: string, sessionDate: string, category?: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return [];
    const start = new Date(`${sessionDate}T00:00:00.000Z`);
    const end = new Date(`${sessionDate}T23:59:59.999Z`);
    return this.prisma.footballAgendaEntry.findMany({
      where: {
        tenantId,
        type: 'treino',
        status: { not: 'cancelado' },
        startAt: { gte: start, lte: end },
        ...(category ? { category } : {}),
      },
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        category: true,
      },
    });
  }

  async getTrainingSessionReport(sessionId: string) {
    const session = await this.getTrainingSession(sessionId);
    return buildTrainingSessionReport(session);
  }

  async getTrainingPeriodReport(
    tenantId: string,
    from?: string,
    to?: string,
    category?: string,
  ) {
    const defaults = defaultPeriodRange();
    const fromDate = from?.trim() || defaults.from;
    const toDate = to?.trim() || defaults.to;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      throw new BadRequestException('Período inválido');
    }

    const sessions = await this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        sessionDate: { gte: fromDate, lte: toDate },
        ...(category ? { category } : {}),
      },
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      include: coachTrainingSessionInclude,
    });

    return buildTrainingPeriodReport(sessions, fromDate, toDate, category ?? null);
  }

  async listTeamReports(
    tenantId: string,
    category?: string,
    periodType?: string,
    status?: string,
  ) {
    const period =
      periodType &&
      COACH_TEAM_REPORT_PERIOD.includes(periodType as (typeof COACH_TEAM_REPORT_PERIOD)[number])
        ? periodType
        : undefined;
    const statusFilter =
      status &&
      COACH_TEAM_REPORT_STATUS.includes(status as (typeof COACH_TEAM_REPORT_STATUS)[number])
        ? status
        : undefined;

    return this.prisma.coachTeamReport.findMany({
      where: {
        tenantId,
        ...(category ? { category } : {}),
        ...(period ? { periodType: period } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
      include: coachTeamReportInclude,
    });
  }

  async getTeamReport(id: string) {
    const row = await this.prisma.coachTeamReport.findUnique({
      where: { id },
      include: coachTeamReportInclude,
    });
    if (!row) throw new NotFoundException('Relatório da equipe não encontrado');
    return row;
  }

  async upsertTeamReport(input: {
    id?: string;
    tenantId: string;
    category?: string | null;
    periodType: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    generalDescription?: string | null;
    weakPoints?: string | null;
    status?: string;
    staffId?: string | null;
    authorUserId?: string;
    playerActions?: Array<{
      playerId: string;
      actionType: string;
      reason?: string | null;
    }>;
  }) {
    if (
      !COACH_TEAM_REPORT_PERIOD.includes(
        input.periodType as (typeof COACH_TEAM_REPORT_PERIOD)[number],
      )
    ) {
      throw new BadRequestException('Tipo de período inválido');
    }

    const status =
      input.status &&
      COACH_TEAM_REPORT_STATUS.includes(input.status as (typeof COACH_TEAM_REPORT_STATUS)[number])
        ? input.status
        : 'rascunho';

    let sentAt: Date | null = null;
    if (status === 'enviado') {
      if (input.id) {
        const existing = await this.prisma.coachTeamReport.findUnique({
          where: { id: input.id },
          select: { sentAt: true },
        });
        sentAt = existing?.sentAt ?? new Date();
      } else {
        sentAt = new Date();
      }
    }

    const parseDate = (value?: string | null) => {
      if (!value?.trim()) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const playerIds = new Set<string>();
    for (const action of input.playerActions ?? []) {
      if (playerIds.has(action.playerId)) {
        throw new BadRequestException('Cada atleta só pode ter uma indicação por relatório');
      }
      playerIds.add(action.playerId);
      if (
        !COACH_TEAM_PLAYER_ACTION.includes(
          action.actionType as (typeof COACH_TEAM_PLAYER_ACTION)[number],
        )
      ) {
        throw new BadRequestException('Tipo de indicação inválido');
      }
    }

    const data = {
      tenantId: input.tenantId,
      category: input.category ?? null,
      periodType: input.periodType,
      periodStart: parseDate(input.periodStart),
      periodEnd: parseDate(input.periodEnd),
      generalDescription: input.generalDescription?.trim() || null,
      weakPoints: input.weakPoints?.trim() || null,
      status,
      staffId: input.staffId ?? null,
      authorUserId: input.authorUserId ?? null,
      sentAt,
    };

    const report = input.id
      ? await this.prisma.coachTeamReport.update({
          where: { id: input.id },
          data,
        })
      : await this.prisma.coachTeamReport.create({ data });

    if (input.playerActions) {
      await this.prisma.coachTeamReportPlayerAction.deleteMany({ where: { reportId: report.id } });
      if (input.playerActions.length > 0) {
        await this.prisma.coachTeamReportPlayerAction.createMany({
          data: input.playerActions.map((a) => ({
            reportId: report.id,
            playerId: a.playerId,
            actionType: a.actionType,
            reason: a.reason?.trim() || null,
          })),
        });
      }
    }

    return this.getTeamReport(report.id);
  }

  async submitTeamReport(id: string) {
    await this.getTeamReport(id);
    return this.prisma.coachTeamReport.update({
      where: { id },
      data: { status: 'enviado', sentAt: new Date() },
      include: coachTeamReportInclude,
    });
  }

  async deleteTeamReport(id: string) {
    await this.getTeamReport(id);
    await this.prisma.coachTeamReport.delete({ where: { id } });
    return { ok: true };
  }

  async getTeamReportSummary(tenantId: string, category?: string) {
    const where = {
      tenantId,
      ...(category ? { category } : {}),
    };
    const [total, enviados, rascunhos, latestEnviado, actions] = await Promise.all([
      this.prisma.coachTeamReport.count({ where }),
      this.prisma.coachTeamReport.count({ where: { ...where, status: 'enviado' } }),
      this.prisma.coachTeamReport.count({ where: { ...where, status: 'rascunho' } }),
      this.prisma.coachTeamReport.findFirst({
        where: { ...where, status: 'enviado' },
        orderBy: [{ sentAt: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true, periodType: true, sentAt: true, periodStart: true, periodEnd: true },
      }),
      this.prisma.coachTeamReportPlayerAction.groupBy({
        by: ['actionType'],
        where: {
          report: { ...where, status: 'enviado' },
        },
        _count: { _all: true },
      }),
    ]);

    const actionCounts = Object.fromEntries(
      actions.map((a) => [a.actionType, a._count._all]),
    ) as Record<string, number>;

    return {
      total,
      enviados,
      rascunhos,
      latestEnviado,
      dispensasIndicadas: actionCounts.dispensa ?? 0,
      promocoesIndicadas: actionCounts.promocao ?? 0,
    };
  }
}
