import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import {
  deriveSalesStatus,
  pickCurrentLot,
  resolveTypeAvailability,
  type InventoryCounters,
  type LotRow,
  type TypeRow,
} from './boston-city-hall-ticketing.availability';
import { normalizeTicketingCurrency } from './boston-city-hall-ticketing-currency.constants';
import {
  BostonCityHallTicketInventoryService,
  type TicketInventoryMaps,
} from './boston-city-hall-ticket-inventory.service';
import type {
  EventTicketLotDto,
  EventTicketTypeDto,
  EventTicketingCapacityHintDto,
  EventTicketingDetailDto,
  EventTicketingEventListItemDto,
  EventTicketingPublicSnapshotDto,
} from './boston-city-hall-ticketing.constants';

function moneyToString(value: Prisma.Decimal | number | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

function parseMoney(value: number | string, field = 'Preço'): Prisma.Decimal {
  const n =
    typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) {
    throw new BadRequestException(`${field} inválido (use valor >= 0).`);
  }
  return new Prisma.Decimal(n.toFixed(2));
}

function parsePositiveInt(value: number | string, field: string): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new BadRequestException(`${field} inválido.`);
  }
  return n;
}

function parseOptionalPositiveInt(value: number | string | null | undefined, field: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new BadRequestException(`${field} deve ser positivo.`);
  }
  return n;
}

function parseOptionalDate(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Data inválida.');
  }
  return d;
}

const typeInclude = {
  lots: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
};

type TypeWithLots = Prisma.EventTicketTypeGetPayload<{ include: typeof typeInclude }>;

function countersFromMaps(
  maps: TicketInventoryMaps,
  inv: BostonCityHallTicketInventoryService,
): InventoryCounters {
  return {
    soldForType: (id) => inv.soldForType(maps, id),
    heldForType: (id) => inv.heldForType(maps, id),
    soldForLot: (id) => inv.soldForLot(maps, id),
    heldForLot: (id) => inv.heldForLot(maps, id),
  };
}

