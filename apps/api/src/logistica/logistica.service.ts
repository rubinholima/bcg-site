import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { CreateTravelLogisticsDto } from './dto/create-travel-logistics.dto';
import { UpdateTravelLogisticsDto } from './dto/update-travel-logistics.dto';

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
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.travelLogistics.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!item) throw new NotFoundException('Planejamento não encontrado');
    return item;
  }

  async create(dto: CreateTravelLogisticsDto) {
    await this.ensureClubTenant(dto.tenantId);
    const data: Parameters<typeof this.prisma.travelLogistics.create>[0]['data'] =
      {
        tenantId: dto.tenantId,
        matchDate: new Date(dto.matchDate),
        status: dto.status ?? 'rascunho',
        category: dto.category ?? null,
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
    if (dto.category !== undefined) data.category = dto.category ?? null;
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
