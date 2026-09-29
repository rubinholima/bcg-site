import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
  normalizeSportsSituation,
} from '../common/sports-situation.util';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';
import {
  COACH_REPORT_STATUS,
  COACH_TRAINING_ACTIVITY_KINDS,
  COACH_TRAINING_ATTACHMENT_KINDS,
  coachTrainingSessionInclude,
} from '../futebol-treinadores/futebol-treinadores.constants';
import { TRAINING_LOCATION, TRAINING_SESSION_DOMAIN } from './prep-training.constants';
import { PrepLoadSyncService } from './prep-load-sync.service';
import { PrepPseService } from './prep-pse.service';
import {
  computeCanonicalTrainingMinutesForPlayer,
  type TrainingSessionForMinutes,
} from './prep-load-minutes.util';

function clampRating(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(0, Math.round(n * 10) / 10));
}

export type UpsertPrepSessionInput = {
  id?: string;
  tenantId: string;
  category?: string | null;
  staffId?: string | null;
  authorUserId?: string;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  objectives?: string | null;
  notes?: string | null;
  status?: string;
  agendaEntryId?: string | null;
  planTemplateId?: string | null;
  blockGroupId?: string | null;
  blockSequence?: number;
  activities?: Array<{
    kind: string;
    title: string;
    objectiveId?: string | null;
    objectiveText?: string | null;
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
  attachments?: Array<{
    label?: string | null;
    fileUrl: string;
    kind?: string | null;
  }>;
};

@Injectable()
export class PrepFisicaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loadSync: PrepLoadSyncService,
    private readonly pse: PrepPseService,
  ) {}

  async getContext(tenantId: string, category?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const catFilter = category?.trim() ?? '';
    const playersRaw = await this.prisma.player.findMany({
      where: { tenantId, ...(catFilter ? { category: catFilter } : {}) },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        jerseyNumber: true,
        category: true,
        contactEmail: true,
        registrationProfile: true,
      },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    });

    const players = playersRaw
      .filter((p) => {
        const profile = p.registrationProfile as { sports?: { situation?: string } } | null;
        const situation = normalizeSportsSituation(profile?.sports?.situation);
        return !isArchivedSportsSituation(situation) && !isLoanedSportsSituation(situation);
      })
      .map((p) => ({
        id: p.id,
        name: getPlayerListDisplayName(p),
        jerseyNumber: p.jerseyNumber,
        category: p.category,
        contactEmail: p.contactEmail,
      }));

    const staff = await this.prisma.technicalStaff.findMany({
      where: { tenantId, role: 'preparador_fisico' },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });

    return { tenant, players, staff };
  }

  listAgendaTreinos(tenantId: string, sessionDate: string, category?: string) {
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

  listTrainingSessions(tenantId: string, category?: string) {
    return this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        sessionDomain: TRAINING_SESSION_DOMAIN.PREP,
        ...(category ? { category } : {}),
      },
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      include: coachTrainingSessionInclude,
    });
  }

  getTrainingSession(id: string) {
    return this.prisma.coachTrainingSession.findFirst({
      where: { id, sessionDomain: TRAINING_SESSION_DOMAIN.PREP },
      include: coachTrainingSessionInclude,
    });
  }

  async upsertTrainingSession(input: UpsertPrepSessionInput) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
      throw new BadRequestException('Data do treino inválida');
    }
    const loc = input.location?.trim();
    if (loc && !TRAINING_LOCATION.includes(loc as (typeof TRAINING_LOCATION)[number])) {
      throw new BadRequestException('Local inválido (use field ou gym)');
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
      sessionDomain: TRAINING_SESSION_DOMAIN.PREP,
      location: loc ?? null,
      blockGroupId: input.blockGroupId?.trim() || null,
      blockSequence: input.blockSequence ?? 0,
      agendaEntryId: input.agendaEntryId ?? null,
      planTemplateId: input.planTemplateId ?? null,
    };

    let session;
    if (input.id) {
      const existing = await this.prisma.coachTrainingSession.findFirst({
        where: { id: input.id, sessionDomain: TRAINING_SESSION_DOMAIN.PREP },
      });
      if (!existing) throw new NotFoundException('Treino não encontrado');
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
            objectiveId: a.objectiveId?.trim() || null,
            objectiveText: a.objectiveText?.trim() || null,
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

    if (status === 'finalizado' && session.category) {
      await this.loadSync.syncForTrainingDay(session.tenantId, session.category, session.sessionDate);
      await this.pse.ensureTokensForSession(session.id);
    }

    const full = await this.getTrainingSession(session.id);
    if (!full) throw new NotFoundException('Treino não encontrado');
    return full;
  }

  async deleteTrainingSession(id: string) {
    const row = await this.getTrainingSession(id);
    if (!row) throw new NotFoundException('Treino não encontrado');
    await this.prisma.coachTrainingSession.delete({ where: { id } });
    return { ok: true };
  }

  listPlanTemplates(tenantId: string, category?: string) {
    return this.prisma.coachTrainingPlanTemplate.findMany({
      where: {
        tenantId,
        OR: [{ planDomain: TRAINING_SESSION_DOMAIN.PREP }, { planDomain: null }],
        ...(category
          ? { AND: [{ OR: [{ category }, { category: null }] }] }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deletePlanTemplate(id: string, tenantId: string) {
    const row = await this.prisma.coachTrainingPlanTemplate.findFirst({
      where: { id, tenantId, planDomain: TRAINING_SESSION_DOMAIN.PREP },
    });
    if (!row) throw new NotFoundException('Plano não encontrado');
    await this.prisma.coachTrainingPlanTemplate.delete({ where: { id } });
    return { ok: true };
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
    const data = {
      tenantId: input.tenantId,
      category: input.category ?? null,
      planDomain: TRAINING_SESSION_DOMAIN.PREP,
      title: input.title.trim(),
      fileUrl: input.fileUrl.trim(),
      notes: input.notes?.trim() || null,
      authorUserId: input.authorUserId ?? null,
    };
    if (input.id) {
      return this.prisma.coachTrainingPlanTemplate.update({ where: { id: input.id }, data });
    }
    return this.prisma.coachTrainingPlanTemplate.create({ data });
  }

  listObjectives(tenantId: string) {
    return this.prisma.trainingObjective.findMany({
      where: { tenantId, active: true },
      orderBy: { title: 'asc' },
    });
  }

  createObjective(tenantId: string, title: string, description?: string | null) {
    return this.prisma.trainingObjective.create({
      data: { tenantId, title: title.trim(), description: description?.trim() || null },
    });
  }

  async getKpis(tenantId: string, category: string | undefined, from: string, to: string) {
    const sessions = await this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        sessionDomain: TRAINING_SESSION_DOMAIN.PREP,
        status: 'finalizado',
        sessionDate: { gte: from, lte: to },
        ...(category ? { category } : {}),
      },
      include: { playerEntries: true, activities: true },
    });

    const allDaySessions = await this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        status: 'finalizado',
        sessionDate: { gte: from, lte: to },
        ...(category ? { category } : {}),
      },
      include: { playerEntries: true, activities: true },
    });

    const byDateCat = new Map<string, TrainingSessionForMinutes[]>();
    for (const s of allDaySessions) {
      const key = `${s.sessionDate}:${s.category ?? ''}`;
      const list = byDateCat.get(key) ?? [];
      list.push({
        id: s.id,
        sessionDomain: s.sessionDomain,
        agendaEntryId: s.agendaEntryId,
        blockGroupId: s.blockGroupId,
        blockSequence: s.blockSequence,
        startTime: s.startTime,
        endTime: s.endTime,
        activities: s.activities,
        playerEntries: s.playerEntries,
      });
      byDateCat.set(key, list);
    }

    let consolidatedMinutes = 0;
    let tacticalMinutes = 0;
    let physicalMinutes = 0;
    const playerSeen = new Set<string>();
    for (const [dayKey, daySessions] of byDateCat) {
      const dayDate = dayKey.split(':')[0] ?? '';
      for (const s of daySessions) {
        for (const e of s.playerEntries) {
          if (!e.available) continue;
          const pk = `${dayDate}:${e.playerId}`;
          if (playerSeen.has(pk)) continue;
          playerSeen.add(pk);
          const { total, byDomain } = computeCanonicalTrainingMinutesForPlayer(daySessions, e.playerId);
          consolidatedMinutes += total;
          tacticalMinutes += byDomain[TRAINING_SESSION_DOMAIN.COMISSAO] ?? 0;
          physicalMinutes += byDomain[TRAINING_SESSION_DOMAIN.PREP] ?? 0;
        }
      }
    }

    const ratings = sessions.flatMap((s) =>
      s.playerEntries.filter((e) => e.available && e.rating != null).map((e) => e.rating!),
    );
    const avgRating =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    const loadSessions = await this.prisma.physiologyLoadSession.findMany({
      where: {
        tenantId,
        sessionType: 'treino',
        sessionDate: { gte: from, lte: to },
        ...(category ? { category } : {}),
      },
      include: { entries: true },
    });

    const pseValues = loadSessions.flatMap((ls) => ls.entries.map((e) => e.rpe).filter((r): r is number => r != null));
    const avgPse = pseValues.length ? pseValues.reduce((a, b) => a + b, 0) / pseValues.length : null;

    const submissions = await this.prisma.physiologySessionRpeSubmission.count({
      where: { tenantId, submittedAt: { gte: new Date(from), lte: new Date(`${to}T23:59:59`) } },
    });

    return {
      prepSessionsCount: sessions.length,
      avgAthleteRating: avgRating,
      avgPse,
      pseSubmissions: submissions,
      consolidatedTrainingMinutes: consolidatedMinutes,
      tacticalMinutes,
      physicalMinutes,
      gpsSessions: loadSessions.filter((s) => s.sourceFileName).length,
      nonGpsSessions: loadSessions.filter((s) => !s.sourceFileName).length,
    };
  }

  async getPerformanceOverview(
    tenantId: string,
    category: string | undefined,
    from: string,
    to: string,
    playerId?: string,
  ) {
    const loadSessions = await this.prisma.physiologyLoadSession.findMany({
      where: {
        tenantId,
        sessionDate: { gte: from, lte: to },
        ...(category ? { category } : {}),
        ...(playerId ? { entries: { some: { playerId } } } : {}),
      },
      include: {
        entries: {
          where: playerId ? { playerId } : undefined,
          include: {
            player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    const assessments = await this.prisma.physiologyAssessment.findMany({
      where: {
        tenantId,
        assessedAt: { gte: new Date(from), lte: new Date(`${to}T23:59:59`) },
        ...(category ? { category } : {}),
        ...(playerId ? { playerId } : {}),
      },
      orderBy: { assessedAt: 'desc' },
      take: 50,
    });

    const prepSessions = await this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        sessionDomain: TRAINING_SESSION_DOMAIN.PREP,
        status: 'finalizado',
        sessionDate: { gte: from, lte: to },
        ...(category ? { category } : {}),
      },
      include: { playerEntries: true },
      orderBy: { sessionDate: 'desc' },
      take: 30,
    });

    return { loadSessions, assessments, prepSessions };
  }

  async getExecutivePrepSummary(
    tenantId: string,
    category: string | undefined,
    periodDays: number,
  ) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - periodDays);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    const sessions = await this.prisma.coachTrainingSession.findMany({
      where: {
        tenantId,
        sessionDomain: TRAINING_SESSION_DOMAIN.PREP,
        status: 'finalizado',
        sessionDate: { gte: fromStr, lte: toStr },
        ...(category ? { category } : {}),
      },
      include: { playerEntries: { where: { available: true } } },
    });

    let pendingPse = 0;
    let expectedPse = 0;
    for (const s of sessions) {
      if (!s.physiologyLoadSessionId) continue;
      const subs = await this.prisma.physiologySessionRpeSubmission.findMany({
        where: { physiologyLoadSessionId: s.physiologyLoadSessionId },
        select: { playerId: true },
      });
      const subSet = new Set(subs.map((x) => x.playerId));
      for (const e of s.playerEntries) {
        expectedPse++;
        if (!subSet.has(e.playerId)) pendingPse++;
      }
    }

    const kpis = await this.getKpis(tenantId, category, fromStr, toStr);

    return {
      prepSessionsFinalized: sessions.length,
      pendingPse,
      expectedPse,
      avgPse: kpis.avgPse,
      avgAthleteRating: kpis.avgAthleteRating,
      actionUrl: '/dashboard/futebol/preparacao-fisica/pse',
    };
  }
}
