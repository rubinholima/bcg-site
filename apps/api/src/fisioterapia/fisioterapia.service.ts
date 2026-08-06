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
  CreatePhysioGroupSessionDto,
  CreatePhysioSessionDto,
  CreatePhysioTreatmentDto,
  PhysioSessionDiagnosisItemDto,
  PhysioSessionRegionDto,
  PhysioSessionTreatmentItemDto,
  UpdatePhysioGroupSessionDto,
  UpdatePhysioSessionDto,
} from './dto/fisioterapia.dto';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
} from '../common/sports-situation.util';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';

type EvolutionNote = {
  at: string;
  note: string;
  painScore?: number | null;
  userId?: string | null;
  userName?: string | null;
};

type GroupAttendanceRow = {
  playerId: string;
  playerName?: string;
  present?: boolean;
  notes?: string;
};

const sessionInclude = {
  region: true,
  diagnosis: true,
  treatment: true,
  sessionRegions: {
    orderBy: { sortOrder: 'asc' as const },
    include: { region: true },
  },
  sessionDiagnoses: {
    orderBy: { sortOrder: 'asc' as const },
    include: { diagnosis: true },
  },
  sessionTreatments: {
    orderBy: { sortOrder: 'asc' as const },
    include: { treatment: true },
  },
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
} satisfies Prisma.PhysioSessionInclude;

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

  listDiagnoses(regionId?: string) {
    return this.ensureCatalog().then(() =>
      this.prisma.physioDiagnosis.findMany({
        where: {
          active: true,
          ...(regionId ? { regionId } : {}),
        },
        orderBy: [{ regionId: 'asc' }, { name: 'asc' }],
      }),
    );
  }

  listRegions() {
    return this.ensureCatalog().then(() =>
      this.prisma.physioBodyRegion.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          diagnoses: {
            where: { active: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
    );
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
      include: sessionInclude,
      take: 500,
    });
  }

  async findSession(id: string, allowed: string[] | null) {
    const row = await this.prisma.physioSession.findUnique({
      where: { id },
      include: sessionInclude,
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

  private normalizeRegions(dto: {
    regionId?: string;
    side?: string;
    bodyMapView?: string;
    bodyMapX?: number;
    bodyMapY?: number;
    regions?: PhysioSessionRegionDto[];
  }): PhysioSessionRegionDto[] {
    if (dto.regions?.length) return dto.regions;
    if (dto.regionId) {
      return [
        {
          regionId: dto.regionId,
          side: dto.side,
          bodyMapView: dto.bodyMapView,
          bodyMapX: dto.bodyMapX,
          bodyMapY: dto.bodyMapY,
        },
      ];
    }
    return [];
  }

  private normalizeDiagnoses(dto: {
    diagnosisId?: string;
    diagnosisLabel?: string;
    regionId?: string;
    diagnoses?: PhysioSessionDiagnosisItemDto[];
  }): PhysioSessionDiagnosisItemDto[] {
    if (dto.diagnoses !== undefined) return dto.diagnoses;
    if (dto.diagnosisId || dto.diagnosisLabel?.trim()) {
      return [
        {
          diagnosisId: dto.diagnosisId,
          diagnosisLabel: dto.diagnosisLabel,
          regionId: dto.regionId,
        },
      ];
    }
    return [];
  }

  private normalizeTreatments(dto: {
    treatmentId?: string;
    treatmentLabel?: string;
    treatments?: PhysioSessionTreatmentItemDto[];
  }): PhysioSessionTreatmentItemDto[] {
    if (dto.treatments !== undefined) return dto.treatments;
    if (dto.treatmentId || dto.treatmentLabel?.trim()) {
      return [
        {
          treatmentId: dto.treatmentId,
          treatmentLabel: dto.treatmentLabel,
        },
      ];
    }
    return [];
  }

  private async resolveDiagnosisItems(items: PhysioSessionDiagnosisItemDto[]) {
    const resolved: Array<{
      regionId: string | null;
      diagnosisId: string | null;
      diagnosisLabel: string | null;
    }> = [];
    for (const item of items) {
      let label = item.diagnosisLabel?.trim() || null;
      let diagnosisId = item.diagnosisId || null;
      if (diagnosisId) {
        const d = await this.prisma.physioDiagnosis.findUnique({
          where: { id: diagnosisId },
        });
        if (!d) throw new BadRequestException('Diagnóstico inválido.');
        label = d.name;
      }
      if (!label && !diagnosisId) continue;
      resolved.push({
        regionId: item.regionId ?? null,
        diagnosisId,
        diagnosisLabel: label,
      });
    }
    return resolved;
  }

  private async resolveTreatmentItems(items: PhysioSessionTreatmentItemDto[]) {
    const resolved: Array<{
      treatmentId: string | null;
      treatmentLabel: string | null;
    }> = [];
    for (const item of items) {
      let label = item.treatmentLabel?.trim() || null;
      let treatmentId = item.treatmentId || null;
      if (treatmentId) {
        const t = await this.prisma.physioTreatment.findUnique({
          where: { id: treatmentId },
        });
        if (!t) throw new BadRequestException('Tratamento inválido.');
        label = t.name;
      }
      if (!label && !treatmentId) continue;
      resolved.push({ treatmentId, treatmentLabel: label });
    }
    return resolved;
  }

  private buildStatusDetails(session: {
    region?: { namePt: string } | null;
    regionId: string;
    side?: string | null;
    diagnosisLabel?: string | null;
    treatmentLabel?: string | null;
    estimatedEndDate?: Date | null;
    sessionRegions?: Array<{ region?: { namePt: string } | null; regionId: string; side?: string | null }>;
    sessionDiagnoses?: Array<{ diagnosisLabel?: string | null; diagnosis?: { name: string } | null }>;
    sessionTreatments?: Array<{ treatmentLabel?: string | null; treatment?: { name: string } | null }>;
  }) {
    const regionParts =
      session.sessionRegions && session.sessionRegions.length > 0
        ? session.sessionRegions.map((r) => {
            const regionName = r.region?.namePt ?? r.regionId;
            const side =
              r.side === 'E' ? ' esquerdo' : r.side === 'D' ? ' direito' : '';
            return `${regionName}${side}`;
          })
        : [
            (() => {
              const regionName = session.region?.namePt ?? session.regionId;
              const side =
                session.side === 'E' ? ' esquerdo' : session.side === 'D' ? ' direito' : '';
              return `${regionName}${side}`;
            })(),
          ];

    const dxParts =
      session.sessionDiagnoses && session.sessionDiagnoses.length > 0
        ? session.sessionDiagnoses
            .map((d) => d.diagnosisLabel ?? d.diagnosis?.name)
            .filter(Boolean)
        : session.diagnosisLabel
          ? [session.diagnosisLabel]
          : [];

    const txParts =
      session.sessionTreatments && session.sessionTreatments.length > 0
        ? session.sessionTreatments
            .map((t) => t.treatmentLabel ?? t.treatment?.name)
            .filter(Boolean)
        : session.treatmentLabel
          ? [session.treatmentLabel]
          : [];

    const parts = [
      `Fisio: ${regionParts.join(' + ')}`,
      dxParts.length ? `Dx: ${dxParts.join(' + ')}` : null,
      txParts.length ? `Tx: ${txParts.join(' + ')}` : null,
      session.estimatedEndDate
        ? `Previsão: ${session.estimatedEndDate.toISOString().slice(0, 10)}`
        : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }

  private async syncPlayerInjuryStatus(playerId: string) {
    const active = await this.prisma.physioSession.findMany({
      where: { playerId, status: 'active' },
      include: {
        region: true,
        sessionRegions: { include: { region: true } },
        sessionDiagnoses: { include: { diagnosis: true } },
        sessionTreatments: { include: { treatment: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const clearFisioStatus = async () => {
      const player = await this.prisma.player.findUnique({
        where: { id: playerId },
        select: { status: true, statusDetails: true },
      });
      if (
        (player?.status === 'injured' || player?.status === 'available') &&
        player.statusDetails?.startsWith('Fisio:')
      ) {
        await this.prisma.player.update({
          where: { id: playerId },
          data: {
            status: 'available',
            statusDetails: null,
            statusUntil: null,
          },
        });
      }
    };

    if (active.length === 0) {
      await clearFisioStatus();
      return;
    }

    const hasNaoApto = active.some(
      (s) => s.disposition === 'nao_apto' || !s.disposition,
    );
    const hasEmTratamento = active.some((s) => s.disposition === 'em_tratamento');
    const detailsBase = active.map((s) => this.buildStatusDetails(s)).join(' | ');
    const latestEnd = active
      .map((s) => s.estimatedEndDate)
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (hasNaoApto) {
      await this.prisma.player.update({
        where: { id: playerId },
        data: {
          status: 'injured',
          statusDetails: `Fisio: NÃO APTO · ${detailsBase}`,
          statusUntil: latestEnd ?? null,
        },
      });
      return;
    }

    if (hasEmTratamento) {
      await this.prisma.player.update({
        where: { id: playerId },
        data: {
          status: 'available',
          statusDetails: `Fisio: EM TRATAMENTO (pode treinar) · ${detailsBase}`,
          statusUntil: latestEnd ?? null,
        },
      });
      return;
    }

    await clearFisioStatus();
  }

  async setDisposition(
    id: string,
    disposition: 'alta' | 'em_tratamento' | 'nao_apto',
    allowed: string[] | null,
  ) {
    if (disposition === 'alta') {
      return this.updateSession(
        id,
        { status: 'completed', disposition: 'alta' },
        allowed,
      );
    }
    return this.updateSession(id, { status: 'active', disposition }, allowed);
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

    const regions = this.normalizeRegions(dto);
    if (regions.length === 0) {
      throw new BadRequestException('Informe ao menos um local de dor (região).');
    }
    for (const r of regions) {
      const region = await this.prisma.physioBodyRegion.findUnique({
        where: { id: r.regionId },
      });
      if (!region) throw new BadRequestException(`Região inválida: ${r.regionId}`);
    }

    const primary = regions[0]!;
    const diagnosisItems = await this.resolveDiagnosisItems(this.normalizeDiagnoses({
      ...dto,
      regionId: primary.regionId,
    }));
    const treatmentItems = await this.resolveTreatmentItems(
      this.normalizeTreatments({
        treatmentId: dto.treatmentId,
        treatmentLabel: dto.treatmentLabel,
        treatments: dto.treatments,
      }),
    );

    const { diagnosisLabel, treatmentLabel } = await this.resolveLabels({
      diagnosisId: dto.diagnosisId ?? diagnosisItems[0]?.diagnosisId ?? undefined,
      diagnosisLabel: dto.diagnosisLabel ?? diagnosisItems[0]?.diagnosisLabel ?? undefined,
      treatmentId: dto.treatmentId ?? treatmentItems[0]?.treatmentId ?? undefined,
      treatmentLabel: dto.treatmentLabel ?? treatmentItems[0]?.treatmentLabel ?? undefined,
    });
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
        regionId: primary.regionId,
        side: primary.side ?? null,
        bodyMapView: primary.bodyMapView ?? null,
        bodyMapX: primary.bodyMapX ?? null,
        bodyMapY: primary.bodyMapY ?? null,
        symptoms: dto.symptoms?.trim() || null,
        painScore: dto.painScore ?? null,
        diagnosisId: diagnosisItems[0]?.diagnosisId ?? dto.diagnosisId ?? null,
        diagnosisLabel: diagnosisItems[0]?.diagnosisLabel ?? diagnosisLabel,
        treatmentId: treatmentItems[0]?.treatmentId ?? dto.treatmentId ?? null,
        treatmentLabel: treatmentItems[0]?.treatmentLabel ?? treatmentLabel,
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
        sessionRegions: {
          create: regions.map((r, i) => ({
            regionId: r.regionId,
            side: r.side ?? null,
            bodyMapView: r.bodyMapView ?? null,
            bodyMapX: r.bodyMapX ?? null,
            bodyMapY: r.bodyMapY ?? null,
            sortOrder: i,
          })),
        },
        sessionDiagnoses: diagnosisItems.length
          ? {
              create: diagnosisItems.map((d, i) => ({
                regionId: d.regionId,
                diagnosisId: d.diagnosisId,
                diagnosisLabel: d.diagnosisLabel,
                sortOrder: i,
              })),
            }
          : undefined,
        sessionTreatments: treatmentItems.length
          ? {
              create: treatmentItems.map((t, i) => ({
                treatmentId: t.treatmentId,
                treatmentLabel: t.treatmentLabel,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: sessionInclude,
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

    const shouldUpdateRegions =
      dto.regions !== undefined ||
      dto.regionId !== undefined ||
      dto.side !== undefined ||
      dto.bodyMapView !== undefined ||
      dto.bodyMapX !== undefined ||
      dto.bodyMapY !== undefined;

    let regions: PhysioSessionRegionDto[] | undefined;
    if (shouldUpdateRegions) {
      regions = this.normalizeRegions({
        regionId: dto.regionId ?? current.regionId,
        side: dto.side ?? current.side ?? undefined,
        bodyMapView: dto.bodyMapView ?? current.bodyMapView ?? undefined,
        bodyMapX: dto.bodyMapX ?? current.bodyMapX ?? undefined,
        bodyMapY: dto.bodyMapY ?? current.bodyMapY ?? undefined,
        regions: dto.regions,
      });
      if (regions.length === 0) {
        throw new BadRequestException('Informe ao menos um local de dor (região).');
      }
      for (const r of regions) {
        const region = await this.prisma.physioBodyRegion.findUnique({
          where: { id: r.regionId },
        });
        if (!region) throw new BadRequestException(`Região inválida: ${r.regionId}`);
      }
    }

    const shouldUpdateDiagnoses =
      dto.diagnoses !== undefined ||
      dto.diagnosisId !== undefined ||
      dto.diagnosisLabel !== undefined;

    let diagnosisItems:
      | Array<{ regionId: string | null; diagnosisId: string | null; diagnosisLabel: string | null }>
      | undefined;
    if (shouldUpdateDiagnoses) {
      const primaryRegionId =
        regions?.[0]?.regionId ?? dto.regionId ?? current.regionId;
      diagnosisItems = await this.resolveDiagnosisItems(
        this.normalizeDiagnoses({
          diagnosisId: dto.diagnosisId ?? current.diagnosisId ?? undefined,
          diagnosisLabel: dto.diagnosisLabel ?? current.diagnosisLabel ?? undefined,
          regionId: primaryRegionId,
          diagnoses: dto.diagnoses,
        }),
      );
    }

    const shouldUpdateTreatments =
      dto.treatments !== undefined ||
      dto.treatmentId !== undefined ||
      dto.treatmentLabel !== undefined;

    let treatmentItems:
      | Array<{ treatmentId: string | null; treatmentLabel: string | null }>
      | undefined;
    if (shouldUpdateTreatments) {
      treatmentItems = await this.resolveTreatmentItems(
        this.normalizeTreatments({
          treatmentId: dto.treatmentId ?? current.treatmentId ?? undefined,
          treatmentLabel: dto.treatmentLabel ?? current.treatmentLabel ?? undefined,
          treatments: dto.treatments,
        }),
      );
    }

    const { diagnosisLabel, treatmentLabel } = await this.resolveLabels({
      diagnosisId:
        dto.diagnosisId ??
        diagnosisItems?.[0]?.diagnosisId ??
        current.diagnosisId ??
        undefined,
      diagnosisLabel:
        dto.diagnosisLabel ??
        diagnosisItems?.[0]?.diagnosisLabel ??
        current.diagnosisLabel ??
        undefined,
      treatmentId:
        dto.treatmentId ??
        treatmentItems?.[0]?.treatmentId ??
        current.treatmentId ??
        undefined,
      treatmentLabel:
        dto.treatmentLabel ??
        treatmentItems?.[0]?.treatmentLabel ??
        current.treatmentLabel ??
        undefined,
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

    if (regions !== undefined) {
      await this.prisma.physioSessionRegion.deleteMany({ where: { sessionId: id } });
    }
    if (diagnosisItems !== undefined) {
      await this.prisma.physioSessionDiagnosis.deleteMany({ where: { sessionId: id } });
    }
    if (treatmentItems !== undefined) {
      await this.prisma.physioSessionTreatment.deleteMany({ where: { sessionId: id } });
    }

    const primary = regions?.[0];

    const updated = await this.prisma.physioSession.update({
      where: { id },
      data: {
        category: dto.category !== undefined ? dto.category : undefined,
        ...(primary
          ? {
              regionId: primary.regionId,
              side: primary.side ?? null,
              bodyMapView: primary.bodyMapView ?? null,
              bodyMapX: primary.bodyMapX ?? null,
              bodyMapY: primary.bodyMapY ?? null,
            }
          : {
              regionId: dto.regionId,
              side: dto.side,
              bodyMapView: dto.bodyMapView,
              bodyMapX: dto.bodyMapX,
              bodyMapY: dto.bodyMapY,
            }),
        symptoms: dto.symptoms,
        painScore: dto.painScore,
        diagnosisId:
          diagnosisItems !== undefined
            ? diagnosisItems[0]?.diagnosisId ?? null
            : dto.diagnosisId === undefined
              ? undefined
              : dto.diagnosisId || null,
        diagnosisLabel:
          diagnosisItems !== undefined
            ? diagnosisItems[0]?.diagnosisLabel ?? diagnosisLabel
            : dto.diagnosisId !== undefined || dto.diagnosisLabel !== undefined
              ? diagnosisLabel
              : undefined,
        treatmentId:
          treatmentItems !== undefined
            ? treatmentItems[0]?.treatmentId ?? null
            : dto.treatmentId === undefined
              ? undefined
              : dto.treatmentId || null,
        treatmentLabel:
          treatmentItems !== undefined
            ? treatmentItems[0]?.treatmentLabel ?? treatmentLabel
            : dto.treatmentId !== undefined || dto.treatmentLabel !== undefined
              ? treatmentLabel
              : undefined,
        treatmentNotes: dto.treatmentNotes,
        estimatedDays: dto.estimatedDays,
        estimatedEndDate,
        status: dto.status,
        disposition: dto.disposition,
        endedAt,
        staffId: dto.staffId,
        staffName: dto.staffName,
        attachments:
          dto.attachments !== undefined
            ? (dto.attachments as unknown as Prisma.InputJsonValue)
            : undefined,
        ...(regions !== undefined
          ? {
              sessionRegions: {
                create: regions.map((r, i) => ({
                  regionId: r.regionId,
                  side: r.side ?? null,
                  bodyMapView: r.bodyMapView ?? null,
                  bodyMapX: r.bodyMapX ?? null,
                  bodyMapY: r.bodyMapY ?? null,
                  sortOrder: i,
                })),
              },
            }
          : {}),
        ...(diagnosisItems !== undefined
          ? {
              sessionDiagnoses: {
                create: diagnosisItems.map((d, i) => ({
                  regionId: d.regionId,
                  diagnosisId: d.diagnosisId,
                  diagnosisLabel: d.diagnosisLabel,
                  sortOrder: i,
                })),
              },
            }
          : {}),
        ...(treatmentItems !== undefined
          ? {
              sessionTreatments: {
                create: treatmentItems.map((t, i) => ({
                  treatmentId: t.treatmentId,
                  treatmentLabel: t.treatmentLabel,
                  sortOrder: i,
                })),
              },
            }
          : {}),
      },
      include: sessionInclude,
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
      include: sessionInclude,
    });
  }

  async completeSession(id: string, allowed: string[] | null) {
    return this.setDisposition(id, 'alta', allowed);
  }

  async deleteSession(id: string, allowed: string[] | null) {
    const current = await this.findSession(id, allowed);
    await this.prisma.physioSession.delete({ where: { id } });
    await this.syncPlayerInjuryStatus(current.playerId);
    return { ok: true };
  }

  private sportsSituationFromProfile(registrationProfile: unknown): string | undefined {
    if (
      !registrationProfile ||
      typeof registrationProfile !== 'object' ||
      Array.isArray(registrationProfile)
    ) {
      return undefined;
    }
    const sports = (registrationProfile as Record<string, unknown>).sports;
    if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return undefined;
    const situation = (sports as Record<string, unknown>).situation;
    return typeof situation === 'string' ? situation : undefined;
  }

  private isActiveRosterPlayer(registrationProfile: unknown): boolean {
    const situation = this.sportsSituationFromProfile(registrationProfile);
    return !isArchivedSportsSituation(situation) && !isLoanedSportsSituation(situation);
  }

  private async findActivePlayersByCategory(tenantId: string, category: string) {
    const players = await this.prisma.player.findMany({
      where: { tenantId, category },
      select: { id: true, name: true, registrationProfile: true },
      orderBy: { name: 'asc' },
    });
    return players.filter((p) => this.isActiveRosterPlayer(p.registrationProfile));
  }

  async categoryRoster(tenantId: string, category: string, allowed: string[] | null) {
    this.assertTenant(allowed, tenantId);
    const players = await this.findActivePlayersByCategory(tenantId, category);
    return players
      .map((p) => ({
        playerId: p.id,
        playerName: getPlayerListDisplayName(p),
        present: false,
      }))
      .sort((a, b) =>
        (a.playerName ?? '').localeCompare(b.playerName ?? '', 'pt-BR', { sensitivity: 'base' }),
      );
  }

  async listGroupSessions(
    filters: { tenantId?: string; category?: string; from?: string; to?: string },
    allowed: string[] | null,
  ) {
    const where: Prisma.PhysioGroupSessionWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      where.tenantId = filters.tenantId;
    } else if (allowed?.length) {
      where.tenantId = { in: allowed };
    }
    if (filters.category) where.category = filters.category;
    if (filters.from || filters.to) {
      where.sessionDate = {};
      if (filters.from) where.sessionDate.gte = filters.from;
      if (filters.to) where.sessionDate.lte = filters.to;
    }
    return this.prisma.physioGroupSession.findMany({
      where,
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      take: 500,
    });
  }

  async findGroupSession(id: string, allowed: string[] | null) {
    const row = await this.prisma.physioGroupSession.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Sessão de recovery não encontrada.');
    this.assertTenant(allowed, row.tenantId);
    return row;
  }

  private normalizeGroupAttendance(rows: GroupAttendanceRow[]): GroupAttendanceRow[] {
    const seen = new Set<string>();
    const out: GroupAttendanceRow[] = [];
    for (const row of rows) {
      const playerId = row.playerId?.trim();
      if (!playerId || seen.has(playerId)) continue;
      seen.add(playerId);
      out.push({
        playerId,
        playerName: row.playerName?.trim() || undefined,
        present: row.present === true,
        notes: row.notes?.trim() || undefined,
      });
    }
    return out;
  }

  async createGroupSession(
    dto: CreatePhysioGroupSessionDto,
    allowed: string[] | null,
    userId?: string,
  ) {
    this.assertTenant(allowed, dto.tenantId);
    const category = dto.category.trim();
    if (!category) throw new BadRequestException('Categoria é obrigatória.');
    const sessionDate = dto.sessionDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      throw new BadRequestException('Data inválida (use AAAA-MM-DD).');
    }
    const attendance = this.normalizeGroupAttendance(dto.attendance ?? []);
    const participants = attendance.filter((a) => a.present === true);
    if (participants.length === 0) {
      throw new BadRequestException('Selecione ao menos um atleta participante.');
    }

    const playerIds = participants.map((a) => a.playerId);
    const players = await this.prisma.player.findMany({
      where: { id: { in: playerIds }, tenantId: dto.tenantId },
      select: { id: true, name: true },
    });
    if (players.length !== playerIds.length) {
      throw new BadRequestException('Um ou mais atletas são inválidos para este clube.');
    }
    const nameById = new Map(players.map((p) => [p.id, getPlayerListDisplayName(p)]));
    const storedAttendance = attendance.map((a) => ({
      ...a,
      playerName: a.playerName ?? nameById.get(a.playerId) ?? undefined,
    }));

    return this.prisma.physioGroupSession.create({
      data: {
        tenantId: dto.tenantId,
        category,
        sessionDate,
        description: dto.description?.trim() || null,
        staffId: dto.staffId || null,
        staffName: dto.staffName?.trim() || null,
        location: dto.location?.trim() || null,
        attendance: storedAttendance as unknown as Prisma.InputJsonValue,
        createdByUserId: userId ?? null,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async updateGroupSession(
    id: string,
    dto: UpdatePhysioGroupSessionDto,
    allowed: string[] | null,
  ) {
    const current = await this.findGroupSession(id, allowed);
    let attendance: GroupAttendanceRow[] | undefined;
    if (dto.attendance !== undefined) {
      attendance = this.normalizeGroupAttendance(dto.attendance);
      const participants = attendance.filter((a) => a.present === true);
      if (participants.length === 0) {
        throw new BadRequestException('Selecione ao menos um atleta participante.');
      }
      const playerIds = participants.map((a) => a.playerId);
      const count = await this.prisma.player.count({
        where: { id: { in: playerIds }, tenantId: current.tenantId },
      });
      if (count !== playerIds.length) {
        throw new BadRequestException('Um ou mais atletas são inválidos para este clube.');
      }
    }

    return this.prisma.physioGroupSession.update({
      where: { id },
      data: {
        category: dto.category?.trim(),
        sessionDate: dto.sessionDate?.trim(),
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        staffId: dto.staffId,
        staffName: dto.staffName,
        location: dto.location !== undefined ? dto.location?.trim() || null : undefined,
        attendance:
          attendance !== undefined
            ? (attendance as unknown as Prisma.InputJsonValue)
            : undefined,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async deleteGroupSession(id: string, allowed: string[] | null) {
    await this.findGroupSession(id, allowed);
    await this.prisma.physioGroupSession.delete({ where: { id } });
    return { ok: true };
  }

  async getReportsDashboard(
    filters: { tenantId?: string; category?: string; from?: string; to?: string },
    allowed: string[] | null,
  ) {
    const sessionWhere: Prisma.PhysioSessionWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      sessionWhere.tenantId = filters.tenantId;
    } else if (allowed?.length) {
      sessionWhere.tenantId = { in: allowed };
    }
    if (filters.category) sessionWhere.category = filters.category;
    if (filters.from || filters.to) {
      sessionWhere.startedAt = {};
      if (filters.from) sessionWhere.startedAt.gte = new Date(`${filters.from}T00:00:00`);
      if (filters.to) sessionWhere.startedAt.lte = new Date(`${filters.to}T23:59:59`);
    }

    const groupWhere: Prisma.PhysioGroupSessionWhereInput = {};
    if (filters.tenantId) groupWhere.tenantId = filters.tenantId;
    else if (allowed?.length) groupWhere.tenantId = { in: allowed };
    if (filters.category) groupWhere.category = filters.category;
    if (filters.from || filters.to) {
      groupWhere.sessionDate = {};
      if (filters.from) groupWhere.sessionDate.gte = filters.from;
      if (filters.to) groupWhere.sessionDate.lte = filters.to;
    }

    const [sessions, groupSessions] = await Promise.all([
      this.prisma.physioSession.findMany({
        where: sessionWhere,
        include: {
          sessionRegions: { include: { region: true } },
          sessionDiagnoses: { include: { diagnosis: true } },
          sessionTreatments: { include: { treatment: true } },
          region: true,
          player: { select: { id: true, name: true, category: true } },
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 5000,
      }),
      this.prisma.physioGroupSession.findMany({
        where: groupWhere,
        include: { tenant: { select: { id: true, name: true } } },
        orderBy: { sessionDate: 'desc' },
        take: 2000,
      }),
    ]);

    const byCategory = new Map<string, { individual: number; group: number; active: number }>();
    const byStatus = new Map<string, number>();
    const byRegion = new Map<string, { regionId: string; regionName: string; count: number }>();
    const byDiagnosis = new Map<string, number>();
    const byTreatment = new Map<string, number>();
    const byStaff = new Map<string, { staffId: string | null; staffName: string; individual: number; group: number }>();
    const byMonth = new Map<string, { month: string; individual: number; group: number }>();
    const uniquePlayers = new Set<string>();
    let painScoreSum = 0;
    let painScoreCount = 0;
    let returnDaysSum = 0;
    let returnDaysCount = 0;

    const bumpCategory = (cat: string | null | undefined, field: 'individual' | 'group' | 'active') => {
      const key = cat?.trim() || 'Sem categoria';
      const row = byCategory.get(key) ?? { individual: 0, group: 0, active: 0 };
      row[field] += 1;
      byCategory.set(key, row);
    };

    const bumpStaff = (staffId: string | null | undefined, staffName: string | null | undefined, field: 'individual' | 'group') => {
      const name = staffName?.trim() || 'Não informado';
      const key = staffId ?? name;
      const row = byStaff.get(key) ?? { staffId: staffId ?? null, staffName: name, individual: 0, group: 0 };
      row[field] += 1;
      byStaff.set(key, row);
    };

    const bumpMonth = (date: Date | string, field: 'individual' | 'group') => {
      const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T12:00:00`) : date;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = byMonth.get(month) ?? { month, individual: 0, group: 0 };
      row[field] += 1;
      byMonth.set(month, row);
    };

    for (const s of sessions) {
      uniquePlayers.add(s.playerId);
      byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
      bumpCategory(s.category ?? s.player?.category, 'individual');
      if (s.status === 'active') bumpCategory(s.category ?? s.player?.category, 'active');
      bumpStaff(s.staffId, s.staffName, 'individual');
      bumpMonth(s.startedAt, 'individual');

      if (s.painScore != null) {
        painScoreSum += s.painScore;
        painScoreCount += 1;
      }
      if (s.status === 'completed' && s.endedAt) {
        const days = Math.round(
          (s.endedAt.getTime() - s.startedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (days >= 0) {
          returnDaysSum += days;
          returnDaysCount += 1;
        }
      }

      const regionRows =
        s.sessionRegions.length > 0
          ? s.sessionRegions
          : [{ regionId: s.regionId, region: s.region }];
      for (const r of regionRows) {
        const regionName = r.region?.namePt ?? r.regionId;
        const prev = byRegion.get(r.regionId) ?? { regionId: r.regionId, regionName, count: 0 };
        prev.count += 1;
        byRegion.set(r.regionId, prev);
      }

      const dxRows =
        s.sessionDiagnoses.length > 0
          ? s.sessionDiagnoses.map((d) => d.diagnosisLabel ?? d.diagnosis?.name).filter(Boolean)
          : s.diagnosisLabel
            ? [s.diagnosisLabel]
            : [];
      for (const label of dxRows) {
        if (!label) continue;
        byDiagnosis.set(label, (byDiagnosis.get(label) ?? 0) + 1);
      }

      const txRows =
        s.sessionTreatments.length > 0
          ? s.sessionTreatments.map((t) => t.treatmentLabel ?? t.treatment?.name).filter(Boolean)
          : s.treatmentLabel
            ? [s.treatmentLabel]
            : [];
      for (const label of txRows) {
        if (!label) continue;
        byTreatment.set(label, (byTreatment.get(label) ?? 0) + 1);
      }
    }

    let groupParticipants = 0;
    for (const g of groupSessions) {
      bumpCategory(g.category, 'group');
      bumpStaff(g.staffId, g.staffName, 'group');
      bumpMonth(g.sessionDate, 'group');
      const attendance = Array.isArray(g.attendance)
        ? (g.attendance as GroupAttendanceRow[])
        : [];
      groupParticipants += attendance.filter((a) => a.present === true).length;
    }

    const activeSessions = sessions.filter((s) => s.status === 'active');

    return {
      summary: {
        totalIndividual: sessions.length,
        totalGroup: groupSessions.length,
        activeSessions: activeSessions.length,
        completedSessions: sessions.filter((s) => s.status === 'completed').length,
        groupParticipants,
        uniquePlayers: uniquePlayers.size,
        avgPainScore: painScoreCount > 0 ? Math.round((painScoreSum / painScoreCount) * 10) / 10 : null,
        avgReturnDays: returnDaysCount > 0 ? Math.round(returnDaysSum / returnDaysCount) : null,
      },
      byCategory: [...byCategory.entries()]
        .map(([category, counts]) => ({ category, ...counts, total: counts.individual + counts.group }))
        .sort((a, b) => b.total - a.total),
      byStatus: [...byStatus.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
      byRegion: [...byRegion.values()].sort((a, b) => b.count - a.count).slice(0, 15),
      byDiagnosis: [...byDiagnosis.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      byTreatment: [...byTreatment.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      byStaff: [...byStaff.values()].sort(
        (a, b) => b.individual + b.group - (a.individual + a.group),
      ),
      byMonth: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
      activeInjured: activeSessions.map((s) => ({
        id: s.id,
        playerId: s.playerId,
        playerName: s.player?.name ?? '',
        category: s.category ?? s.player?.category ?? null,
        tenantName: s.tenant?.name ?? '',
        regions: (s.sessionRegions.length > 0 ? s.sessionRegions : [{ region: s.region, regionId: s.regionId, side: s.side }]).map((r) => ({
          name: r.region?.namePt ?? r.regionId,
          side: r.side ?? null,
        })),
        diagnoses: (s.sessionDiagnoses.length > 0
          ? s.sessionDiagnoses.map((d) => d.diagnosisLabel ?? d.diagnosis?.name)
          : s.diagnosisLabel
            ? [s.diagnosisLabel]
            : []
        ).filter(Boolean),
        painScore: s.painScore,
        estimatedEndDate: s.estimatedEndDate?.toISOString().slice(0, 10) ?? null,
        startedAt: s.startedAt.toISOString(),
        staffName: s.staffName,
      })),
    };
  }
}
