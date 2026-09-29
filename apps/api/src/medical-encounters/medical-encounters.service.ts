import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddMedicalEvolutionDto,
  CreateMedicalEncounterDto,
  UpdateMedicalEncounterDto,
} from './dto/medical-encounter.dto';
import { MedicalTimelineService } from './medical-timeline.service';
import {
  MEDICAL_ENCOUNTER_STATUSES,
  MEDICAL_RTP_DECISIONS,
  type MedicalEncounterAttachment,
  type MedicalExamRecord,
  type MedicalEvolutionNote,
  type MedicalPrescriptionItem,
} from './medical-encounter.constants';
import { appendMedicalEditLog } from './medical-encounter-audit.util';

const encounterInclude = {
  player: {
    select: {
      id: true,
      name: true,
      category: true,
      photoUrl: true,
      tenantId: true,
      medicalHistory: true,
      birthDate: true,
    },
  },
  tenant: { select: { id: true, name: true, slug: true } },
  originEncounter: {
    select: {
      id: true,
      occurredAt: true,
      diagnosis: true,
      physicianName: true,
    },
  },
  followUps: {
    orderBy: { occurredAt: 'desc' as const },
    take: 15,
    select: {
      id: true,
      occurredAt: true,
      diagnosis: true,
      physicianName: true,
    },
  },
} satisfies Prisma.MedicalEncounterInclude;

