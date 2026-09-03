import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeAgeAtDate,
  computeBmi,
  computeBodyFatPercent,
  computeCompositionStatus,
  computeHydrationStatus,
  computeLeanMassKg,
  type SkinfoldSites,
} from './fisiologia-calculations.util';
import {
  CreatePhysiologyAssessmentDto,
  CreatePhysiologyHydrationDto,
  CreatePhysiologyLoadSessionDto,
  UpdatePhysiologyAssessmentDto,
  UpdatePhysiologyHydrationDto,
  UpdatePhysiologyLoadSessionDto,
} from './dto/fisiologia.dto';
import { normalizePhysiology } from '../cadastros/body-metrics.util';
import { filterCurrentSquadPlayers } from '../common/player-roster.util';

const PLAYER_SELECT = {
  id: true,
  name: true,
  jerseyNumber: true,
  category: true,
  tenantId: true,
  birthDate: true,
  registrationProfile: true,
  weight: true,
  height: true,
  bmi: true,
  bodyFatPercent: true,
  leanMassKg: true,
} as const;

@Injectable()
export class FisiologiaService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenantAccess(tenantId: string, allowed: string[] | null) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new ForbiddenException('Sem acesso a este clube');
    }
  }

  private parseBirthDate(player: {
    birthDate?: string | null;
    registrationProfile?: unknown;
  }): string | null {
    if (player.birthDate?.trim()) return player.birthDate.trim();
    const profile = player.registrationProfile;
    if (profile && typeof profile === 'object' && profile !== null) {
      const personal = (profile as { personal?: { birthDate?: string } }).personal;
      if (personal?.birthDate?.trim()) return personal.birthDate.trim();
    }
    return null;
  }

  private enrichAssessmentCalculations(
    dto: CreatePhysiologyAssessmentDto | UpdatePhysiologyAssessmentDto,
    player: { birthDate?: string | null; registrationProfile?: unknown },
    assessedAt: Date,
  ) {
    const birthDate = this.parseBirthDate(player);
    const age = computeAgeAtDate(birthDate, assessedAt);
    const weight = dto.weight ?? null;
    const height = dto.height ?? null;
    const bmi = dto.bmi ?? computeBmi(weight, height);
    const skinfolds = (dto.skinfolds ?? null) as SkinfoldSites | null;
    const bodyFatPercent =
      dto.bodyFatPercent ??
      computeBodyFatPercent({
        protocol: dto.protocol,
        skinfolds,
        ageYears: age.ageYears,
        manualPercent: dto.bodyFatPercent,
      });
    const leanMassKg = dto.leanMassKg ?? computeLeanMassKg(weight, bodyFatPercent);
    const bodyMassKg = dto.bodyMassKg ?? weight;
    const compositionStatus =
      dto.compositionStatus ?? computeCompositionStatus(bodyFatPercent, age.ageYears);

    return {
      ageYears: age.ageYears,
      ageMonths: age.ageMonths,
      bmi,
      bodyFatPercent,
      leanMassKg,
      bodyMassKg,
      compositionStatus,
    };
  }

  private async syncPlayerMetricsFromAssessment(playerId: string, assessment: {
    weight: number | null;
    height: number | null;
    bmi: number | null;
    bodyFatPercent: number | null;
    leanMassKg: number | null;
    assessedAt: Date;
  }) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return;
    const patch: Prisma.PlayerUpdateInput = {};
    if (assessment.weight != null && assessment.weight > 0) patch.weight = Math.round(assessment.weight);
    if (assessment.height != null && assessment.height > 0) patch.height = Math.round(assessment.height);
    if (assessment.bmi != null) patch.bmi = assessment.bmi;
    if (assessment.bodyFatPercent != null) patch.bodyFatPercent = assessment.bodyFatPercent;
    if (assessment.leanMassKg != null) patch.leanMassKg = assessment.leanMassKg;
    if (Object.keys(patch).length === 0) return;
    await this.prisma.player.update({ where: { id: playerId }, data: patch });
  }

  async importLegacyAssessments(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, tenantId: true, category: true, physiology: true, birthDate: true, registrationProfile: true },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    const existing = await this.prisma.physiologyAssessment.count({ where: { playerId } });
    if (existing > 0) return { imported: 0 };

    const { records } = normalizePhysiology(player.physiology);
    if (records.length === 0) return { imported: 0 };

    let imported = 0;
    for (const r of records) {
      const assessedAt = r.date ? new Date(`${r.date}T12:00:00.000Z`) : new Date();
      const dto: CreatePhysiologyAssessmentDto = {
        playerId,
        category: player.category ?? undefined,
        assessmentType: 'rotina',
        assessedAt: assessedAt.toISOString(),
        evaluatorName: r.evaluator,
        weight: r.weight,
        height: r.height,
        bmi: r.bmi,
        bodyFatPercent: r.fatPercent,
        leanMassKg: r.leanMass,
        vo2max: r.vo2max,
        cmjCm: r.cmjCm,
        illinoisSec: r.illinoisSec,
        tTestSec: r.tTestSec,
        sprint10m: r.sprint10m,
        sprint20m: r.sprint20m,
        yoyoDistance: r.yoyoDistance,
        rastPower: r.rastPower,
        notes: r.notes,
        protocol: 'manual',
      };
      const calc = this.enrichAssessmentCalculations(dto, player, assessedAt);
      await this.prisma.physiologyAssessment.create({
        data: {
          tenantId: player.tenantId,
          playerId,
          category: player.category,
          assessmentType: 'rotina',
          assessedAt,
          evaluatorName: r.evaluator ?? null,
          weight: dto.weight ?? null,
          height: dto.height ?? null,
          bmi: calc.bmi,
          bodyFatPercent: calc.bodyFatPercent,
          leanMassKg: calc.leanMassKg,
          bodyMassKg: calc.bodyMassKg,
          compositionStatus: calc.compositionStatus,
          ageYears: calc.ageYears,
          ageMonths: calc.ageMonths,
          vo2max: r.vo2max ?? null,
          cmjCm: r.cmjCm ?? null,
          illinoisSec: r.illinoisSec ?? null,
          tTestSec: r.tTestSec ?? null,
          sprint10m: r.sprint10m ?? null,
          sprint20m: r.sprint20m ?? null,
          yoyoDistance: r.yoyoDistance ?? null,
          rastPower: r.rastPower ?? null,
          notes: r.notes ?? null,
          protocol: 'manual',
        },
      });
      imported += 1;
    }
    return { imported };
  }

  // ─── Avaliações ───────────────────────────────────────────────────────────

  async listAssessments(input: {
    tenantId?: string;
    playerId?: string;
    category?: string;
    from?: string;
    to?: string;
    allowedTenants: string[] | null;
  }) {
    const where: Prisma.PhysiologyAssessmentWhereInput = {};
    if (input.tenantId) {
      this.assertTenantAccess(input.tenantId, input.allowedTenants);
      where.tenantId = input.tenantId;
    } else if (input.allowedTenants !== null) {
      where.tenantId = { in: input.allowedTenants };
    }
    if (input.playerId) where.playerId = input.playerId;
    if (input.category) where.category = input.category;
    if (input.from || input.to) {
      where.assessedAt = {};
      if (input.from && /^\d{4}-\d{2}-\d{2}$/.test(input.from)) {
        where.assessedAt.gte = new Date(`${input.from}T00:00:00.000Z`);
      }
      if (input.to && /^\d{4}-\d{2}-\d{2}$/.test(input.to)) {
        where.assessedAt.lte = new Date(`${input.to}T23:59:59.999Z`);
      }
    }
    return this.prisma.physiologyAssessment.findMany({
      where,
      orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
      include: { player: { select: PLAYER_SELECT } },
    });
  }

  async findAssessment(id: string, allowedTenants: string[] | null) {
    const row = await this.prisma.physiologyAssessment.findUnique({
      where: { id },
      include: { player: { select: PLAYER_SELECT } },
    });
    if (!row) throw new NotFoundException('Avaliação não encontrada');
    this.assertTenantAccess(row.tenantId, allowedTenants);
    return row;
  }

  async createAssessment(dto: CreatePhysiologyAssessmentDto, allowedTenants: string[] | null) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    this.assertTenantAccess(player.tenantId, allowedTenants);
    const assessedAt = new Date(dto.assessedAt);
    if (Number.isNaN(assessedAt.getTime())) throw new BadRequestException('Data da avaliação inválida');
    const calc = this.enrichAssessmentCalculations(dto, player, assessedAt);
    const row = await this.prisma.physiologyAssessment.create({
      data: {
        tenantId: player.tenantId,
        playerId: player.id,
        category: dto.category ?? player.category,
        assessmentType: dto.assessmentType ?? 'rotina',
        assessedAt,
        evaluatorRole: dto.evaluatorRole ?? null,
        evaluatorName: dto.evaluatorName ?? null,
        evaluatorStaffId: dto.evaluatorStaffId ?? null,
        ageYears: calc.ageYears,
        ageMonths: calc.ageMonths,
        weight: dto.weight ?? null,
        height: dto.height ?? null,
        bmi: calc.bmi,
        skinfolds: dto.skinfolds ? (dto.skinfolds as Prisma.InputJsonValue) : undefined,
        protocol: dto.protocol ?? null,
        bodyFatPercent: calc.bodyFatPercent,
        leanMassKg: calc.leanMassKg,
        bodyMassKg: calc.bodyMassKg,
        compositionStatus: calc.compositionStatus,
        vo2max: dto.vo2max ?? null,
        cmjCm: dto.cmjCm ?? null,
        illinoisSec: dto.illinoisSec ?? null,
        tTestSec: dto.tTestSec ?? null,
        sprint10m: dto.sprint10m ?? null,
        sprint20m: dto.sprint20m ?? null,
        yoyoDistance: dto.yoyoDistance ?? null,
        rastPower: dto.rastPower ?? null,
        mobilityNotes: dto.mobilityNotes ?? null,
        physicalTests: dto.physicalTests ? (dto.physicalTests as Prisma.InputJsonValue) : undefined,
        notes: dto.notes ?? null,
      },
      include: { player: { select: PLAYER_SELECT } },
    });
    await this.syncPlayerMetricsFromAssessment(player.id, row);
    return row;
  }

  async updateAssessment(id: string, dto: UpdatePhysiologyAssessmentDto, allowedTenants: string[] | null) {
    const existing = await this.findAssessment(id, allowedTenants);
    const player = await this.prisma.player.findUnique({ where: { id: existing.playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    const assessedAt = dto.assessedAt ? new Date(dto.assessedAt) : existing.assessedAt;
    const calc = this.enrichAssessmentCalculations({ ...dto, playerId: existing.playerId }, player, assessedAt);
    const row = await this.prisma.physiologyAssessment.update({
      where: { id },
      data: {
        category: dto.category ?? existing.category,
        assessmentType: dto.assessmentType ?? existing.assessmentType,
        assessedAt,
        evaluatorRole: dto.evaluatorRole ?? existing.evaluatorRole,
        evaluatorName: dto.evaluatorName ?? existing.evaluatorName,
        evaluatorStaffId: dto.evaluatorStaffId ?? existing.evaluatorStaffId,
        ageYears: calc.ageYears,
        ageMonths: calc.ageMonths,
        weight: dto.weight ?? existing.weight,
        height: dto.height ?? existing.height,
        bmi: calc.bmi,
        skinfolds: dto.skinfolds ? (dto.skinfolds as Prisma.InputJsonValue) : undefined,
        protocol: dto.protocol ?? existing.protocol,
        bodyFatPercent: calc.bodyFatPercent,
        leanMassKg: calc.leanMassKg,
        bodyMassKg: calc.bodyMassKg,
        compositionStatus: calc.compositionStatus,
        vo2max: dto.vo2max ?? existing.vo2max,
        cmjCm: dto.cmjCm ?? existing.cmjCm,
        illinoisSec: dto.illinoisSec ?? existing.illinoisSec,
        tTestSec: dto.tTestSec ?? existing.tTestSec,
        sprint10m: dto.sprint10m ?? existing.sprint10m,
        sprint20m: dto.sprint20m ?? existing.sprint20m,
        yoyoDistance: dto.yoyoDistance ?? existing.yoyoDistance,
        rastPower: dto.rastPower ?? existing.rastPower,
        mobilityNotes: dto.mobilityNotes ?? existing.mobilityNotes,
        physicalTests: dto.physicalTests ? (dto.physicalTests as Prisma.InputJsonValue) : undefined,
        notes: dto.notes ?? existing.notes,
      },
      include: { player: { select: PLAYER_SELECT } },
    });
    await this.syncPlayerMetricsFromAssessment(player.id, row);
    return row;
  }

  async deleteAssessment(id: string, allowedTenants: string[] | null) {
    await this.findAssessment(id, allowedTenants);
    await this.prisma.physiologyAssessment.delete({ where: { id } });
    return { ok: true };
  }

  async listAssessmentsByPlayer(playerId: string, allowedTenants: string[] | null) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId }, select: { tenantId: true } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    this.assertTenantAccess(player.tenantId, allowedTenants);
    await this.importLegacyAssessments(playerId);
    return this.listAssessments({ playerId, allowedTenants: null });
  }

  // ─── Hidratação ───────────────────────────────────────────────────────────

  async listHydrations(input: {
    tenantId?: string;
    playerId?: string;
    from?: string;
    to?: string;
    allowedTenants: string[] | null;
  }) {
    const where: Prisma.PhysiologyHydrationWhereInput = {};
    if (input.tenantId) {
      this.assertTenantAccess(input.tenantId, input.allowedTenants);
      where.tenantId = input.tenantId;
    } else if (input.allowedTenants !== null) {
      where.tenantId = { in: input.allowedTenants };
    }
    if (input.playerId) where.playerId = input.playerId;
    if (input.from || input.to) {
      where.recordedAt = {};
      if (input.from) where.recordedAt.gte = new Date(`${input.from}T00:00:00.000Z`);
      if (input.to) where.recordedAt.lte = new Date(`${input.to}T23:59:59.999Z`);
    }
    return this.prisma.physiologyHydration.findMany({
      where,
      orderBy: [{ recordedAt: 'desc' }],
      include: { player: { select: PLAYER_SELECT } },
    });
  }

  async createHydration(dto: CreatePhysiologyHydrationDto, allowedTenants: string[] | null) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    this.assertTenantAccess(player.tenantId, allowedTenants);
    const recordedAt = new Date(dto.recordedAt);
    const status = dto.status ?? computeHydrationStatus(dto.weightBefore, dto.weightAfter);
    return this.prisma.physiologyHydration.create({
      data: {
        tenantId: player.tenantId,
        playerId: player.id,
        recordedAt,
        contextType: dto.contextType,
        weightBefore: dto.weightBefore ?? null,
        weightAfter: dto.weightAfter ?? null,
        status,
        notes: dto.notes ?? null,
      },
      include: { player: { select: PLAYER_SELECT } },
    });
  }

  async updateHydration(id: string, dto: UpdatePhysiologyHydrationDto, allowedTenants: string[] | null) {
    const existing = await this.prisma.physiologyHydration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Registro de hidratação não encontrado');
    this.assertTenantAccess(existing.tenantId, allowedTenants);
    const weightBefore = dto.weightBefore ?? existing.weightBefore;
    const weightAfter = dto.weightAfter ?? existing.weightAfter;
    const status = dto.status ?? computeHydrationStatus(weightBefore, weightAfter);
    return this.prisma.physiologyHydration.update({
      where: { id },
      data: {
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : existing.recordedAt,
        contextType: dto.contextType ?? existing.contextType,
        weightBefore,
        weightAfter,
        status,
        notes: dto.notes ?? existing.notes,
      },
      include: { player: { select: PLAYER_SELECT } },
    });
  }

  async deleteHydration(id: string, allowedTenants: string[] | null) {
    const existing = await this.prisma.physiologyHydration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Registro não encontrado');
    this.assertTenantAccess(existing.tenantId, allowedTenants);
    await this.prisma.physiologyHydration.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Carga / GPS ──────────────────────────────────────────────────────────

  async categoryRoster(tenantId: string, category: string, allowedTenants: string[] | null) {
    this.assertTenantAccess(tenantId, allowedTenants);
    const players = await this.prisma.player.findMany({
      where: { tenantId, category },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
      select: PLAYER_SELECT,
    });
    return filterCurrentSquadPlayers(players);
  }

  async listLoadSessions(input: {
    tenantId?: string;
    category?: string;
    sessionType?: string;
    from?: string;
    to?: string;
    allowedTenants: string[] | null;
  }) {
    const where: Prisma.PhysiologyLoadSessionWhereInput = {};
    if (input.tenantId) {
      this.assertTenantAccess(input.tenantId, input.allowedTenants);
      where.tenantId = input.tenantId;
    } else if (input.allowedTenants !== null) {
      where.tenantId = { in: input.allowedTenants };
    }
    if (input.category) where.category = input.category;
    if (input.sessionType) where.sessionType = input.sessionType;
    if (input.from || input.to) {
      where.sessionDate = {};
      if (input.from) where.sessionDate.gte = input.from;
      if (input.to) where.sessionDate.lte = input.to;
    }
    return this.prisma.physiologyLoadSession.findMany({
      where,
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        entries: {
          include: { player: { select: PLAYER_SELECT } },
          orderBy: [{ player: { jerseyNumber: 'asc' } }],
        },
      },
    });
  }

  async findLoadSession(id: string, allowedTenants: string[] | null) {
    const row = await this.prisma.physiologyLoadSession.findUnique({
      where: { id },
      include: {
        entries: {
          include: { player: { select: PLAYER_SELECT } },
        },
      },
    });
    if (!row) throw new NotFoundException('Sessão não encontrada');
    this.assertTenantAccess(row.tenantId, allowedTenants);
    return row;
  }

  async createLoadSession(dto: CreatePhysiologyLoadSessionDto, allowedTenants: string[] | null) {
    this.assertTenantAccess(dto.tenantId, allowedTenants);
    if (!dto.entries?.length) throw new BadRequestException('Informe ao menos um atleta na sessão');
    return this.prisma.physiologyLoadSession.create({
      data: {
        tenantId: dto.tenantId,
        category: dto.category,
        sessionDate: dto.sessionDate,
        sessionType: dto.sessionType,
        period: dto.period ?? null,
        trainingType: dto.trainingType ?? null,
        sessionLabel: dto.sessionLabel ?? null,
        sourceFileName: dto.sourceFileName ?? null,
        fixtureKey: dto.fixtureKey ?? null,
        staffId: dto.staffId ?? null,
        staffName: dto.staffName ?? null,
        notes: dto.notes ?? null,
        entries: {
          create: dto.entries.map((e) => ({
            playerId: e.playerId,
            present: e.present ?? true,
            rpe: e.rpe ?? null,
            actualLoad: e.actualLoad ?? null,
            trainingMinutes: e.trainingMinutes ?? null,
            gameMinutes: e.gameMinutes ?? null,
            maxDistanceM: e.maxDistanceM ?? null,
            maxSpeedKmh: e.maxSpeedKmh ?? null,
            sprintCount: e.sprintCount ?? null,
            highIntensityDistanceM: e.highIntensityDistanceM ?? null,
            lowIntensityDistanceM: e.lowIntensityDistanceM ?? null,
            sprintDistanceM: e.sprintDistanceM ?? null,
            gpsImportLabel: e.gpsImportLabel ?? null,
            gpsData: e.gpsData ? (e.gpsData as Prisma.InputJsonValue) : undefined,
            notes: e.notes ?? null,
          })),
        },
      },
      include: {
        entries: { include: { player: { select: PLAYER_SELECT } } },
      },
    });
  }

  async updateLoadSession(id: string, dto: UpdatePhysiologyLoadSessionDto, allowedTenants: string[] | null) {
    await this.findLoadSession(id, allowedTenants);
    if (dto.entries) {
      await this.prisma.physiologyLoadEntry.deleteMany({ where: { sessionId: id } });
    }
    return this.prisma.physiologyLoadSession.update({
      where: { id },
      data: {
        category: dto.category,
        sessionDate: dto.sessionDate,
        sessionType: dto.sessionType,
        period: dto.period,
        trainingType: dto.trainingType,
        sessionLabel: dto.sessionLabel,
        sourceFileName: dto.sourceFileName,
        fixtureKey: dto.fixtureKey,
        staffId: dto.staffId,
        staffName: dto.staffName,
        notes: dto.notes,
        ...(dto.entries
          ? {
              entries: {
                create: dto.entries.map((e) => ({
                  playerId: e.playerId,
                  present: e.present ?? true,
                  rpe: e.rpe ?? null,
                  actualLoad: e.actualLoad ?? null,
                  trainingMinutes: e.trainingMinutes ?? null,
                  gameMinutes: e.gameMinutes ?? null,
                  maxDistanceM: e.maxDistanceM ?? null,
                  maxSpeedKmh: e.maxSpeedKmh ?? null,
                  sprintCount: e.sprintCount ?? null,
                  highIntensityDistanceM: e.highIntensityDistanceM ?? null,
                  lowIntensityDistanceM: e.lowIntensityDistanceM ?? null,
                  sprintDistanceM: e.sprintDistanceM ?? null,
                  gpsImportLabel: e.gpsImportLabel ?? null,
                  gpsData: e.gpsData ? (e.gpsData as Prisma.InputJsonValue) : undefined,
                  notes: e.notes ?? null,
                })),
              },
            }
          : {}),
      },
      include: {
        entries: { include: { player: { select: PLAYER_SELECT } } },
      },
    });
  }

  async deleteLoadSession(id: string, allowedTenants: string[] | null) {
    await this.findLoadSession(id, allowedTenants);
    await this.prisma.physiologyLoadSession.delete({ where: { id } });
    return { ok: true };
  }

  async getPlayerContext(playerId: string, allowedTenants: string[] | null) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: {
        ...PLAYER_SELECT,
        physiologyAssessments: { orderBy: { assessedAt: 'desc' }, take: 10 },
        physiologyHydrations: { orderBy: { recordedAt: 'desc' }, take: 10 },
        physiologyLoadEntries: {
          orderBy: { session: { sessionDate: 'desc' } },
          take: 15,
          include: { session: true },
        },
        physioSessions: {
          where: { status: 'active' },
          take: 5,
          select: { id: true, regionId: true, disposition: true, startedAt: true },
        },
      },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    this.assertTenantAccess(player.tenantId, allowedTenants);
    await this.importLegacyAssessments(playerId);
    const assessments = await this.prisma.physiologyAssessment.findMany({
      where: { playerId },
      orderBy: { assessedAt: 'desc' },
      take: 10,
    });
    return { ...player, physiologyAssessments: assessments };
  }
}
