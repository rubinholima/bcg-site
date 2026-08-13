import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { normalizeTravelCategoriesInput } from '../futebol-agenda/travel-categories.util';
import { parseDateOnlyBrazil, parseDateTimeBrazil } from '../common/brazil-time.util';
import { CreateTravelLogisticsDto } from './dto/create-travel-logistics.dto';
import { UpdateTravelLogisticsDto } from './dto/update-travel-logistics.dto';
import {
  SetTravelParticipantsDto,
  TravelParticipantItemDto,
} from './dto/set-travel-participants.dto';
import { dedupeTravelLogisticsList } from './travel-logistics-dedup.util';

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
  logisticsGuest: {
    select: {
      id: true,
      name: true,
      cpf: true,
      rg: true,
      phone: true,
      passport: true,
      birthDate: true,
    },
  },
} as const;

type LogisticsCadastrosPayload = Record<string, string | null | undefined> | undefined;

function normalizeLogisticsCadastros(
  raw: LogisticsCadastrosPayload,
): Record<string, string | null> | null {
  if (raw === undefined) return null;
  if (raw === null || typeof raw !== 'object') return null;
  const keys = [
    'hotelId',
    'transportCompanyId',
    'usageMomentId',
    'loyaltyProgramId',
    'paymentTypeId',
    'destinationId',
    'departureAirportId',
    'arrivalAirportId',
    'supplierId',
  ] as const;
  const out: Record<string, string | null> = {};
  for (const key of keys) {
    const v = raw[key];
    out[key] = typeof v === 'string' && v.trim() ? v.trim() : null;
  }
  return out;
}

type ExpenseLineRaw = {
  id?: string;
  kind?: 'previsto' | 'adicional';
  expenseCategoryId?: string | null;
  serviceProductId?: string | null;
  supplierId?: string | null;
  paymentTypeId?: string | null;
  description?: string;
  amount?: number | null;
  receiptUrl?: string | null;
};

function normalizeExpenseKind(value: unknown): 'previsto' | 'adicional' {
  return value === 'adicional' ? 'adicional' : 'previsto';
}

function normalizeExpenseLines(
  raw: ExpenseLineRaw[] | null | undefined,
): ExpenseLineRaw[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === 'object')
    .map((row, i) => ({
      id:
        typeof row.id === 'string' && row.id.trim()
          ? row.id.trim()
          : `line-${i}`,
      kind: normalizeExpenseKind(row.kind),
      expenseCategoryId:
        typeof row.expenseCategoryId === 'string' && row.expenseCategoryId.trim()
          ? row.expenseCategoryId.trim()
          : null,
      serviceProductId:
        typeof row.serviceProductId === 'string' && row.serviceProductId.trim()
          ? row.serviceProductId.trim()
          : null,
      supplierId:
        typeof row.supplierId === 'string' && row.supplierId.trim()
          ? row.supplierId.trim()
          : null,
      paymentTypeId:
        typeof row.paymentTypeId === 'string' && row.paymentTypeId.trim()
          ? row.paymentTypeId.trim()
          : null,
      description:
        typeof row.description === 'string' ? row.description.trim() : '',
      amount:
        typeof row.amount === 'number' && Number.isFinite(row.amount)
          ? row.amount
          : null,
      receiptUrl:
        typeof row.receiptUrl === 'string' && row.receiptUrl.trim()
          ? row.receiptUrl.trim()
          : null,
    }));
}

function normalizePointOfInterestIds(
  raw: string[] | null | undefined,
): string[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && !!id.trim());
}

