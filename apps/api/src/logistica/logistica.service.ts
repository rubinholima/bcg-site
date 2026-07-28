import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { normalizeTravelCategoriesInput } from '../futebol-agenda/travel-categories.util';
import { CreateTravelLogisticsDto } from './dto/create-travel-logistics.dto';
import { UpdateTravelLogisticsDto } from './dto/update-travel-logistics.dto';
import {
  SetTravelParticipantsDto,
  TravelParticipantItemDto,
} from './dto/set-travel-participants.dto';

const PARTICIPANT_INCLUDE = {
  player: {
    select: {
      id: true,
      name: true,
      category: true,
      birthDate: true,
      photoUrl: true,
      jerseyNumber: true,
      position: true,
    },
  },
  staff: {
    select: {
      id: true,
      name: true,
      role: true,
      photoUrl: true,
    },
  },
} as const;

@Injectable()
export class LogisticaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  /** Garante que o tenant é clube (logística só para clubes) */
  private async ensureClubTenant(tenantId: string) {
    const tenant = await this.tenants.findOne(tenantId);
    const kindName = (tenant as { kind?: { name?: string } }).kind?.name;
    if (!kindName) throw new BadRequestException('Tenant sem tipo definido');
    const k = kindName.toLowerCase();
    const isClub =
      k.includes('futebol') || k.includes('clube') || k.includes('football');
    if (
      !isClub ||
      k.includes('construtora') ||
      k.includes('real estate') ||
      k.includes('construção')
    ) {
      throw new BadRequestException(
        'Logística de deslocamento é disponível apenas para clubes de futebol',
      );
    }
  }

  async findAll(
    tenantId?: string,
    status?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (status?.trim()) where.status = status;
    if (fromDate || toDate) {
      where.matchDate = {};
      if (fromDate)
        (where.matchDate as Record<string, Date>).gte = new Date(fromDate);
      if (toDate)
        (where.matchDate as Record<string, Date>).lte = new Date(toDate);
    }
    return this.prisma.travelLogistics.findMany({
      where,
      orderBy: [{ matchDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        _count: { select: { participants: true } },
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.travelLogistics.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        participants: {
          include: PARTICIPANT_INCLUDE,
          orderBy: [{ personType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        _count: { select: { participants: true } },
      },
    });
    if (!item) throw new NotFoundException('Planejamento não encontrado');
    return item;
  }

  async listParticipants(travelId: string) {
    await this.findOne(travelId);
    return this.prisma.travelParticipant.findMany({
      where: { travelLogisticsId: travelId },
      include: PARTICIPANT_INCLUDE,
      orderBy: [{ personType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Substitui a convocação inteira. Cada atleta/staff fica com FK no cadastro
   * (playerId / staffId) — base do histórico na ficha e dos relatórios.
   */
  async setParticipants(travelId: string, dto: SetTravelParticipantsDto) {
    const travel = await this.findOne(travelId);
    const items = dto.participants ?? [];
    const normalized = this.normalizeParticipantItems(items);

    const playerIds = normalized
      .filter((p) => p.personType === 'player' && p.playerId)
      .map((p) => p.playerId!);
    const staffIds = normalized
      .filter((p) => p.personType === 'staff' && p.staffId)
      .map((p) => p.staffId!);

    if (playerIds.length > 0) {
      const players = await this.prisma.player.findMany({
        where: { id: { in: playerIds }, tenantId: travel.tenantId },
        select: { id: true },
      });
      if (players.length !== new Set(playerIds).size) {
        throw new BadRequestException(
          'Um ou mais atletas não pertencem a este clube ou não existem',
        );
      }
    }

    if (staffIds.length > 0) {
      const staff = await this.prisma.technicalStaff.findMany({
        where: { id: { in: staffIds }, tenantId: travel.tenantId },
        select: { id: true },
      });
      if (staff.length !== new Set(staffIds).size) {
        throw new BadRequestException(
          'Um ou mais membros da comissão não pertencem a este clube ou não existem',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.travelParticipant.deleteMany({
        where: { travelLogisticsId: travelId },
      });
      if (normalized.length === 0) return;
      await tx.travelParticipant.createMany({
        data: normalized.map((p, index) => ({
          travelLogisticsId: travelId,
          personType: p.personType,
          playerId: p.personType === 'player' ? p.playerId! : null,
          staffId: p.personType === 'staff' ? p.staffId! : null,
          guestName:
            p.personType === 'guest' ? (p.guestName ?? '').trim() || null : null,
          guestDocument:
            p.personType === 'guest'
              ? p.guestDocument?.trim() || null
              : null,
          notes: p.notes?.trim() || null,
          sortOrder: index,
        })),
      });
    });

    return this.listParticipants(travelId);
  }

  private normalizeParticipantItems(items: TravelParticipantItemDto[]) {
    const seenPlayers = new Set<string>();
    const seenStaff = new Set<string>();
    const out: TravelParticipantItemDto[] = [];

    for (const raw of items) {
      const personType = raw.personType;
      if (personType === 'player') {
        const playerId = raw.playerId?.trim();
        if (!playerId) {
          throw new BadRequestException('playerId é obrigatório para atleta');
        }
        if (seenPlayers.has(playerId)) continue;
        seenPlayers.add(playerId);
        out.push({ personType, playerId, notes: raw.notes });
        continue;
      }
      if (personType === 'staff') {
        const staffId = raw.staffId?.trim();
        if (!staffId) {
          throw new BadRequestException('staffId é obrigatório para comissão');
        }
        if (seenStaff.has(staffId)) continue;
        seenStaff.add(staffId);
        out.push({ personType, staffId, notes: raw.notes });
        continue;
      }
      if (personType === 'guest') {
        const guestName = raw.guestName?.trim();
        if (!guestName) {
          throw new BadRequestException('guestName é obrigatório para convidado');
        }
        out.push({
          personType,
          guestName,
          guestDocument: raw.guestDocument,
          notes: raw.notes,
        });
      }
    }
    return out;
  }

  async create(dto: CreateTravelLogisticsDto) {
    await this.ensureClubTenant(dto.tenantId);
    const catNorm = normalizeTravelCategoriesInput(dto.categories, dto.category);
    const data: Parameters<typeof this.prisma.travelLogistics.create>[0]['data'] =
      {
        tenantId: dto.tenantId,
        matchDate: new Date(dto.matchDate),
        status: dto.status ?? 'rascunho',
        category: catNorm.category,
        categories: catNorm.categories ?? undefined,
        opponentName: dto.opponentName ?? null,
        stadiumName: dto.stadiumName ?? null,
        city: dto.city ?? null,
        country: dto.country ?? null,
        championshipName: dto.championshipName ?? null,
        distanceKm: dto.distanceKm ?? null,
        transportType: dto.transportType ?? null,
        transportDetails: dto.transportDetails ?? null,
        estimatedDeparture: dto.estimatedDeparture
          ? new Date(dto.estimatedDeparture)
          : null,
        estimatedArrival: dto.estimatedArrival
          ? new Date(dto.estimatedArrival)
          : null,
        hotelName: dto.hotelName ?? null,
        hotelAddress: dto.hotelAddress ?? null,
        accommodationRooms: dto.accommodationRooms ?? undefined,
        mealPlan: dto.mealPlan ?? undefined,
        nutritionApprovedAt: dto.nutritionApprovedAt
          ? new Date(dto.nutritionApprovedAt)
          : null,
        nutritionApprovedBy: dto.nutritionApprovedBy ?? null,
        estimatedCostTotal: dto.estimatedCostTotal ?? null,
        estimatedCostBreakdown: dto.estimatedCostBreakdown ?? undefined,
        weatherForecast: dto.weatherForecast ?? null,
        notes: dto.notes ?? null,
      };
    return this.prisma.travelLogistics.create({
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateTravelLogisticsDto) {
    await this.findOne(id);
    const data: Parameters<typeof this.prisma.travelLogistics.update>[0]['data'] =
      {};
    if (dto.matchDate != null) data.matchDate = new Date(dto.matchDate);
    if (dto.estimatedDeparture != null)
      data.estimatedDeparture = new Date(dto.estimatedDeparture);
    if (dto.estimatedArrival != null)
      data.estimatedArrival = new Date(dto.estimatedArrival);
    if (dto.nutritionApprovedAt != null)
      data.nutritionApprovedAt = new Date(dto.nutritionApprovedAt);
    if (dto.categories !== undefined || dto.category !== undefined) {
      const catNorm = normalizeTravelCategoriesInput(dto.categories, dto.category);
      data.category = catNorm.category;
      data.categories = catNorm.categories ?? undefined;
    } else if (dto.category !== undefined) {
      data.category = dto.category ?? null;
    }
    if (dto.opponentName !== undefined)
      data.opponentName = dto.opponentName ?? null;
    if (dto.stadiumName !== undefined)
      data.stadiumName = dto.stadiumName ?? null;
    if (dto.city !== undefined) data.city = dto.city ?? null;
    if (dto.country !== undefined) data.country = dto.country ?? null;
    if (dto.championshipName !== undefined)
      data.championshipName = dto.championshipName ?? null;
    if (dto.distanceKm !== undefined) data.distanceKm = dto.distanceKm ?? null;
    if (dto.transportType !== undefined)
      data.transportType = dto.transportType ?? null;
    if (dto.transportDetails !== undefined)
      data.transportDetails = dto.transportDetails ?? null;
    if (dto.hotelName !== undefined) data.hotelName = dto.hotelName ?? null;
    if (dto.hotelAddress !== undefined)
      data.hotelAddress = dto.hotelAddress ?? null;
    if (dto.accommodationRooms !== undefined)
      data.accommodationRooms = dto.accommodationRooms ?? undefined;
    if (dto.mealPlan !== undefined) data.mealPlan = dto.mealPlan ?? undefined;
    if (dto.nutritionApprovedBy !== undefined)
      data.nutritionApprovedBy = dto.nutritionApprovedBy ?? null;
    if (dto.estimatedCostTotal !== undefined)
      data.estimatedCostTotal = dto.estimatedCostTotal ?? null;
    if (dto.estimatedCostBreakdown !== undefined)
      data.estimatedCostBreakdown =
        dto.estimatedCostBreakdown ?? undefined;
    if (dto.status !== undefined) data.status = dto.status ?? 'rascunho';
    if (dto.weatherForecast !== undefined)
      data.weatherForecast = dto.weatherForecast ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;

    return this.prisma.travelLogistics.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.travelLogistics.delete({ where: { id } });
  }
}
