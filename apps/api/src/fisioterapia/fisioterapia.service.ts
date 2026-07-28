import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PHYSIO_DEFAULT_TREATMENTS,
  PHYSIO_DIAGNOSES_BY_REGION,
  PHYSIO_REGIONS,
} from './physio-catalog.data';
import {
  AddPhysioEvolutionDto,
  CreatePhysioDiagnosisDto,
  CreatePhysioSessionDto,
  CreatePhysioTreatmentDto,
  UpdatePhysioSessionDto,
} from './dto/fisioterapia.dto';

type EvolutionNote = {
  at: string;
  note: string;
  painScore?: number | null;
  userId?: string | null;
  userName?: string | null;
};

@Injectable()
export class FisioterapiaService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureCatalog();
    } catch (e) {
      console.warn('[fisioterapia] ensureCatalog falhou (migration pendente?)', e);
    }
  }

  async ensureCatalog() {
    for (const region of PHYSIO_REGIONS) {
      await this.prisma.physioBodyRegion.upsert({
        where: { id: region.id },
        create: region,
        update: {
          namePt: region.namePt,
          sortOrder: region.sortOrder,
          bilateral: region.bilateral,
        },
      });
    }

    for (const [regionId, names] of Object.entries(PHYSIO_DIAGNOSES_BY_REGION)) {
      for (const name of names) {
        const existing = await this.prisma.physioDiagnosis.findUnique({
          where: { regionId_name: { regionId, name } },
        });
        if (!existing) {
          await this.prisma.physioDiagnosis.create({
            data: { regionId, name, isSystem: true, active: true },
          });
        }
      }
    }

    const treatmentCount = await this.prisma.physioTreatment.count();
    if (treatmentCount === 0) {
      for (const t of PHYSIO_DEFAULT_TREATMENTS) {
        await this.prisma.physioTreatment.create({
          data: {
            name: t.name,
            regionId: t.regionId ?? null,
            equipment: t.equipment ?? null,
            isSystem: true,
            active: true,
          },
        });
      }
    }
  }

  listRegions() {
    return this.prisma.physioBodyRegion.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        diagnoses: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  listDiagnoses(regionId?: string) {
    return this.prisma.physioDiagnosis.findMany({
      where: {
        active: true,
        ...(regionId ? { regionId } : {}),
      },
      orderBy: [{ regionId: 'asc' }, { name: 'asc' }],
    });
  }

  async createDiagnosis(dto: CreatePhysioDiagnosisDto, userId?: string) {
    const region = await this.prisma.physioBodyRegion.findUnique({
      where: { id: dto.regionId },
    });
    if (!region) throw new BadRequestException('Região inválida.');
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome do diagnóstico é obrigatório.');
    try {
      return await this.prisma.physioDiagnosis.create({
        data: {
          regionId: dto.regionId,
          name,
          isSystem: false,
          active: true,
          createdByUserId: userId ?? null,
        },
      });
    } catch {
      throw new BadRequestException('Diagnóstico já existe nesta região.');
    }
  }

  listTreatments(regionId?: string) {
    return this.prisma.physioTreatment.findMany({
      where: {
        active: true,
        ...(regionId
          ? { OR: [{ regionId: null }, { regionId }] }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTreatment(dto: CreatePhysioTreatmentDto, userId?: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome do tratamento é obrigatório.');
    if (dto.regionId) {
      const region = await this.prisma.physioBodyRegion.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) throw new BadRequestException('Região inválida.');
    }
    return this.prisma.physioTreatment.create({
      data: {
        name,
        regionId: dto.regionId?.trim() || null,
        equipment: dto.equipment?.trim() || null,
        isSystem: false,
        active: true,
        createdByUserId: userId ?? null,
      },
    });
  }

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed && !allowed.includes(tenantId)) {
      throw new BadRequestException('Sem acesso a este clube.');
    }
  }

  async listSessions(
    filters: {
      tenantId?: string;
      playerId?: string;
      status?: string;
      from?: string;
      to?: string;
    },
    allowed: string[] | null,
  ) {
    const where: Prisma.PhysioSessionWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      where.tenantId = filters.tenantId;
    } else if (allowed) {
      where.tenantId = { in: allowed };
    }
    if (filters.playerId) where.playerId = filters.playerId;
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.from || filters.to) {
      where.startedAt = {};
      if (filters.from) where.startedAt.gte = new Date(`${filters.from}T00:00:00`);
      if (filters.to) where.startedAt.lte = new Date(`${filters.to}T23:59:59`);
    }
    return this.prisma.physioSession.findMany({
      where,
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
      include: {
        region: true,
        diagnosis: true,
        treatment: true,
        player: {
          select: {
            id: true,
            name: true,
            category: true,
            photoUrl: true,
            status: true,
            tenantId: true,
          },
        },
        tenant: { select: { id: true, name: true, slug: true } },
      },
      take: 500,
    });
  }

  async findSession(id: string, allowed: string[] | null) {
    const row = await this.prisma.physioSession.findUnique({
      where: { id },
      include: {
        region: true,
        diagnosis: true,
        treatment: true,
        player: {
          select: {
            id: true,
            name: true,
            category: true,
            photoUrl: true,
            status: true,
            statusDetails: true,
            tenantId: true,
          },
        },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!row) throw new NotFoundException('Atendimento não encontrado.');
    this.assertTenant(allowed, row.tenantId);
    return row;
  }

  private async resolveLabels(dto: {
    diagnosisId?: string;
    diagnosisLabel?: string;
    treatmentId?: string;
    treatmentLabel?: string;
  }) {
    let diagnosisLabel = dto.diagnosisLabel?.trim() || null;
    let treatmentLabel = dto.treatmentLabel?.trim() || null;
    if (dto.diagnosisId) {
      const d = await this.prisma.physioDiagnosis.findUnique({
        where: { id: dto.diagnosisId },
      });
      if (!d) throw new BadRequestException('Diagnóstico inválido.');
      diagnosisLabel = d.name;
    }
    if (dto.treatmentId) {
      const t = await this.prisma.physioTreatment.findUnique({
        where: { id: dto.treatmentId },
      });
      if (!t) throw new BadRequestException('Tratamento inválido.');
      treatmentLabel = t.name;
    }
    return { diagnosisLabel, treatmentLabel };
  }

  private buildStatusDetails(session: {
    region?: { namePt: string } | null;
    regionId: string;
    side?: string | null;
    diagnosisLabel?: string | null;
    treatmentLabel?: string | null;
    estimatedEndDate?: Date | null;
  }) {
    const regionName = session.region?.namePt ?? session.regionId;
    const side =
      session.side === 'E' ? ' esquerdo' : session.side === 'D' ? ' direito' : '';
    const parts = [
      `Fisio: ${regionName}${side}`,
      session.diagnosisLabel ? `Dx: ${session.diagnosisLabel}` : null,
      session.treatmentLabel ? `Tx: ${session.treatmentLabel}` : null,
      session.estimatedEndDate
        ? `Previsão: ${session.estimatedEndDate.toISOString().slice(0, 10)}`
        : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }

  private async syncPlayerInjuryStatus(playerId: string) {
    const active = await this.prisma.physioSession.findMany({
      where: { playerId, status: 'active' },
      include: { region: true },
      orderBy: { startedAt: 'desc' },
    });
    if (active.length === 0) {
      const player = await this.prisma.player.findUnique({
        where: { id: playerId },
        select: { status: true, statusDetails: true },
      });
      if (player?.status === 'injured' && player.statusDetails?.startsWith('Fisio:')) {
        await this.prisma.player.update({
          where: { id: playerId },
          data: {
            status: 'available',
            statusDetails: null,
            statusUntil: null,
          },
        });
      }
      return;
    }
    const details = active.map((s) => this.buildStatusDetails(s)).join(' | ');
    const latestEnd = active
      .map((s) => s.estimatedEndDate)
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        status: 'injured',
        statusDetails: details,
        statusUntil: latestEnd ?? null,
      },
    });
  }

  async createSession(
    dto: CreatePhysioSessionDto,
    allowed: string[] | null,
    userId?: string,
  ) {
    this.assertTenant(allowed, dto.tenantId);
    const player = await this.prisma.player.findUnique({
      where: { id: dto.playerId },
    });
    if (!player || player.tenantId !== dto.tenantId) {
      throw new BadRequestException('Atleta inválido para este clube.');
    }
    const region = await this.prisma.physioBodyRegion.findUnique({
      where: { id: dto.regionId },
    });
    if (!region) throw new BadRequestException('Região inválida.');

    const { diagnosisLabel, treatmentLabel } = await this.resolveLabels(dto);
    let estimatedEndDate: Date | null = null;
    if (dto.estimatedEndDate) {
      estimatedEndDate = new Date(`${dto.estimatedEndDate}T12:00:00`);
    } else if (dto.estimatedDays && dto.estimatedDays > 0) {
      estimatedEndDate = new Date();
      estimatedEndDate.setDate(estimatedEndDate.getDate() + dto.estimatedDays);
    }

    const created = await this.prisma.physioSession.create({
      data: {
        tenantId: dto.tenantId,
        playerId: dto.playerId,
        category: dto.category?.trim() || player.category || null,
        regionId: dto.regionId,
        side: dto.side ?? null,
        bodyMapView: dto.bodyMapView ?? null,
        bodyMapX: dto.bodyMapX ?? null,
        bodyMapY: dto.bodyMapY ?? null,
        symptoms: dto.symptoms?.trim() || null,
        painScore: dto.painScore ?? null,
        diagnosisId: dto.diagnosisId || null,
        diagnosisLabel,
        treatmentId: dto.treatmentId || null,
        treatmentLabel,
        treatmentNotes: dto.treatmentNotes?.trim() || null,
        estimatedDays: dto.estimatedDays ?? null,
        estimatedEndDate,
        status: 'active',
        staffId: dto.staffId || null,
        staffName: dto.staffName?.trim() || null,
        attachments: dto.attachments
          ? (dto.attachments as unknown as Prisma.InputJsonValue)
          : undefined,
        createdByUserId: userId ?? null,
      },
      include: { region: true, diagnosis: true, treatment: true, player: true, tenant: true },
    });

    await this.syncPlayerInjuryStatus(dto.playerId);
    return created;
  }

  async updateSession(
    id: string,
    dto: UpdatePhysioSessionDto,
    allowed: string[] | null,
  ) {
    const current = await this.findSession(id, allowed);
    const { diagnosisLabel, treatmentLabel } = await this.resolveLabels({
      diagnosisId: dto.diagnosisId,
      diagnosisLabel: dto.diagnosisLabel ?? current.diagnosisLabel ?? undefined,
      treatmentId: dto.treatmentId,
      treatmentLabel: dto.treatmentLabel ?? current.treatmentLabel ?? undefined,
    });

    let estimatedEndDate: Date | null | undefined = undefined;
    if (dto.estimatedEndDate === null) estimatedEndDate = null;
    else if (typeof dto.estimatedEndDate === 'string' && dto.estimatedEndDate) {
      estimatedEndDate = new Date(`${dto.estimatedEndDate}T12:00:00`);
    } else if (dto.estimatedDays && dto.estimatedDays > 0) {
      estimatedEndDate = new Date(current.startedAt);
      estimatedEndDate.setDate(estimatedEndDate.getDate() + dto.estimatedDays);
    }

    const nextStatus = dto.status ?? current.status;
    const endedAt =
      nextStatus === 'completed' || nextStatus === 'cancelled'
        ? current.endedAt ?? new Date()
        : nextStatus === 'active'
          ? null
          : current.endedAt;

    const updated = await this.prisma.physioSession.update({
      where: { id },
      data: {
        category: dto.category !== undefined ? dto.category : undefined,
        regionId: dto.regionId,
        side: dto.side,
        bodyMapView: dto.bodyMapView,
        bodyMapX: dto.bodyMapX,
        bodyMapY: dto.bodyMapY,
        symptoms: dto.symptoms,
        painScore: dto.painScore,
        diagnosisId: dto.diagnosisId === undefined ? undefined : dto.diagnosisId || null,
        diagnosisLabel:
          dto.diagnosisId !== undefined || dto.diagnosisLabel !== undefined
            ? diagnosisLabel
            : undefined,
        treatmentId: dto.treatmentId === undefined ? undefined : dto.treatmentId || null,
        treatmentLabel:
          dto.treatmentId !== undefined || dto.treatmentLabel !== undefined
            ? treatmentLabel
            : undefined,
        treatmentNotes: dto.treatmentNotes,
        estimatedDays: dto.estimatedDays,
        estimatedEndDate,
        status: dto.status,
        endedAt,
        staffId: dto.staffId,
        staffName: dto.staffName,
        attachments:
          dto.attachments !== undefined
            ? (dto.attachments as unknown as Prisma.InputJsonValue)
            : undefined,
      },
      include: { region: true, diagnosis: true, treatment: true, player: true, tenant: true },
    });

    await this.syncPlayerInjuryStatus(current.playerId);
    return updated;
  }

  async addEvolution(
    id: string,
    dto: AddPhysioEvolutionDto,
    allowed: string[] | null,
    user?: { id?: string; name?: string },
  ) {
    const current = await this.findSession(id, allowed);
    const prev = Array.isArray(current.evolutionNotes)
      ? (current.evolutionNotes as EvolutionNote[])
      : [];
    const next: EvolutionNote[] = [
      ...prev,
      {
        at: new Date().toISOString(),
        note: dto.note.trim(),
        painScore: dto.painScore ?? null,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
      },
    ];
    return this.prisma.physioSession.update({
      where: { id },
      data: {
        evolutionNotes: next as unknown as Prisma.InputJsonValue,
        ...(dto.painScore !== undefined ? { painScore: dto.painScore } : {}),
      },
      include: { region: true, diagnosis: true, treatment: true, player: true, tenant: true },
    });
  }

  async completeSession(id: string, allowed: string[] | null) {
    return this.updateSession(id, { status: 'completed' }, allowed);
  }

  async deleteSession(id: string, allowed: string[] | null) {
    const current = await this.findSession(id, allowed);
    await this.prisma.physioSession.delete({ where: { id } });
    await this.syncPlayerInjuryStatus(current.playerId);
    return { ok: true };
  }
}