function mergeBeatscodeMeta(
  existing: unknown,
  patch: {
    logisticsCadastros?: Record<string, string | null> | null;
    expenseLines?: ExpenseLineRaw[] | null;
    pointOfInterestIds?: string[] | null;
  },
): unknown {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  if (patch.logisticsCadastros !== undefined) {
    if (patch.logisticsCadastros === null) {
      delete base.logisticsCadastros;
    } else {
      const hasAny = Object.values(patch.logisticsCadastros).some(Boolean);
      if (!hasAny) delete base.logisticsCadastros;
      else base.logisticsCadastros = patch.logisticsCadastros;
    }
  }

  if (patch.expenseLines !== undefined) {
    if (!patch.expenseLines?.length) delete base.expenseLines;
    else base.expenseLines = patch.expenseLines;
  }

  if (patch.pointOfInterestIds !== undefined) {
    if (!patch.pointOfInterestIds?.length) delete base.pointOfInterestIds;
    else base.pointOfInterestIds = patch.pointOfInterestIds;
  }

  return Object.keys(base).length ? base : undefined;
}

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
      if (fromDate) {
        // YYYY-MM-DD no fuso de Brasília (evita cortar o dia atual por UTC)
        (where.matchDate as Record<string, Date>).gte = fromDate.includes('T')
          ? new Date(fromDate)
          : new Date(`${fromDate}T00:00:00.000-03:00`);
      }
      if (toDate) {
        (where.matchDate as Record<string, Date>).lte = toDate.includes('T')
          ? new Date(toDate)
          : new Date(`${toDate}T23:59:59.999-03:00`);
      }
    }
    return dedupeTravelLogisticsList(
      await this.prisma.travelLogistics.findMany({
      where,
      orderBy: [{ matchDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        _count: { select: { participants: true } },
      },
    }),
    );
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

    const guestIds = normalized
      .filter((p) => p.personType === 'guest' && p.logisticsGuestId)
      .map((p) => p.logisticsGuestId!);
    const guestMap = new Map<
      string,
      {
        id: string;
        name: string;
        cpf: string | null;
        rg: string | null;
      }
    >();
    if (guestIds.length > 0) {
      const guests = await this.prisma.logisticsGuest.findMany({
        where: {
          id: { in: guestIds },
          tenantId: travel.tenantId,
          active: true,
        },
        select: { id: true, name: true, cpf: true, rg: true },
      });
      if (guests.length !== new Set(guestIds).size) {
        throw new BadRequestException(
          'Um ou mais convidados não pertencem a este clube ou não existem',
        );
      }
      for (const g of guests) guestMap.set(g.id, g);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.travelParticipant.deleteMany({
        where: { travelLogisticsId: travelId },
      });
      if (normalized.length === 0) return;
      await tx.travelParticipant.createMany({
        data: normalized.map((p, index) => {
          if (p.personType === 'guest' && p.logisticsGuestId) {
            const g = guestMap.get(p.logisticsGuestId)!;
            return {
              travelLogisticsId: travelId,
              personType: 'guest',
              playerId: null,
              staffId: null,
              logisticsGuestId: g.id,
              guestName: g.name,
              guestDocument: g.cpf ?? g.rg ?? null,
              notes: p.notes?.trim() || null,
              sortOrder: index,
            };
          }
          return {
            travelLogisticsId: travelId,
            personType: p.personType,
            playerId: p.personType === 'player' ? p.playerId! : null,
            staffId: p.personType === 'staff' ? p.staffId! : null,
            logisticsGuestId: null,
            guestName:
              p.personType === 'guest' ? (p.guestName ?? '').trim() || null : null,
            guestDocument:
              p.personType === 'guest'
                ? p.guestDocument?.trim() || null
                : null,
            notes: p.notes?.trim() || null,
            sortOrder: index,
          };
        }),
      });
    });

    return this.listParticipants(travelId);
  }

  private normalizeParticipantItems(items: TravelParticipantItemDto[]) {
    const seenPlayers = new Set<string>();
    const seenStaff = new Set<string>();
    const seenGuests = new Set<string>();
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
        const logisticsGuestId = raw.logisticsGuestId?.trim();
        if (logisticsGuestId) {
          if (seenGuests.has(logisticsGuestId)) continue;
          seenGuests.add(logisticsGuestId);
          out.push({ personType, logisticsGuestId, notes: raw.notes });
          continue;
        }
        const guestName = raw.guestName?.trim();
        if (!guestName) {
          throw new BadRequestException(
            'Selecione um convidado cadastrado ou informe o nome',
          );
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

  private async applyLogisticsCadastrosToTravelData(
    data: Parameters<typeof this.prisma.travelLogistics.create>[0]['data'],
    logisticsCadastros: Record<string, string | null> | null,
  ) {
    if (!logisticsCadastros) return;
    if (logisticsCadastros.hotelId) {
      const hotel = await this.prisma.logisticsHotel.findUnique({
        where: { id: logisticsCadastros.hotelId },
      });
      if (hotel) {
        data.hotelName = hotel.name;
        const addressParts = [
          hotel.address,
          hotel.city,
          hotel.state,
          hotel.country,
        ].filter(Boolean);
        data.hotelAddress = addressParts.length
          ? addressParts.join(' — ')
          : null;
      }
    }
    if (logisticsCadastros.destinationId && !data.city) {
      const dest = await this.prisma.logisticsDestination.findUnique({
        where: { id: logisticsCadastros.destinationId },
      });
      if (dest) data.city = dest.name;
    }
  }

  async create(dto: CreateTravelLogisticsDto) {
    await this.ensureClubTenant(dto.tenantId);
    const catNorm = normalizeTravelCategoriesInput(dto.categories, dto.category);
    const logisticsCadastros = normalizeLogisticsCadastros(dto.logisticsCadastros);
    const expenseLines = normalizeExpenseLines(dto.expenseLines);
    const pointOfInterestIds = normalizePointOfInterestIds(dto.pointOfInterestIds);
    const data: Parameters<typeof this.prisma.travelLogistics.create>[0]['data'] =
      {
        tenantId: dto.tenantId,
        matchDate: parseDateOnlyBrazil(dto.matchDate),
        isHomeMatch: dto.isHomeMatch ?? false,
        externalId: dto.externalId?.trim() || null,
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
        estimatedDeparture: parseDateTimeBrazil(dto.estimatedDeparture),
        estimatedArrival: parseDateTimeBrazil(dto.estimatedArrival),
        hotelName: dto.hotelName ?? null,
        hotelAddress: dto.hotelAddress ?? null,
        accommodationRooms: dto.accommodationRooms ?? undefined,
        mealPlan: dto.mealPlan ?? undefined,
        nutritionApprovedAt: parseDateTimeBrazil(dto.nutritionApprovedAt),
        nutritionApprovedBy: dto.nutritionApprovedBy ?? null,
        estimatedCostTotal: dto.estimatedCostTotal ?? null,
        estimatedCostBreakdown: dto.estimatedCostBreakdown ?? undefined,
        weatherForecast: dto.weatherForecast ?? null,
        notes: dto.notes ?? null,
        itinerary: dto.itinerary ?? undefined,
        hotelStay: dto.hotelStay ?? undefined,
        uniforms: dto.uniforms ?? undefined,
        beatscodeMeta: mergeBeatscodeMeta(undefined, {
          logisticsCadastros,
          expenseLines,
          pointOfInterestIds,
        }) as
          | Parameters<typeof this.prisma.travelLogistics.create>[0]['data']['beatscodeMeta']
          | undefined,
      };
    await this.applyLogisticsCadastrosToTravelData(data, logisticsCadastros);
    return this.prisma.travelLogistics.create({
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateTravelLogisticsDto) {
    const existing = await this.findOne(id);
    const data: Parameters<typeof this.prisma.travelLogistics.update>[0]['data'] =
      {};
    if (dto.matchDate != null) data.matchDate = parseDateOnlyBrazil(dto.matchDate);
    if (dto.isHomeMatch !== undefined) data.isHomeMatch = dto.isHomeMatch;
    if (dto.estimatedDeparture != null)
      data.estimatedDeparture = parseDateTimeBrazil(dto.estimatedDeparture);
    if (dto.estimatedArrival != null)
      data.estimatedArrival = parseDateTimeBrazil(dto.estimatedArrival);
    if (dto.nutritionApprovedAt != null)
      data.nutritionApprovedAt = parseDateTimeBrazil(dto.nutritionApprovedAt);
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
    if (dto.itinerary !== undefined) data.itinerary = dto.itinerary ?? undefined;
    if (dto.hotelStay !== undefined) data.hotelStay = dto.hotelStay ?? undefined;
    if (dto.uniforms !== undefined) data.uniforms = dto.uniforms ?? undefined;

    const logisticsCadastros =
      dto.logisticsCadastros !== undefined
        ? normalizeLogisticsCadastros(dto.logisticsCadastros)
        : undefined;
    const expenseLines =
      dto.expenseLines !== undefined
        ? normalizeExpenseLines(dto.expenseLines)
        : undefined;
    const pointOfInterestIds =
      dto.pointOfInterestIds !== undefined
        ? normalizePointOfInterestIds(dto.pointOfInterestIds)
        : undefined;

    if (
      logisticsCadastros !== undefined ||
      expenseLines !== undefined ||
      pointOfInterestIds !== undefined
    ) {
      data.beatscodeMeta = mergeBeatscodeMeta(existing.beatscodeMeta, {
        ...(logisticsCadastros !== undefined ? { logisticsCadastros } : {}),
        ...(expenseLines !== undefined ? { expenseLines } : {}),
        ...(pointOfInterestIds !== undefined ? { pointOfInterestIds } : {}),
      }) as Parameters<
        typeof this.prisma.travelLogistics.update
      >[0]['data']['beatscodeMeta'];
      if (logisticsCadastros !== undefined) {
        await this.applyLogisticsCadastrosToTravelData(
          data as Parameters<
            typeof this.prisma.travelLogistics.create
          >[0]['data'],
          logisticsCadastros,
        );
      }
    }

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
