import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMedicalEncounterDto,
  UpdateMedicalEncounterDto,
} from './dto/medical-encounter.dto';
import { MedicalTimelineService } from './medical-timeline.service';
import {
  MEDICAL_ENCOUNTER_STATUSES,
  type MedicalEncounterAttachment,
  type MedicalPrescriptionItem,
} from './medical-encounter.constants';

const encounterInclude = {
  player: {
    select: {
      id: true,
      name: true,
      category: true,
      photoUrl: true,
      tenantId: true,
      medicalHistory: true,
    },
  },
  tenant: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.MedicalEncounterInclude;

@Injectable()
export class MedicalEncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: MedicalTimelineService,
  ) {}

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Sem acesso a este clube.');
    }
  }

  private parseOccurredAt(raw: string): Date {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Data/hora do atendimento inválida.');
    }
    return d;
  }

  private parseReturnForecast(raw?: string | null): Date | null {
    if (!raw?.trim()) return null;
    const d = new Date(`${raw.trim()}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Previsão de retorno inválida.');
    }
    return d;
  }

  private normalizePrescriptions(
    items?: MedicalPrescriptionItem[],
  ): MedicalPrescriptionItem[] | undefined {
    if (!items?.length) return undefined;
    const out = items
      .map((p) => ({
        medication: p.medication?.trim() ?? '',
        presentation: p.presentation?.trim() || null,
        dose: p.dose?.trim() || null,
        route: p.route?.trim() || null,
        frequency: p.frequency?.trim() || null,
        duration: p.duration?.trim() || null,
        instructions: p.instructions?.trim() || null,
      }))
      .filter((p) => p.medication.length > 0);
    return out.length ? out : undefined;
  }

  private normalizeAttachments(
    items?: MedicalEncounterAttachment[],
  ): MedicalEncounterAttachment[] | undefined {
    if (!items?.length) return undefined;
    const out = items
      .map((a) => ({
        label: a.label?.trim() || undefined,
        fileUrl: a.fileUrl?.trim() ?? '',
        kind: a.kind?.trim() || undefined,
      }))
      .filter((a) => a.fileUrl.length > 0);
    return out.length ? out : undefined;
  }

  private extractMedicalProfile(medicalHistory: unknown) {
    if (!medicalHistory || typeof medicalHistory !== 'object') return {};
    const root = medicalHistory as { profile?: Record<string, unknown> };
    return root.profile && typeof root.profile === 'object' ? root.profile : {};
  }

  async getReferralOptions(playerId: string, allowed: string[] | null) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { tenantId: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado.');
    this.assertTenant(allowed, player.tenantId);

    const physioSessions = await this.prisma.physioSession.findMany({
      where: { playerId, tenantId: player.tenantId, status: 'active' },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        diagnosisLabel: true,
        startedAt: true,
        region: { select: { namePt: true } },
      },
      take: 20,
    });

    return { physioSessions };
  }

  async getTimeline(
    playerId: string,
    allowed: string[] | null,
  ) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        tenantId: true,
        category: true,
        photoUrl: true,
        medicalHistory: true,
        status: true,
        statusDetails: true,
        statusUntil: true,
      },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado.');
    this.assertTenant(allowed, player.tenantId);

    const items = await this.timeline.buildForPlayer({
      playerId: player.id,
      tenantId: player.tenantId,
    });

    return {
      player: {
        id: player.id,
        name: player.name,
        category: player.category,
        photoUrl: player.photoUrl,
        tenantId: player.tenantId,
        status: player.status,
        statusDetails: player.statusDetails,
        statusUntil: player.statusUntil,
      },
      medicalProfile: this.extractMedicalProfile(player.medicalHistory),
      timeline: items,
    };
  }

  async listEncounters(
    filters: { tenantId?: string; playerId?: string },
    allowed: string[] | null,
  ) {
    const where: Prisma.MedicalEncounterWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      where.tenantId = filters.tenantId;
    } else if (allowed !== null) {
      where.tenantId = { in: allowed };
    }
    if (filters.playerId) where.playerId = filters.playerId;
    return this.prisma.medicalEncounter.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      include: encounterInclude,
      take: 200,
    });
  }

  async findOne(id: string, allowed: string[] | null) {
    const row = await this.prisma.medicalEncounter.findUnique({
      where: { id },
      include: encounterInclude,
    });
    if (!row) throw new NotFoundException('Atendimento não encontrado.');
    this.assertTenant(allowed, row.tenantId);
    return row;
  }

  async create(dto: CreateMedicalEncounterDto, allowed: string[] | null, userId?: string) {
    this.assertTenant(allowed, dto.tenantId);
    const player = await this.prisma.player.findFirst({
      where: { id: dto.playerId, tenantId: dto.tenantId },
      select: { id: true, category: true },
    });
    if (!player) throw new BadRequestException('Atleta inválido para este clube.');

    if (dto.referPhysioSessionId) {
      const sess = await this.prisma.physioSession.findFirst({
        where: {
          id: dto.referPhysioSessionId,
          playerId: dto.playerId,
          tenantId: dto.tenantId,
        },
      });
      if (!sess) {
        throw new BadRequestException('Sessão de fisioterapia de referência inválida.');
      }
    }

    const status = dto.status?.trim() || 'finalized';
    if (!MEDICAL_ENCOUNTER_STATUSES.includes(status as (typeof MEDICAL_ENCOUNTER_STATUSES)[number])) {
      throw new BadRequestException('Status inválido.');
    }

    return this.prisma.medicalEncounter.create({
      data: {
        tenantId: dto.tenantId,
        playerId: dto.playerId,
        category: dto.category?.trim() || player.category,
        occurredAt: this.parseOccurredAt(dto.occurredAt),
        physicianStaffId: dto.physicianStaffId?.trim() || null,
        physicianName: dto.physicianName?.trim() || null,
        chiefComplaint: dto.chiefComplaint?.trim() || null,
        anamnesis: dto.anamnesis?.trim() || null,
        physicalExam: dto.physicalExam?.trim() || null,
        diagnosis: dto.diagnosis?.trim() || null,
        conduct: dto.conduct?.trim() || null,
        examsRequested: dto.examsRequested?.trim() || null,
        observations: dto.observations?.trim() || null,
        restrictTraining: dto.restrictTraining === true,
        restrictMatch: dto.restrictMatch === true,
        returnForecastAt: this.parseReturnForecast(dto.returnForecastAt),
        referPhysio: dto.referPhysio === true,
        referPhysioNotes: dto.referPhysioNotes?.trim() || null,
        referPhysioSessionId: dto.referPhysioSessionId?.trim() || null,
        attachments: this.normalizeAttachments(dto.attachments) as Prisma.InputJsonValue,
        prescriptions: this.normalizePrescriptions(dto.prescriptions) as Prisma.InputJsonValue,
        status,
        createdByUserId: userId ?? null,
      },
      include: encounterInclude,
    });
  }

  async update(
    id: string,
    dto: UpdateMedicalEncounterDto,
    allowed: string[] | null,
  ) {
    const existing = await this.findOne(id, allowed);
    if (dto.tenantId && dto.tenantId !== existing.tenantId) {
      throw new BadRequestException('Não é permitido alterar o clube.');
    }
    if (dto.playerId && dto.playerId !== existing.playerId) {
      throw new BadRequestException('Não é permitido alterar o atleta.');
    }

    const status = dto.status?.trim() || existing.status;
    if (!MEDICAL_ENCOUNTER_STATUSES.includes(status as (typeof MEDICAL_ENCOUNTER_STATUSES)[number])) {
      throw new BadRequestException('Status inválido.');
    }

    return this.prisma.medicalEncounter.update({
      where: { id },
      data: {
        occurredAt: dto.occurredAt ? this.parseOccurredAt(dto.occurredAt) : undefined,
        physicianStaffId: dto.physicianStaffId !== undefined ? dto.physicianStaffId?.trim() || null : undefined,
        physicianName: dto.physicianName !== undefined ? dto.physicianName?.trim() || null : undefined,
        chiefComplaint: dto.chiefComplaint !== undefined ? dto.chiefComplaint?.trim() || null : undefined,
        anamnesis: dto.anamnesis !== undefined ? dto.anamnesis?.trim() || null : undefined,
        physicalExam: dto.physicalExam !== undefined ? dto.physicalExam?.trim() || null : undefined,
        diagnosis: dto.diagnosis !== undefined ? dto.diagnosis?.trim() || null : undefined,
        conduct: dto.conduct !== undefined ? dto.conduct?.trim() || null : undefined,
        examsRequested: dto.examsRequested !== undefined ? dto.examsRequested?.trim() || null : undefined,
        observations: dto.observations !== undefined ? dto.observations?.trim() || null : undefined,
        restrictTraining: dto.restrictTraining !== undefined ? dto.restrictTraining : undefined,
        restrictMatch: dto.restrictMatch !== undefined ? dto.restrictMatch : undefined,
        returnForecastAt:
          dto.returnForecastAt !== undefined
            ? this.parseReturnForecast(dto.returnForecastAt)
            : undefined,
        referPhysio: dto.referPhysio !== undefined ? dto.referPhysio : undefined,
        referPhysioNotes:
          dto.referPhysioNotes !== undefined ? dto.referPhysioNotes?.trim() || null : undefined,
        referPhysioSessionId:
          dto.referPhysioSessionId !== undefined
            ? dto.referPhysioSessionId?.trim() || null
            : undefined,
        attachments:
          dto.attachments !== undefined
            ? (this.normalizeAttachments(dto.attachments) as Prisma.InputJsonValue)
            : undefined,
        prescriptions:
          dto.prescriptions !== undefined
            ? (this.normalizePrescriptions(dto.prescriptions) as Prisma.InputJsonValue)
            : undefined,
        status,
      },
      include: encounterInclude,
    });
  }
}
