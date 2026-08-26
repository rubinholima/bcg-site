import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScoutDto } from './dto/create-scout.dto';
import { UpdateScoutDto } from './dto/update-scout.dto';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ScoutLocationPingDto, ScoutTrackingDto } from './dto/scout-location.dto';
import { ApproveProspectDto, PromoteProspectDto } from './dto/approve-prospect.dto';
import {
  SCOUTING_EVALUATION_OUTCOMES,
  type ScoutingEvaluationOutcome,
} from './captacao.constants';
import {
  buildSchedulerNotificationMessage,
  buildWhatsAppNotifyUrl,
  computeReportDimensionRatings,
  mergeDescriptiveObservation,
  resolveStageFromOutcome,
} from './captacao-scouting.util';

const ACTIVE_STAGES = [
  'identificado',
  'em_observacao',
  'prioridade',
  'tryout',
  'negociacao',
];

const prospectListSelect = {
  id: true,
  name: true,
  position: true,
  birthDate: true,
  nationality: true,
  currentClub: true,
  competition: true,
  competitionLevel: true,
  contractSituation: true,
  contractEndDate: true,
  agentName: true,
  agentPhone: true,
  agentEmail: true,
  targetCategory: true,
  priority: true,
  stage: true,
  evaluationOutcome: true,
  overallRating: true,
  technicalRating: true,
  tacticalRating: true,
  physicalRating: true,
  cognitiveRating: true,
  descriptiveObservation: true,
  preferredFoot: true,
  height: true,
  weight: true,
  source: true,
  scoutId: true,
} as const;