type Editor = { sub: string; name?: string | null };

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

  private parseDateOnly(raw?: string | null): Date | null {
    if (!raw?.trim()) return null;
    const d = new Date(`${raw.trim()}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Data inválida.');
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

  private normalizeExamRecords(items?: MedicalExamRecord[]): MedicalExamRecord[] | undefined {
    if (!items?.length) return undefined;
    const out = items
      .map((r) => ({
        type: r.type,
        title: r.title?.trim() ?? '',
        notes: r.notes?.trim() || null,
        fileUrl: r.fileUrl?.trim() || null,
        recordedAt: r.recordedAt?.trim() || null,
      }))
      .filter((r) => r.title.length > 0);
    return out.length ? out : undefined;
  }

  private extractMedicalProfile(medicalHistory: unknown) {
    if (!medicalHistory || typeof medicalHistory !== 'object') return {};
    const root = medicalHistory as { profile?: Record<string, unknown> };
    return root.profile && typeof root.profile === 'object' ? root.profile : {};
  }

  private async enrichWithPhysician(row: {
    physicianStaffId: string | null;
    physicianName: string | null;
  }) {
    if (!row.physicianStaffId) return { physicianCrm: null as string | null };
    const staff = await this.prisma.medicalStaff.findUnique({
      where: { id: row.physicianStaffId },
      select: { crmCoren: true, name: true },
    });
    return {
      physicianCrm: staff?.crmCoren ?? null,
      physicianName: row.physicianName ?? staff?.name ?? null,
    };
  }

  private async enrichReferPhysioSession(referPhysioSessionId: string | null, playerId: string) {
    if (!referPhysioSessionId) return null;
    return this.prisma.physioSession.findFirst({
      where: { id: referPhysioSessionId, playerId },
      select: {
        id: true,
        status: true,
        disposition: true,
        diagnosisLabel: true,
        startedAt: true,
        estimatedEndDate: true,
        region: { select: { namePt: true } },
        transitionProgram: {
          select: { id: true, status: true, startedAt: true, completedAt: true },
        },
      },
    });
  }

  async getReferralOptions(playerId: string, allowed: string[] | null) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { tenantId: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado.');
    this.assertTenant(allowed, player.tenantId);

    const [physioSessions, originEncounters] = await Promise.all([
      this.prisma.physioSession.findMany({
        where: { playerId, tenantId: player.tenantId, status: 'active' },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          diagnosisLabel: true,
          startedAt: true,
          region: { select: { namePt: true } },
        },
        take: 20,
      }),
      this.prisma.medicalEncounter.findMany({
        where: { playerId, tenantId: player.tenantId, status: { not: 'cancelled' } },
        orderBy: { occurredAt: 'desc' },
        select: { id: true, occurredAt: true, diagnosis: true, physicianName: true },
        take: 30,
      }),
    ]);

    return { physioSessions, originEncounters };
  }

  async getClinicalContext(playerId: string, allowed: string[] | null) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { tenantId: true, status: true, statusDetails: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado.');
    this.assertTenant(allowed, player.tenantId);

    const [physioSessions, transitionPrograms] = await Promise.all([
      this.prisma.physioSession.findMany({
        where: { playerId, tenantId: player.tenantId },
        orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
        take: 15,
        select: {
          id: true,
          status: true,
          disposition: true,
          diagnosisLabel: true,
          startedAt: true,
          estimatedEndDate: true,
          region: { select: { namePt: true } },
        },
      }),
      this.prisma.physioTransitionProgram.findMany({
        where: { playerId, tenantId: player.tenantId },
        orderBy: { startedAt: 'desc' },
        take: 8,
        include: {
          originSession: {
            select: {
              diagnosisLabel: true,
              region: { select: { namePt: true } },
            },
          },
          entries: { orderBy: [{ sessionDate: 'desc' }], take: 3 },
        },
      }),
    ]);

    return {
      playerStatus: player.status,
      playerStatusDetails: player.statusDetails,
      physioSessions,
      transitionPrograms,
    };
  }

  async getPrescriptionHistory(playerId: string, allowed: string[] | null) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { tenantId: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado.');
    this.assertTenant(allowed, player.tenantId);

    const rows = await this.prisma.medicalEncounter.findMany({
      where: {
        playerId,
        tenantId: player.tenantId,
        status: { not: 'cancelled' },
      },
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        occurredAt: true,
        physicianName: true,
        physicianStaffId: true,
        diagnosis: true,
        prescriptions: true,
        originEncounterId: true,
      },
      take: 100,
    });

    return rows
      .filter((r) => Array.isArray(r.prescriptions) && r.prescriptions.length > 0)
      .map((r) => ({
        encounterId: r.id,
        occurredAt: r.occurredAt,
        physicianName: r.physicianName,
        diagnosis: r.diagnosis,
        originEncounterId: r.originEncounterId,
        prescriptions: r.prescriptions as MedicalPrescriptionItem[],
      }));
  }

  async getTimeline(playerId: string, allowed: string[] | null) {
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
      limit: 120,
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
    const where: Prisma.MedicalEncounterWhereInput = {
      status: { not: 'cancelled' },
    };
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

    const [physician, referPhysioSession] = await Promise.all([
      this.enrichWithPhysician(row),
      this.enrichReferPhysioSession(row.referPhysioSessionId, row.playerId),
    ]);

    return {
      ...row,
      physicianCrm: physician.physicianCrm,
      physicianName: physician.physicianName ?? row.physicianName,
      referPhysioSession,
    };
  }

  async create(dto: CreateMedicalEncounterDto, allowed: string[] | null, editor?: Editor) {
    this.assertTenant(allowed, dto.tenantId);
    const player = await this.prisma.player.findFirst({
      where: { id: dto.playerId, tenantId: dto.tenantId },
      select: { id: true, category: true },
    });
    if (!player) throw new BadRequestException('Atleta inválido para este clube.');

    await this.validateReferPhysioSession(dto);
    await this.validateOriginEncounter(dto.originEncounterId, dto.playerId, dto.tenantId);

    const status = dto.status?.trim() || 'finalized';
    if (!MEDICAL_ENCOUNTER_STATUSES.includes(status as (typeof MEDICAL_ENCOUNTER_STATUSES)[number])) {
      throw new BadRequestException('Status inválido.');
    }
    this.assertRtpDecision(dto.rtpDecision);

    const editLog = editor
      ? appendMedicalEditLog(null, {
          at: new Date().toISOString(),
          userId: editor.sub,
          userName: editor.name ?? null,
          action: 'created',
        })
      : undefined;

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
        returnForecastAt: this.parseDateOnly(dto.returnForecastAt),
        referPhysio: dto.referPhysio === true,
        referPhysioNotes: dto.referPhysioNotes?.trim() || null,
        referPhysioSessionId: dto.referPhysioSessionId?.trim() || null,
        originEncounterId: dto.originEncounterId?.trim() || null,
        attachments: this.normalizeAttachments(dto.attachments) as Prisma.InputJsonValue,
        examRecords: this.normalizeExamRecords(dto.examRecords) as Prisma.InputJsonValue,
        prescriptions: this.normalizePrescriptions(dto.prescriptions) as Prisma.InputJsonValue,
        rtpDecision: dto.rtpDecision?.trim() || null,
        medicalRtpReleasedAt: this.parseDateOnly(dto.medicalRtpReleasedAt),
        medicalRtpNotes: dto.medicalRtpNotes?.trim() || null,
        editLog: editLog as Prisma.InputJsonValue,
        status,
        createdByUserId: editor?.sub ?? null,
      },
      include: encounterInclude,
    });
  }

  async update(
    id: string,
    dto: UpdateMedicalEncounterDto,
    allowed: string[] | null,
    editor?: Editor,
  ) {
    const existing = await this.prisma.medicalEncounter.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Atendimento não encontrado.');
    this.assertTenant(allowed, existing.tenantId);

    if (dto.tenantId && dto.tenantId !== existing.tenantId) {
      throw new BadRequestException('Não é permitido alterar o clube.');
    }
    if (dto.playerId && dto.playerId !== existing.playerId) {
      throw new BadRequestException('Não é permitido alterar o atleta.');
    }

    await this.validateReferPhysioSession({
      ...dto,
      tenantId: existing.tenantId,
      playerId: existing.playerId,
    });
    if (dto.originEncounterId !== undefined) {
      await this.validateOriginEncounter(
        dto.originEncounterId,
        existing.playerId,
        existing.tenantId,
        id,
      );
    }

    const status = dto.status?.trim() || existing.status;
    if (!MEDICAL_ENCOUNTER_STATUSES.includes(status as (typeof MEDICAL_ENCOUNTER_STATUSES)[number])) {
      throw new BadRequestException('Status inválido.');
    }
    if (dto.rtpDecision !== undefined) this.assertRtpDecision(dto.rtpDecision);

    const nextEditLog =
      editor &&
      appendMedicalEditLog(existing.editLog, {
        at: new Date().toISOString(),
        userId: editor.sub,
        userName: editor.name ?? null,
        action: 'updated',
        comment: dto.editComment?.trim() || null,
      });

    return this.prisma.medicalEncounter.update({
      where: { id },
      data: {
        occurredAt: dto.occurredAt ? this.parseOccurredAt(dto.occurredAt) : undefined,
        physicianStaffId:
          dto.physicianStaffId !== undefined ? dto.physicianStaffId?.trim() || null : undefined,
        physicianName:
          dto.physicianName !== undefined ? dto.physicianName?.trim() || null : undefined,
        chiefComplaint:
          dto.chiefComplaint !== undefined ? dto.chiefComplaint?.trim() || null : undefined,
        anamnesis: dto.anamnesis !== undefined ? dto.anamnesis?.trim() || null : undefined,
        physicalExam:
          dto.physicalExam !== undefined ? dto.physicalExam?.trim() || null : undefined,
        diagnosis: dto.diagnosis !== undefined ? dto.diagnosis?.trim() || null : undefined,
        conduct: dto.conduct !== undefined ? dto.conduct?.trim() || null : undefined,
        examsRequested:
          dto.examsRequested !== undefined ? dto.examsRequested?.trim() || null : undefined,
        observations:
          dto.observations !== undefined ? dto.observations?.trim() || null : undefined,
        restrictTraining: dto.restrictTraining !== undefined ? dto.restrictTraining : undefined,
        restrictMatch: dto.restrictMatch !== undefined ? dto.restrictMatch : undefined,
        returnForecastAt:
          dto.returnForecastAt !== undefined
            ? this.parseDateOnly(dto.returnForecastAt)
            : undefined,
        referPhysio: dto.referPhysio !== undefined ? dto.referPhysio : undefined,
        referPhysioNotes:
          dto.referPhysioNotes !== undefined ? dto.referPhysioNotes?.trim() || null : undefined,
        referPhysioSessionId:
          dto.referPhysioSessionId !== undefined
            ? dto.referPhysioSessionId?.trim() || null
            : undefined,
        originEncounterId:
          dto.originEncounterId !== undefined ? dto.originEncounterId?.trim() || null : undefined,
        attachments:
          dto.attachments !== undefined
            ? (this.normalizeAttachments(dto.attachments) as Prisma.InputJsonValue)
            : undefined,
        examRecords:
          dto.examRecords !== undefined
            ? (this.normalizeExamRecords(dto.examRecords) as Prisma.InputJsonValue)
            : undefined,
        prescriptions:
          dto.prescriptions !== undefined
            ? (this.normalizePrescriptions(dto.prescriptions) as Prisma.InputJsonValue)
            : undefined,
        rtpDecision: dto.rtpDecision !== undefined ? dto.rtpDecision?.trim() || null : undefined,
        medicalRtpReleasedAt:
          dto.medicalRtpReleasedAt !== undefined
            ? this.parseDateOnly(dto.medicalRtpReleasedAt)
            : undefined,
        medicalRtpNotes:
          dto.medicalRtpNotes !== undefined ? dto.medicalRtpNotes?.trim() || null : undefined,
        editLog: nextEditLog ? (nextEditLog as Prisma.InputJsonValue) : undefined,
        status,
      },
      include: encounterInclude,
    });
  }

  async addEvolution(
    id: string,
    dto: AddMedicalEvolutionDto,
    allowed: string[] | null,
    editor?: Editor,
  ) {
    const existing = await this.prisma.medicalEncounter.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Atendimento não encontrado.');
    this.assertTenant(allowed, existing.tenantId);

    const note = dto.note?.trim();
    if (!note) throw new BadRequestException('Informe a evolução.');

    const prev = Array.isArray(existing.evolutionNotes)
      ? (existing.evolutionNotes as MedicalEvolutionNote[])
      : [];
    const entry: MedicalEvolutionNote = {
      at: new Date().toISOString(),
      note,
      userId: editor?.sub ?? null,
      userName: editor?.name ?? null,
    };
    const evolutionNotes = [...prev, entry];

    const editLog = editor
      ? appendMedicalEditLog(existing.editLog, {
          at: entry.at,
          userId: editor.sub,
          userName: editor.name ?? null,
          action: 'evolution',
          comment: note.slice(0, 200),
        })
      : undefined;

    return this.prisma.medicalEncounter.update({
      where: { id },
      data: {
        evolutionNotes: evolutionNotes as unknown as Prisma.InputJsonValue,
        ...(editLog ? { editLog: editLog as Prisma.InputJsonValue } : {}),
      },
      include: encounterInclude,
    });
  }

  private assertRtpDecision(raw?: string | null) {
    if (!raw?.trim()) return;
    if (!MEDICAL_RTP_DECISIONS.includes(raw.trim() as (typeof MEDICAL_RTP_DECISIONS)[number])) {
      throw new BadRequestException('Decisão de RTP inválida.');
    }
  }

  private async validateReferPhysioSession(dto: {
    referPhysioSessionId?: string;
    tenantId: string;
    playerId: string;
  }) {
    if (!dto.referPhysioSessionId?.trim()) return;
    const sess = await this.prisma.physioSession.findFirst({
      where: {
        id: dto.referPhysioSessionId.trim(),
        playerId: dto.playerId,
        tenantId: dto.tenantId,
      },
    });
    if (!sess) {
      throw new BadRequestException('Sessão de fisioterapia de referência inválida.');
    }
  }

  private async validateOriginEncounter(
    originId: string | null | undefined,
    playerId: string,
    tenantId: string,
    selfId?: string,
  ) {
    if (!originId?.trim()) return;
    if (selfId && originId.trim() === selfId) {
      throw new BadRequestException('Atendimento de origem inválido.');
    }
    const origin = await this.prisma.medicalEncounter.findFirst({
      where: { id: originId.trim(), playerId, tenantId },
    });
    if (!origin) throw new BadRequestException('Atendimento de origem não encontrado.');
  }
}