@Injectable()
export class BostonCityHallTicketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: BostonCityHallTicketInventoryService,
  ) {}

  private async countersForEvent(tenantId: string, eventId: string): Promise<InventoryCounters> {
    const maps = await this.inventory.loadForEvent(tenantId, eventId);
    return countersFromMaps(maps, this.inventory);
  }

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant do venue "${venueSlug}" não encontrado.`);
    }
    return tenant.id;
  }

  private async assertEventInTenant(eventId: string, tenantId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        ticketing: { select: { enabled: true, currency: true } },
        venueBooking: {
          select: {
            space: { select: { capacityStanding: true, capacitySeated: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    return event;
  }

  private toLotDto(
    lot: TypeWithLots['lots'][number],
    ticketTypeActive: boolean,
    currentLotId: string | null,
    counters: InventoryCounters,
  ): EventTicketLotDto {
    const sold = counters.soldForLot(lot.id);
    const held = counters.heldForLot(lot.id);
    const available = Math.max(0, lot.quantity - sold - held);
    const now = new Date();
    return {
      id: lot.id,
      ticketTypeId: lot.ticketTypeId,
      name: lot.name,
      price: moneyToString(lot.price)!,
      quantity: lot.quantity,
      active: lot.active,
      sortOrder: lot.sortOrder,
      salesStartAt: lot.salesStartAt?.toISOString() ?? null,
      salesEndAt: lot.salesEndAt?.toISOString() ?? null,
      sold,
      held,
      available,
      salesStatus: deriveSalesStatus({
        active: lot.active && ticketTypeActive,
        salesStartAt: lot.salesStartAt,
        salesEndAt: lot.salesEndAt,
        available,
        now,
      }),
      isCurrentLot: currentLotId === lot.id,
      createdAt: lot.createdAt.toISOString(),
      updatedAt: lot.updatedAt.toISOString(),
    };
  }

  private toTypeDto(row: TypeWithLots, counters: InventoryCounters): EventTicketTypeDto {
    const typeRow: TypeRow = {
      active: row.active,
      price: row.price,
      quantity: row.quantity,
      salesStartAt: row.salesStartAt,
      salesEndAt: row.salesEndAt,
      lots: row.lots.map((l) => ({ ...l, ticketTypeId: row.id })),
    };
    const avail = resolveTypeAvailability(typeRow, row.id, new Date(), counters);
    const lots = row.lots.map((l) => this.toLotDto(l, row.active, avail.currentLotId, counters));

    return {
      id: row.id,
      eventId: row.eventId,
      name: row.name,
      description: row.description,
      price: moneyToString(row.price),
      quantity: row.quantity,
      purchaseLimit: row.purchaseLimit,
      active: row.active,
      sortOrder: row.sortOrder,
      salesStartAt: row.salesStartAt?.toISOString() ?? null,
      salesEndAt: row.salesEndAt?.toISOString() ?? null,
      usesLots: avail.usesLots,
      currentPrice: moneyToString(avail.currentPrice),
      capacity: avail.capacity,
      sold: avail.sold,
      held: avail.held,
      available: avail.available,
      salesStatus: avail.salesStatus,
      lots,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private computeCapacityHint(
    types: EventTicketTypeDto[],
    standing: number | null,
    seated: number | null,
  ): EventTicketingCapacityHintDto | null {
    const configuredTotal = types
      .filter((t) => t.active)
      .reduce((sum, t) => {
        if (t.usesLots) {
          return sum + t.lots.filter((l) => l.active).reduce((s, l) => s + l.quantity, 0);
        }
        return sum + (t.quantity ?? 0);
      }, 0);

    const venueCap = Math.max(standing ?? 0, seated ?? 0);
    if (venueCap <= 0) {
      return {
        configuredTotal,
        venueCapacityStanding: standing,
        venueCapacitySeated: seated,
        exceedsVenueCapacity: false,
        message: null,
      };
    }

    const exceeds = configuredTotal > venueCap;
    return {
      configuredTotal,
      venueCapacityStanding: standing,
      venueCapacitySeated: seated,
      exceedsVenueCapacity: exceeds,
      message: exceeds
        ? `A soma configurada (${configuredTotal}) excede a capacidade do espaço (${venueCap}). Revise quantidades — isso não bloqueia o cadastro.`
        : null,
    };
  }

  async listEvents(): Promise<EventTicketingEventListItemDto[]> {
    const tenantId = await this.resolveTenantId();
    const rows = await this.prisma.event.findMany({
      where: { tenantId },
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        startDate: true,
        endDate: true,
        ticketing: { select: { enabled: true, currency: true } },
      },
    });
    return rows.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      status: e.status,
      startDate: e.startDate?.toISOString() ?? null,
      endDate: e.endDate?.toISOString() ?? null,
      ticketingEnabled: e.ticketing?.enabled ?? false,
    }));
  }

  async getEventTicketing(eventId: string): Promise<EventTicketingDetailDto> {
    const tenantId = await this.resolveTenantId();
    const event = await this.assertEventInTenant(eventId, tenantId);

    const types = await this.prisma.eventTicketType.findMany({
      where: { tenantId, eventId },
      include: typeInclude,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const maps = await this.inventory.loadForEvent(tenantId, eventId);
    const counters = countersFromMaps(maps, this.inventory);
    const typeDtos = types.map((t) => this.toTypeDto(t, counters));
    const space = event.venueBooking?.space;
    const capacityHint = this.computeCapacityHint(
      typeDtos,
      space?.capacityStanding ?? null,
      space?.capacitySeated ?? null,
    );

    return {
      eventId: event.id,
      eventName: event.name,
      eventSlug: event.slug,
      eventStatus: event.status,
      ticketingEnabled: event.ticketing?.enabled ?? false,
      currency: normalizeTicketingCurrency(event.ticketing?.currency),
      types: typeDtos,
      capacityHint,
    };
  }

  async setTicketingEnabled(
    eventId: string,
    enabled: boolean,
    currency?: string,
  ): Promise<{ enabled: boolean; currency: string }> {
    const tenantId = await this.resolveTenantId();
    await this.assertEventInTenant(eventId, tenantId);

    const currencyNorm = currency !== undefined ? normalizeTicketingCurrency(currency) : undefined;

    const row = await this.prisma.eventTicketing.upsert({
      where: { eventId },
      create: {
        tenantId,
        eventId,
        enabled,
        currency: currencyNorm ?? normalizeTicketingCurrency(undefined),
      },
      update: {
        enabled,
        ...(currencyNorm !== undefined ? { currency: currencyNorm } : {}),
      },
    });
    return { enabled: row.enabled, currency: row.currency };
  }

  async createTicketType(
    eventId: string,
    dto: {
      name: string;
      description?: string;
      price?: number | string;
      quantity?: number | string;
      purchaseLimit?: number | string | null;
      active?: boolean;
      sortOrder?: number;
      salesStartAt?: string | null;
      salesEndAt?: string | null;
    },
  ): Promise<EventTicketTypeDto> {
    const tenantId = await this.resolveTenantId();
    await this.assertEventInTenant(eventId, tenantId);

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Nome é obrigatório.');

    const row = await this.prisma.eventTicketType.create({
      data: {
        tenantId,
        eventId,
        name,
        description: dto.description?.trim() || null,
        price: dto.price !== undefined && dto.price !== '' ? parseMoney(dto.price) : null,
        quantity:
          dto.quantity !== undefined && dto.quantity !== ''
            ? parsePositiveInt(dto.quantity, 'Quantidade')
            : null,
        purchaseLimit: parseOptionalPositiveInt(dto.purchaseLimit, 'Limite por compra'),
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
        salesStartAt: parseOptionalDate(dto.salesStartAt),
        salesEndAt: parseOptionalDate(dto.salesEndAt),
      },
      include: typeInclude,
    });
    const counters = await this.countersForEvent(tenantId, eventId);
    return this.toTypeDto(row, counters);
  }

  async updateTicketType(
    id: string,
    dto: Partial<{
      name: string;
      description: string | null;
      price: number | string | null;
      quantity: number | string | null;
      purchaseLimit: number | string | null;
      active: boolean;
      sortOrder: number;
      salesStartAt: string | null;
      salesEndAt: string | null;
    }>,
  ): Promise<EventTicketTypeDto> {
    const tenantId = await this.resolveTenantId();
    const existing = await this.prisma.eventTicketType.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { lots: true } } },
    });
    if (!existing) throw new NotFoundException('Tipo de ingresso não encontrado.');

    const data: Prisma.EventTicketTypeUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome é obrigatório.');
      data.name = name;
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.salesStartAt !== undefined) data.salesStartAt = parseOptionalDate(dto.salesStartAt);
    if (dto.salesEndAt !== undefined) data.salesEndAt = parseOptionalDate(dto.salesEndAt);
    if (dto.purchaseLimit !== undefined) {
      data.purchaseLimit = parseOptionalPositiveInt(dto.purchaseLimit, 'Limite por compra');
    }

    if (existing._count.lots > 0) {
      if (dto.price !== undefined || dto.quantity !== undefined) {
        throw new BadRequestException(
          'Tipo com lotes: ajuste preço e quantidade nos lotes, não no tipo.',
        );
      }
    } else {
      if (dto.price !== undefined) {
        data.price = dto.price === null || dto.price === '' ? null : parseMoney(dto.price);
      }
      if (dto.quantity !== undefined) {
        data.quantity =
          dto.quantity === null || dto.quantity === ''
            ? null
            : parsePositiveInt(dto.quantity, 'Quantidade');
      }
    }

    const row = await this.prisma.eventTicketType.update({
      where: { id },
      data,
      include: typeInclude,
    });
    const counters = await this.countersForEvent(tenantId, row.eventId);
    return this.toTypeDto(row, counters);
  }

  async createLot(
    ticketTypeId: string,
    dto: {
      name: string;
      price: number | string;
      quantity: number | string;
      active?: boolean;
      sortOrder?: number;
      salesStartAt?: string | null;
      salesEndAt?: string | null;
    },
  ): Promise<EventTicketTypeDto> {
    const tenantId = await this.resolveTenantId();
    const type = await this.prisma.eventTicketType.findFirst({
      where: { id: ticketTypeId, tenantId },
    });
    if (!type) throw new NotFoundException('Tipo de ingresso não encontrado.');

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Nome do lote é obrigatório.');

    await this.prisma.eventTicketLot.create({
      data: {
        ticketTypeId,
        name,
        price: parseMoney(dto.price),
        quantity: parsePositiveInt(dto.quantity, 'Quantidade'),
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
        salesStartAt: parseOptionalDate(dto.salesStartAt),
        salesEndAt: parseOptionalDate(dto.salesEndAt),
      },
    });

    const row = await this.prisma.eventTicketType.findFirstOrThrow({
      where: { id: ticketTypeId },
      include: typeInclude,
    });
    const counters = await this.countersForEvent(tenantId, row.eventId);
    return this.toTypeDto(row, counters);
  }

  async updateLot(
    lotId: string,
    dto: Partial<{
      name: string;
      price: number | string;
      quantity: number | string;
      active: boolean;
      sortOrder: number;
      salesStartAt: string | null;
      salesEndAt: string | null;
    }>,
  ): Promise<EventTicketTypeDto> {
    const tenantId = await this.resolveTenantId();
    const lot = await this.prisma.eventTicketLot.findFirst({
      where: { id: lotId, ticketType: { tenantId } },
      select: { id: true, ticketTypeId: true },
    });
    if (!lot) throw new NotFoundException('Lote não encontrado.');

    const data: Prisma.EventTicketLotUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome do lote é obrigatório.');
      data.name = name;
    }
    if (dto.price !== undefined) data.price = parseMoney(dto.price);
    if (dto.quantity !== undefined) data.quantity = parsePositiveInt(dto.quantity, 'Quantidade');
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.salesStartAt !== undefined) data.salesStartAt = parseOptionalDate(dto.salesStartAt);
    if (dto.salesEndAt !== undefined) data.salesEndAt = parseOptionalDate(dto.salesEndAt);

    await this.prisma.eventTicketLot.update({ where: { id: lotId }, data });

    const row = await this.prisma.eventTicketType.findFirstOrThrow({
      where: { id: lot.ticketTypeId },
      include: typeInclude,
    });
    const counters = await this.countersForEvent(tenantId, row.eventId);
    return this.toTypeDto(row, counters);
  }

  /** Uso futuro: vitrine/checkout — não exposto publicamente na Fase 2.1. */
  async buildPublicSnapshot(eventId: string): Promise<EventTicketingPublicSnapshotDto | null> {
    const tenantId = await this.resolveTenantId();
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        ticketing: { select: { enabled: true, currency: true } },
      },
    });
    if (!event?.ticketing?.enabled) return null;

    const detail = await this.getEventTicketing(eventId);
    return {
      eventId: event.id,
      eventName: event.name,
      eventSlug: event.slug,
      ticketingEnabled: true,
      types: detail.types
        .filter((t) => t.active)
        .map((t) => {
          let currentLot: { id: string; name: string; price: string } | null = null;
          if (t.usesLots) {
            const picked = pickCurrentLot(
              t.lots.map((l) => ({
                id: l.id,
                name: l.name,
                price: new Prisma.Decimal(l.price),
                quantity: l.quantity,
                active: l.active,
                sortOrder: l.sortOrder,
                salesStartAt: l.salesStartAt ? new Date(l.salesStartAt) : null,
                salesEndAt: l.salesEndAt ? new Date(l.salesEndAt) : null,
              })),
            );
            if (picked) {
              currentLot = {
                id: picked.lot.id,
                name: picked.lot.name,
                price: moneyToString(picked.lot.price)!,
              };
            }
          }
          return {
            id: t.id,
            name: t.name,
            description: t.description,
            purchaseLimit: t.purchaseLimit,
            currentPrice: t.currentPrice,
            sold: t.sold,
            held: t.held,
            available: t.available,
            salesStatus: t.salesStatus,
            currentLot,
          };
        }),
    };
  }
}