@Injectable()
export class CaptacaoService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEvaluationOutcome(value?: string | null): ScoutingEvaluationOutcome {
    if (
      value &&
      SCOUTING_EVALUATION_OUTCOMES.includes(value as ScoutingEvaluationOutcome)
    ) {
      return value as ScoutingEvaluationOutcome;
    }
    return 'pendente';
  }

  private buildSchedulerNotification(input: {
    prospect: {
      name: string;
      position?: string | null;
      currentClub?: string | null;
      targetCategory?: string | null;
      priority?: string | null;
      evaluationOutcome?: string | null;
    };
    scoutName?: string | null;
    overallRating?: number | null;
    technicalRating?: number | null;
    tacticalRating?: number | null;
    physicalRating?: number | null;
    cognitiveRating?: number | null;
    matchName?: string | null;
    recommendation?: string | null;
    prospectId: string;
  }) {
    const message = buildSchedulerNotificationMessage({
      prospectName: input.prospect.name,
      position: input.prospect.position,
      currentClub: input.prospect.currentClub,
      targetCategory: input.prospect.targetCategory,
      priority: input.prospect.priority,
      evaluationOutcome: input.prospect.evaluationOutcome,
      scoutName: input.scoutName,
      overallRating: input.overallRating,
      technicalRating: input.technicalRating,
      tacticalRating: input.tacticalRating,
      physicalRating: input.physicalRating,
      cognitiveRating: input.cognitiveRating,
      matchName: input.matchName,
      recommendation: input.recommendation,
      dashboardUrl: `/dashboard/futebol/captacao/prospects/${input.prospectId}`,
    });
    return {
      phone: '33984133636',
      message,
      whatsappUrl: buildWhatsAppNotifyUrl(message),
    };
  }

  async getStats(tenantId?: string) {
    const where: Prisma.ScoutingProspectWhereInput = tenantId
      ? { tenantId }
      : {};
    const scoutWhere: Prisma.ScoutWhereInput = tenantId
      ? { tenantId, active: true }
      : { active: true };

    const [byStage, byPriority, totalScouts, totalReports, activeProspects] =
      await Promise.all([
        this.prisma.scoutingProspect.groupBy({
          by: ['stage'],
          where,
          _count: true,
        }),
        this.prisma.scoutingProspect.groupBy({
          by: ['priority'],
          where: { ...where, stage: { notIn: ['recusado', 'arquivado', 'aprovado'] } },
          _count: true,
        }),
        this.prisma.scout.count({ where: scoutWhere }),
        this.prisma.scoutingReport.count({
          where: tenantId ? { tenantId } : {},
        }),
        this.prisma.scoutingProspect.count({
          where: {
            ...where,
            stage: { in: ACTIVE_STAGES },
          },
        }),
      ]);

    return {
      activeProspects,
      totalScouts,
      totalReports,
      byStage: Object.fromEntries(byStage.map((r) => [r.stage, r._count])),
      byPriority: Object.fromEntries(
        byPriority.map((r) => [r.priority, r._count]),
      ),
    };
  }

  // ─── Scouts ───────────────────────────────────────────────────────────────

  async findScouts(tenantId?: string, active?: string, search?: string) {
    const where: Prisma.ScoutWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (active === 'true') where.active = true;
    if (active === 'false') where.active = false;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const scouts = await this.prisma.scout.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        technicalStaff: { select: { id: true, name: true, role: true } },
        _count: {
          select: {
            prospects: {
              where: { stage: { in: ACTIVE_STAGES } },
            },
            reports: true,
          },
        },
      },
    });

    return scouts.map((s) => ({
      ...s,
      activeProspectsCount: s._count.prospects,
      reportsCount: s._count.reports,
      locationStatus: this.locationStatus(s),
      _count: undefined,
    }));
  }

  private locationStatus(scout: {
    isTracking: boolean;
    lastLocationAt: Date | null;
  }): 'live' | 'recent' | 'offline' {
    if (!scout.lastLocationAt) return 'offline';
    const ageMs = Date.now() - scout.lastLocationAt.getTime();
    if (scout.isTracking && ageMs < 10 * 60 * 1000) return 'live';
    if (ageMs < 24 * 60 * 60 * 1000) return 'recent';
    return 'offline';
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'json');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('zoom', '14');
      url.searchParams.set('accept-language', 'pt-BR');
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'BCG-Platform-Captacao/1.0 (contact@bostoncitygroup.biz)' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { display_name?: string };
      if (!data.display_name) return null;
      return data.display_name.split(',').slice(0, 3).join(',').trim();
    } catch {
      return null;
    }
  }

  async getMapData(tenantId?: string) {
    const where: Prisma.ScoutWhereInput = { active: true };
    if (tenantId) where.tenantId = tenantId;

    const scouts = await this.prisma.scout.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            prospects: {
              where: { stage: { in: ACTIVE_STAGES } },
            },
          },
        },
      },
    });

    const scoutIds = scouts.map((s) => s.id);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pings = scoutIds.length
      ? await this.prisma.scoutLocationPing.findMany({
          where: {
            scoutId: { in: scoutIds },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        })
      : [];

    const trails: Record<string, Array<{ lat: number; lng: number; at: string; label?: string | null }>> = {};
    for (const ping of pings) {
      if (!trails[ping.scoutId]) trails[ping.scoutId] = [];
      trails[ping.scoutId].push({
        lat: ping.latitude,
        lng: ping.longitude,
        at: ping.createdAt.toISOString(),
        label: ping.label,
      });
    }

    return {
      scouts: scouts.map((s) => ({
        id: s.id,
        name: s.name,
        tenantId: s.tenantId,
        lastLatitude: s.lastLatitude,
        lastLongitude: s.lastLongitude,
        lastLocationLabel: s.lastLocationLabel,
        lastLocationAt: s.lastLocationAt,
        isTracking: s.isTracking,
        trackingStartedAt: s.trackingStartedAt,
        activeProspectsCount: s._count.prospects,
        locationStatus: this.locationStatus(s),
        regions: s.regions,
      })),
      trails,
      updatedAt: new Date().toISOString(),
    };
  }

  async getScoutLocationHistory(scoutId: string, limit = 50) {
    await this.findScout(scoutId);
    return this.prisma.scoutLocationPing.findMany({
      where: { scoutId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async recordPing(scoutId: string, dto: ScoutLocationPingDto) {
    const scout = await this.findScout(scoutId);
    if (dto.latitude == null || dto.longitude == null) {
      throw new BadRequestException('latitude e longitude obrigatórios');
    }

    let label = dto.label?.trim() || null;
    if (!label && dto.reverseGeocode) {
      label = await this.reverseGeocode(dto.latitude, dto.longitude);
    }

    const now = new Date();
    const [ping] = await this.prisma.$transaction([
      this.prisma.scoutLocationPing.create({
        data: {
          tenantId: scout.tenantId,
          scoutId,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy ?? null,
          altitude: dto.altitude ?? null,
          heading: dto.heading ?? null,
          speed: dto.speed ?? null,
          label,
          source: dto.source || 'checkin',
          reportId: dto.reportId || null,
        },
      }),
      this.prisma.scout.update({
        where: { id: scoutId },
        data: {
          lastLatitude: dto.latitude,
          lastLongitude: dto.longitude,
          lastLocationLabel: label,
          lastLocationAt: now,
        },
      }),
    ]);

    return ping;
  }

  async setTracking(scoutId: string, dto: ScoutTrackingDto) {
    await this.findScout(scoutId);
    return this.prisma.scout.update({
      where: { id: scoutId },
      data: {
        isTracking: dto.active,
        trackingStartedAt: dto.active ? new Date() : null,
        ...(!dto.active && {
          isTracking: false,
        }),
      },
    });
  }

  async findScout(id: string) {
    const scout = await this.prisma.scout.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        technicalStaff: true,
        prospects: {
          where: { stage: { in: ACTIVE_STAGES } },
          orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
          take: 50,
        },
        reports: {
          orderBy: { reportDate: 'desc' },
          take: 20,
          include: {
            prospect: { select: { id: true, name: true, position: true } },
          },
        },
      },
    });
    if (!scout) throw new NotFoundException('Captador não encontrado');
    return scout;
  }

  async createScout(dto: CreateScoutDto) {
    if (!dto.tenantId?.trim()) throw new BadRequestException('tenantId obrigatório');
    if (!dto.name?.trim()) throw new BadRequestException('Nome obrigatório');
    return this.prisma.scout.create({
      data: {
        tenantId: dto.tenantId,
        technicalStaffId: dto.technicalStaffId || null,
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        regions: dto.regions ?? undefined,
        categories: dto.categories ?? undefined,
        specialties: dto.specialties ?? undefined,
        licenseInfo: dto.licenseInfo?.trim() || null,
        active: dto.active ?? true,
        notes: dto.notes?.trim() || null,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async updateScout(id: string, dto: UpdateScoutDto) {
    await this.findScout(id);
    return this.prisma.scout.update({
      where: { id },
      data: {
        ...(dto.technicalStaffId !== undefined && {
          technicalStaffId: dto.technicalStaffId || null,
        }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.email !== undefined && { email: dto.email?.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.regions !== undefined && { regions: dto.regions }),
        ...(dto.categories !== undefined && { categories: dto.categories }),
        ...(dto.specialties !== undefined && { specialties: dto.specialties }),
        ...(dto.licenseInfo !== undefined && {
          licenseInfo: dto.licenseInfo?.trim() || null,
        }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      },
    });
  }

  async removeScout(id: string) {
    const active = await this.prisma.scoutingProspect.count({
      where: { scoutId: id, stage: { in: ACTIVE_STAGES } },
    });
    if (active > 0) {
      throw new BadRequestException(
        'Captador com prospects ativos. Reatribua ou arquive antes de excluir.',
      );
    }
    await this.prisma.scout.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Prospects ────────────────────────────────────────────────────────────

  async findProspects(
    tenantId?: string,
    stage?: string,
    priority?: string,
    scoutId?: string,
    search?: string,
  ) {
    const where: Prisma.ScoutingProspectWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (stage) where.stage = stage;
    if (priority) where.priority = priority;
    if (scoutId) where.scoutId = scoutId;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { currentClub: { contains: search.trim(), mode: 'insensitive' } },
        { position: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    return this.prisma.scoutingProspect.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { overallRating: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        scout: { select: { id: true, name: true } },
        player: { select: { id: true, name: true, photoUrl: true } },
        _count: { select: { reports: true } },
      },
    });
  }

  async findProspect(id: string) {
    const prospect = await this.prisma.scoutingProspect.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        scout: true,
        player: true,
        reports: {
          orderBy: { reportDate: 'desc' },
          include: { scout: { select: { id: true, name: true } } },
        },
      },
    });
    if (!prospect) throw new NotFoundException('Prospect não encontrado');
    return prospect;
  }

  async createProspect(dto: CreateProspectDto) {
    if (!dto.tenantId?.trim()) throw new BadRequestException('tenantId obrigatório');
    if (!dto.name?.trim()) throw new BadRequestException('Nome obrigatório');
    const evaluationOutcome = this.normalizeEvaluationOutcome(dto.evaluationOutcome);
    const prospect = await this.prisma.scoutingProspect.create({
      data: {
        tenantId: dto.tenantId,
        playerId: dto.playerId || null,
        scoutId: dto.scoutId || null,
        stage: resolveStageFromOutcome(evaluationOutcome, dto.stage || 'identificado'),
        priority: dto.priority || 'media',
        name: dto.name.trim(),
        birthDate: dto.birthDate || null,
        nationality: dto.nationality || null,
        position: dto.position || null,
        secondaryPositions: dto.secondaryPositions ?? undefined,
        preferredFoot: dto.preferredFoot || null,
        height: dto.height ?? null,
        weight: dto.weight ?? null,
        currentClub: dto.currentClub || null,
        competition: dto.competition || null,
        competitionLevel: dto.competitionLevel || null,
        contractSituation: dto.contractSituation || null,
        contractEndDate: dto.contractEndDate || null,
        agentName: dto.agentName || null,
        agentPhone: dto.agentPhone || null,
        agentEmail: dto.agentEmail || null,
        source: dto.source || null,
        sourceDetails: dto.sourceDetails || null,
        targetCategory: dto.targetCategory || null,
        strengths: dto.strengths || null,
        weaknesses: dto.weaknesses || null,
        risks: dto.risks || null,
        profileLinks: dto.profileLinks ?? undefined,
        notes: dto.notes || null,
        evaluationOutcome,
        descriptiveObservation: dto.descriptiveObservation?.trim() || null,
      },
      include: {
        scout: { select: { id: true, name: true } },
      },
    });

    const schedulerNotification = this.buildSchedulerNotification({
      prospect,
      scoutName: prospect.scout?.name,
      prospectId: prospect.id,
    });

    await this.prisma.scoutingProspect.update({
      where: { id: prospect.id },
      data: { schedulerNotifiedAt: new Date() },
    });

    return { ...prospect, schedulerNotification };
  }

  async updateProspect(id: string, dto: UpdateProspectDto) {
    await this.findProspect(id);
    return this.prisma.scoutingProspect.update({
      where: { id },
      data: {
        ...(dto.playerId !== undefined && { playerId: dto.playerId || null }),
        ...(dto.scoutId !== undefined && { scoutId: dto.scoutId || null }),
        ...(dto.stage !== undefined && { stage: dto.stage }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.birthDate !== undefined && { birthDate: dto.birthDate || null }),
        ...(dto.nationality !== undefined && { nationality: dto.nationality || null }),
        ...(dto.position !== undefined && { position: dto.position || null }),
        ...(dto.secondaryPositions !== undefined && {
          secondaryPositions: dto.secondaryPositions,
        }),
        ...(dto.preferredFoot !== undefined && {
          preferredFoot: dto.preferredFoot || null,
        }),
        ...(dto.height !== undefined && { height: dto.height ?? null }),
        ...(dto.weight !== undefined && { weight: dto.weight ?? null }),
        ...(dto.currentClub !== undefined && {
          currentClub: dto.currentClub || null,
        }),
        ...(dto.competition !== undefined && {
          competition: dto.competition || null,
        }),
        ...(dto.competitionLevel !== undefined && {
          competitionLevel: dto.competitionLevel || null,
        }),
        ...(dto.contractSituation !== undefined && {
          contractSituation: dto.contractSituation || null,
        }),
        ...(dto.contractEndDate !== undefined && {
          contractEndDate: dto.contractEndDate || null,
        }),
        ...(dto.agentName !== undefined && { agentName: dto.agentName || null }),
        ...(dto.agentPhone !== undefined && { agentPhone: dto.agentPhone || null }),
        ...(dto.agentEmail !== undefined && { agentEmail: dto.agentEmail || null }),
        ...(dto.source !== undefined && { source: dto.source || null }),
        ...(dto.sourceDetails !== undefined && {
          sourceDetails: dto.sourceDetails || null,
        }),
        ...(dto.targetCategory !== undefined && {
          targetCategory: dto.targetCategory || null,
        }),
        ...(dto.strengths !== undefined && { strengths: dto.strengths || null }),
        ...(dto.weaknesses !== undefined && { weaknesses: dto.weaknesses || null }),
        ...(dto.risks !== undefined && { risks: dto.risks || null }),
        ...(dto.profileLinks !== undefined && { profileLinks: dto.profileLinks }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
        ...(dto.evaluationOutcome !== undefined && {
          evaluationOutcome: this.normalizeEvaluationOutcome(dto.evaluationOutcome),
        }),
        ...(dto.descriptiveObservation !== undefined && {
          descriptiveObservation: dto.descriptiveObservation?.trim() || null,
        }),
      },
    });
  }

  async removeProspect(id: string) {
    await this.findProspect(id);
    await this.prisma.scoutingProspect.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  async findReports(tenantId?: string, prospectId?: string, scoutId?: string) {
    const where: Prisma.ScoutingReportWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (prospectId) where.prospectId = prospectId;
    if (scoutId) where.scoutId = scoutId;

    return this.prisma.scoutingReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      include: {
        prospect: { select: prospectListSelect },
        scout: { select: { id: true, name: true, phone: true } },
      },
      take: 200,
    });
  }

  async findReport(id: string) {
    const report = await this.prisma.scoutingReport.findUnique({
      where: { id },
      include: {
        prospect: {
          include: {
            scout: { select: { id: true, name: true, phone: true, email: true } },
            player: { select: { id: true, name: true, photoUrl: true } },
          },
        },
        scout: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
    if (!report) throw new NotFoundException('Relatório não encontrado');
    return report;
  }

  async createReport(dto: CreateReportDto) {
    if (!dto.tenantId?.trim()) throw new BadRequestException('tenantId obrigatório');
    if (!dto.prospectId) throw new BadRequestException('prospectId obrigatório');
    if (!dto.scoutId) throw new BadRequestException('scoutId obrigatório');
    if (!dto.recommendation?.trim()) {
      throw new BadRequestException('Recomendação obrigatória');
    }

    const prospect = await this.findProspect(dto.prospectId);
    if (prospect.tenantId !== dto.tenantId) {
      throw new BadRequestException('Prospect não pertence ao tenant');
    }

    let locationLabel = dto.locationLabel?.trim() || null;
    if (
      !locationLabel &&
      dto.reverseGeocode &&
      dto.latitude != null &&
      dto.longitude != null
    ) {
      locationLabel = await this.reverseGeocode(dto.latitude, dto.longitude);
    }

    const mentalPayload =
      dto.cognitive != null
        ? (dto.cognitive as Prisma.InputJsonValue)
        : dto.mental != null
          ? (dto.mental as Prisma.InputJsonValue)
          : undefined;

    const dimensionRatings = computeReportDimensionRatings({
      technical: dto.technical,
      tactical: dto.tactical,
      physical: dto.physical,
      mental: dto.mental,
      cognitive: dto.cognitive,
    });

    const evaluationOutcome = this.normalizeEvaluationOutcome(dto.evaluationOutcome);

    const report = await this.prisma.scoutingReport.create({
      data: {
        tenantId: dto.tenantId,
        prospectId: dto.prospectId,
        scoutId: dto.scoutId,
        reportDate: dto.reportDate ? new Date(dto.reportDate) : new Date(),
        matchName: dto.matchName || null,
        matchDate: dto.matchDate || null,
        competition: dto.competition || null,
        minutesObserved: dto.minutesObserved ?? null,
        positionPlayed: dto.positionPlayed || null,
        observationType: dto.observationType || null,
        opponentStrength: dto.opponentStrength || null,
        technical:
          dto.technical != null
            ? (dto.technical as Prisma.InputJsonValue)
            : undefined,
        tactical:
          dto.tactical != null
            ? (dto.tactical as Prisma.InputJsonValue)
            : undefined,
        physical:
          dto.physical != null
            ? (dto.physical as Prisma.InputJsonValue)
            : undefined,
        mental: mentalPayload,
        ...dimensionRatings,
        overallRating: dto.overallRating ?? null,
        evaluationOutcome,
        recommendation: dto.recommendation,
        strengths: dto.strengths || null,
        weaknesses: dto.weaknesses || null,
        risks: dto.risks || null,
        scoutNotes: dto.scoutNotes || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        locationLabel,
      },
      include: {
        scout: { select: { id: true, name: true } },
        prospect: { select: prospectListSelect },
      },
    });

    if (dto.latitude != null && dto.longitude != null) {
      await this.recordPing(dto.scoutId, {
        latitude: dto.latitude,
        longitude: dto.longitude,
        label: locationLabel || undefined,
        source: 'report',
        reportId: report.id,
        reverseGeocode: false,
      });
    }

    const descriptiveObservation = mergeDescriptiveObservation({
      scoutNotes: dto.scoutNotes,
      strengths: dto.strengths,
      weaknesses: dto.weaknesses,
      risks: dto.risks,
    });

    let nextStage = prospect.stage;
    if (dto.recommendation === 'contratar' && prospect.stage === 'identificado') {
      nextStage = 'prioridade';
    } else if (prospect.stage === 'identificado') {
      nextStage = 'em_observacao';
    }
    nextStage = resolveStageFromOutcome(evaluationOutcome, nextStage);

    await this.prisma.scoutingProspect.update({
      where: { id: dto.prospectId },
      data: {
        observationCount: { increment: 1 },
        lastObservedAt: report.reportDate,
        overallRating: dto.overallRating ?? prospect.overallRating,
        recommendation: dto.recommendation,
        strengths: dto.strengths || prospect.strengths,
        weaknesses: dto.weaknesses || prospect.weaknesses,
        risks: dto.risks || prospect.risks,
        scoutId: dto.scoutId,
        evaluationOutcome,
        technicalRating: dimensionRatings.technicalRating ?? prospect.technicalRating,
        tacticalRating: dimensionRatings.tacticalRating ?? prospect.tacticalRating,
        physicalRating: dimensionRatings.physicalRating ?? prospect.physicalRating,
        cognitiveRating: dimensionRatings.cognitiveRating ?? prospect.cognitiveRating,
        descriptiveObservation: descriptiveObservation ?? prospect.descriptiveObservation,
        stage: nextStage,
        schedulerNotifiedAt: new Date(),
      },
    });

    const schedulerNotification = this.buildSchedulerNotification({
      prospect: {
        name: prospect.name,
        position: prospect.position,
        currentClub: prospect.currentClub,
        targetCategory: prospect.targetCategory,
        priority: prospect.priority,
        evaluationOutcome,
      },
      scoutName: report.scout?.name,
      overallRating: dto.overallRating ?? null,
      ...dimensionRatings,
      matchName: dto.matchName,
      recommendation: dto.recommendation,
      prospectId: dto.prospectId,
    });

    return { ...report, schedulerNotification };
  }

  // ─── Supervisor → cadastro do clube ───────────────────────────────────────

  async approveProspect(
    id: string,
    dto: ApproveProspectDto,
    actorName: string,
  ) {
    const prospect = await this.findProspect(id);
    const allowed = ['tryout', 'negociacao', 'prioridade'];
    if (!allowed.includes(prospect.stage)) {
      throw new BadRequestException(
        'Só é possível aprovar prospects em try-out, negociação ou prioridade.',
      );
    }
    if (prospect.playerId) {
      throw new BadRequestException('Prospect já vinculado a um atleta cadastrado.');
    }

    return this.prisma.scoutingProspect.update({
      where: { id },
      data: {
        stage: 'aprovado',
        supervisorApprovedAt: new Date(),
        supervisorApprovedBy: actorName,
        supervisorNotes: dto.notes?.trim() || null,
        legalStatus: 'pendente',
      },
      include: {
        scout: { select: { id: true, name: true } },
        player: { select: { id: true, name: true } },
      },
    });
  }

  async promoteToPlayer(id: string, dto: PromoteProspectDto) {
    const prospect = await this.findProspect(id);
    if (prospect.stage !== 'aprovado') {
      throw new BadRequestException(
        'O prospect precisa estar aprovado pelo supervisor antes do cadastro no clube.',
      );
    }

    if (prospect.playerId) {
      const player = await this.prisma.player.findUnique({
        where: { id: prospect.playerId },
      });
      if (player) {
        return { prospect, player, created: false };
      }
    }

    let playerId = dto.playerId?.trim();
    if (playerId) {
      const existing = await this.prisma.player.findUnique({
        where: { id: playerId },
      });
      if (!existing || existing.tenantId !== prospect.tenantId) {
        throw new BadRequestException('Jogador não encontrado neste clube.');
      }
    } else {
      const created = await this.prisma.player.create({
        data: {
          tenantId: prospect.tenantId,
          name: prospect.name,
          category: prospect.targetCategory || null,
          birthDate: prospect.birthDate || null,
          nationality: prospect.nationality || null,
          height: prospect.height ?? null,
          weight: prospect.weight ?? null,
          preferredFoot: prospect.preferredFoot || null,
          position: prospect.position || null,
          currentTeam: prospect.currentClub || null,
        },
      });
      playerId = created.id;
    }

    const updated = await this.prisma.scoutingProspect.update({
      where: { id },
      data: {
        playerId,
        stage: 'cadastrado',
        legalStatus: 'em_andamento',
      },
      include: {
        player: { select: { id: true, name: true, photoUrl: true } },
        scout: { select: { id: true, name: true } },
      },
    });

    const player = await this.prisma.player.findUniqueOrThrow({
      where: { id: playerId! },
    });

    return { prospect: updated, player, created: !dto.playerId };
  }
}
