import type { Prisma } from '@prisma/client';
import type { EventTicketTypeDto } from './boston-city-hall-ticketing.constants';
import {
  BCH_PUBLIC_VENUE_DISPLAY_NAME,
  type BchPublicEventListItemDto,
  type BchPublicTicketAvailability,
  type BchPublicTicketLotDto,
  type BchPublicTicketTypeDto,
  bchPublicDetailPath,
  mapSalesStatusToPublicAvailability,
  summarizeTicketAvailability,
} from './boston-city-hall-public-events.constants';

export function startOfTodayLocal(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Upcoming: mesma lógica de EventsService.findPublishedForPublic. */
export function upcomingPublishedWhere(tenantId: string): Prisma.EventWhereInput {
  const today = startOfTodayLocal();
  return {
    tenantId,
    organizer: 'tenant',
    status: 'published',
    OR: [
      { endDate: { gte: today } },
      { endDate: null, startDate: { gte: today } },
      { endDate: null, startDate: null },
      { endDate: null, startDate: { lte: today } },
    ],
  };
}

/** Passados: evento já encerrou antes de hoje. */
export function pastPublishedWhere(tenantId: string): Prisma.EventWhereInput {
  const today = startOfTodayLocal();
  return {
    tenantId,
    organizer: 'tenant',
    status: 'published',
    OR: [
      { endDate: { lt: today } },
      { endDate: null, startDate: { lt: today } },
    ],
  };
}

export function formatLocationLabel(spaceName: string | null | undefined): string | null {
  if (!spaceName?.trim()) return BCH_PUBLIC_VENUE_DISPLAY_NAME;
  return `${BCH_PUBLIC_VENUE_DISPLAY_NAME} — ${spaceName.trim()}`;
}

export function toPublicTicketType(
  type: EventTicketTypeDto,
  currency: string,
): BchPublicTicketTypeDto | null {
  if (!type.active) return null;

  const availability = mapSalesStatusToPublicAvailability({
    salesStatus: type.salesStatus,
    available: type.available,
    capacity: type.capacity,
  });

  let currentLot: BchPublicTicketLotDto | null = null;
  let salesStartAt = type.salesStartAt;
  let salesEndAt = type.salesEndAt;

  if (type.usesLots) {
    const lot = type.lots.find((l) => l.isCurrentLot) ?? type.lots.find((l) => l.active);
    if (lot) {
      const lotAvailability = mapSalesStatusToPublicAvailability({
        salesStatus: lot.salesStatus,
        available: lot.available,
        capacity: lot.quantity,
      });
      currentLot = {
        name: lot.name,
        price: lot.price,
        salesStartAt: lot.salesStartAt,
        salesEndAt: lot.salesEndAt,
        availability: lotAvailability,
      };
      salesStartAt = lot.salesStartAt;
      salesEndAt = lot.salesEndAt;
    }
  }

  return {
    name: type.name,
    description: type.description,
    price: type.currentPrice,
    currency,
    salesStartAt,
    salesEndAt,
    availability,
    currentLot,
  };
}

export function listItemFromEventRow(input: {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  startDate: Date | null;
  endDate: Date | null;
  spaceName: string | null | undefined;
  ticketingEnabled: boolean;
  ticketTypes: EventTicketTypeDto[];
  currency: string;
}): BchPublicEventListItemDto {
  const publicTypes = input.ticketTypes
    .map((t) => toPublicTicketType(t, input.currency))
    .filter((t): t is BchPublicTicketTypeDto => t !== null);

  const ticketAvailability = summarizeTicketAvailability(
    publicTypes.map((t) => t.availability),
    input.ticketingEnabled,
  );

  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    logoUrl: input.logoUrl,
    startDate: input.startDate?.toISOString() ?? null,
    endDate: input.endDate?.toISOString() ?? null,
    locationLabel: formatLocationLabel(input.spaceName),
    detailPath: bchPublicDetailPath(input.slug),
    ticketingEnabled: input.ticketingEnabled,
    ticketAvailability,
  };
}

/** Garante que payloads públicos não carregam chaves internas conhecidas. */
export function assertNoInternalPublicKeys(payload: unknown): void {
  const forbidden = [
    'tenantId',
    'eventId',
    'sold',
    'held',
    'customerEmail',
    'guestName',
    'orderNumber',
    'notes',
    'competitionFormat',
    'createdAt',
    'updatedAt',
  ];
  const json = JSON.stringify(payload);
  for (const key of forbidden) {
    if (json.includes(`"${key}"`)) {
      throw new Error(`Campo interno "${key}" vazou na resposta pública BCH.`);
    }
  }
}
