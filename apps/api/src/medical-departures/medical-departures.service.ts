import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MEDICAL_DEPARTURE_CARE_TYPES,
  MEDICAL_DEPARTURE_STATUSES,
  MEDICAL_DEPARTURE_TRANSPORT_MODES,
  type MedicalDepartureStatus,
} from './medical-departure.constants';
import {
  normalizeDocumentIds,
  resolveDepartureDocuments,
} from './medical-departure-documents.util';
import {
  assertDepartureStatusTransition,
  inferInitialDepartureStatus,
  normalizeReturnedAtForStatus,
} from './medical-departure-status.util';
import {
  CreateMedicalDepartureDto,
  RegisterMedicalDepartureReturnDto,
  UpdateMedicalDepartureDto,
} from './dto/medical-departure.dto';

const departureInclude = {
  player: {
    select: {
      id: true,
      name: true,
      category: true,
      photoUrl: true,
      tenantId: true,
      jerseyNumber: true,
      registrationProfile: true,
    },
  },
  tenant: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.PlayerMedicalDepartureInclude;

type DepartureRow = Prisma.PlayerMedicalDepartureGetPayload<{
  include: typeof departureInclude;
}>;

@Injectable()
export class MedicalDeparturesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Sem acesso a este clube.');
    }
  }

  private mapRow(row: DepartureRow) {
    const documents = resolveDepartureDocuments(
      row.player.registrationProfile,
      row.documentIds,
    );
    const { registrationProfile: _profile, ...playerRest } = row.player;
    return {
      ...row,
      player: playerRest,
      documents,
    };
  }

  private parseDate(value: string, label: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`${label} inválida.`);
    }
    return d;
  }

  private validateEnums(dto: CreateMedicalDepartureDto | UpdateMedicalDepartureDto) {
    if (!MEDICAL_DEPARTURE_CARE_TYPES.includes(dto.careType as never)) {
      throw new BadRequestException('Tipo de atendimento inválido.');
    }
    if (!MEDICAL_DEPARTURE_TRANSPORT_MODES.includes(dto.transportMode as never)) {
      throw new BadRequestException('Transporte inválido.');
    }
    if (dto.status && !MEDICAL_DEPARTURE_STATUSES.includes(dto.status as never)) {
      throw new BadRequestException('Status inválido.');
    }
  }

  private async resolveCompanion(dto: {
    companionStaffId?: string;
    companionName?: string;
    tenantId: string;
  }) {
    let companionName = dto.companionName?.trim() || null;
    const companionStaffId = dto.companionStaffId?.trim() || null;
    if (companionStaffId) {
      const staff = await this.prisma.medicalStaff.findUnique({
        where: { id: companionStaffId },
      });
      if (!staff || staff.tenantId !== dto.tenantId) {
        throw new BadRequestException('Acompanhante da equipe inválido.');
      }
      companionName = staff.name;
    }
    return { companionStaffId, companionName };
  }

  async list(
    filters: {
      tenantId?: string;
      playerId?: string;
      category?: string;
      careType?: string;
      transportMode?: string;
      status?: string;
      from?: string;
      to?: string;
    },
    allowed: string[] | null,
  ) {
    const where: Prisma.PlayerMedicalDepartureWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      where.tenantId = filters.tenantId;
    } else if (allowed !== null) {
      where.tenantId = { in: allowed };
    }
    if (filters.playerId) where.playerId = filters.playerId;
    if (filters.category) where.category = filters.category;
    if (filters.careType) where.careType = filters.careType;
    if (filters.transportMode) where.transportMode = filters.transportMode;
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.from || filters.to) {
      where.departedAt = {};
      if (filters.from) where.departedAt.gte = new Date(`${filters.from}T00:00:00`);
      if (filters.to) where.departedAt.lte = new Date(`${filters.to}T23:59:59`);
    }

    const rows = await this.prisma.playerMedicalDeparture.findMany({
      where,
      orderBy: [{ status: 'asc' }, { departedAt: 'desc' }],
      include: departureInclude,
      take: 1000,
    });
    return rows.map((row) => this.mapRow(row));
  }

  async findOne(id: string, allowed: string[] | null) {
    const row = await this.prisma.playerMedicalDeparture.findUnique({
      where: { id },
      include: departureInclude,
    });
    if (!row) throw new NotFoundException('Saída não encontrada.');
    this.assertTenant(allowed, row.tenantId);
    return this.mapRow(row);
  }

  async create(dto: CreateMedicalDepartureDto, allowed: string[] | null, userId?: string) {
    this.assertTenant(allowed, dto.tenantId);
    this.validateEnums(dto);

    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player || player.tenantId !== dto.tenantId) {
      throw new BadRequestException('Atleta inválido para este clube.');
    }

    const departedAt = this.parseDate(dto.departedAt, 'Data/hora de saída');
    const returnedAt = dto.returnedAt ? this.parseDate(dto.returnedAt, 'Data/hora de retorno') : null;
    if (returnedAt && returnedAt.getTime() < departedAt.getTime()) {
      throw new BadRequestException('Retorno não pode ser anterior à saída.');
    }

    let status = inferInitialDepartureStatus(
      departedAt,
      dto.status,
    ) as MedicalDepartureStatus;
    if (returnedAt) status = 'retornou';

    const { companionStaffId, companionName } = await this.resolveCompanion({
      companionStaffId: dto.companionStaffId,
      companionName: dto.companionName,
      tenantId: dto.tenantId,
    });

    const row = await this.prisma.playerMedicalDeparture.create({
      data: {
        tenantId: dto.tenantId,
        playerId: dto.playerId,
        category: dto.category?.trim() || player.category,
        departedAt,
        returnedAt: normalizeReturnedAtForStatus(status, returnedAt),
        destination: dto.destination.trim(),
        careType: dto.careType,
        reason: dto.reason.trim(),
        careSummary: dto.careSummary?.trim() || null,
        transportMode: dto.transportMode,
        transportNotes: dto.transportNotes?.trim() || null,
        companionStaffId,
        companionName,
        companionPhone: dto.companionPhone?.trim() || null,
        status,
        notes: dto.notes?.trim() || null,
        documentIds: normalizeDocumentIds(dto.documentIds ?? []) as unknown as Prisma.InputJsonValue,
        createdByUserId: userId ?? null,
      },
      include: departureInclude,
    });

    return this.mapRow(row);
  }

  async update(id: string, dto: UpdateMedicalDepartureDto, allowed: string[] | null) {
    const existing = await this.prisma.playerMedicalDeparture.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Saída não encontrada.');
    this.assertTenant(allowed, existing.tenantId);
    this.validateEnums(dto);

    const tenantId = dto.tenantId ?? existing.tenantId;
    if (tenantId !== existing.tenantId) {
      throw new BadRequestException('Não é permitido trocar o clube do registro.');
    }

    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player || player.tenantId !== tenantId) {
      throw new BadRequestException('Atleta inválido para este clube.');
    }

    const departedAt = this.parseDate(dto.departedAt, 'Data/hora de saída');
    const returnedAt = dto.returnedAt ? this.parseDate(dto.returnedAt, 'Data/hora de retorno') : null;
    if (returnedAt && returnedAt.getTime() < departedAt.getTime()) {
      throw new BadRequestException('Retorno não pode ser anterior à saída.');
    }

    let status = (dto.status ?? existing.status) as MedicalDepartureStatus;
    try {
      assertDepartureStatusTransition(existing.status as MedicalDepartureStatus, status);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Transição de status inválida.');
    }

    if (returnedAt) status = 'retornou';
    if (status === 'em_atendimento' && departedAt.getTime() > Date.now()) {
      status = 'programada';
    }
    if (status === 'programada' && departedAt.getTime() <= Date.now() && !returnedAt) {
      status = 'em_atendimento';
    }

    const { companionStaffId, companionName } = await this.resolveCompanion({
      companionStaffId: dto.companionStaffId,
      companionName: dto.companionName,
      tenantId,
    });

    const row = await this.prisma.playerMedicalDeparture.update({
      where: { id },
      data: {
        playerId: dto.playerId,
        category: dto.category?.trim() || player.category,
        departedAt,
        returnedAt: normalizeReturnedAtForStatus(status, returnedAt ?? existing.returnedAt),
        destination: dto.destination.trim(),
        careType: dto.careType,
        reason: dto.reason.trim(),
        careSummary: dto.careSummary?.trim() || null,
        transportMode: dto.transportMode,
        transportNotes: dto.transportNotes?.trim() || null,
        companionStaffId,
        companionName,
        companionPhone: dto.companionPhone?.trim() || null,
        status,
        notes: dto.notes?.trim() || null,
        documentIds: normalizeDocumentIds(
          dto.documentIds ?? normalizeDocumentIds(existing.documentIds),
        ) as unknown as Prisma.InputJsonValue,
      },
      include: departureInclude,
    });

    return this.mapRow(row);
  }

  async registerReturn(
    id: string,
    dto: RegisterMedicalDepartureReturnDto,
    allowed: string[] | null,
  ) {
    const existing = await this.prisma.playerMedicalDeparture.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Saída não encontrada.');
    this.assertTenant(allowed, existing.tenantId);
    if (existing.status === 'cancelada') {
      throw new BadRequestException('Saída cancelada não pode registrar retorno.');
    }
    if (existing.status === 'retornou') {
      throw new BadRequestException('Retorno já registrado.');
    }

    const returnedAt = dto.returnedAt
      ? this.parseDate(dto.returnedAt, 'Data/hora de retorno')
      : new Date();
    if (returnedAt.getTime() < existing.departedAt.getTime()) {
      throw new BadRequestException('Retorno não pode ser anterior à saída.');
    }

    const row = await this.prisma.playerMedicalDeparture.update({
      where: { id },
      data: {
        status: 'retornou',
        returnedAt,
        careSummary: dto.careSummary?.trim() || existing.careSummary,
        notes: dto.notes?.trim() || existing.notes,
      },
      include: departureInclude,
    });

    return this.mapRow(row);
  }

  async cancel(id: string, allowed: string[] | null) {
    const existing = await this.prisma.playerMedicalDeparture.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Saída não encontrada.');
    this.assertTenant(allowed, existing.tenantId);
    if (existing.status === 'retornou') {
      throw new BadRequestException('Saída já encerrada com retorno.');
    }

    const row = await this.prisma.playerMedicalDeparture.update({
      where: { id },
      data: {
        status: 'cancelada',
        returnedAt: null,
      },
      include: departureInclude,
    });

    return this.mapRow(row);
  }

  async delete(id: string, allowed: string[] | null) {
    const existing = await this.prisma.playerMedicalDeparture.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Saída não encontrada.');
    this.assertTenant(allowed, existing.tenantId);
    await this.prisma.playerMedicalDeparture.delete({ where: { id } });
    return { ok: true };
  }
}
