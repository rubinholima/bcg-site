import type { EventTicketingSalesStatus } from './boston-city-hall-ticketing.constants';

/**
 * Regra de publicação — eventos na vitrine pública BCH (Phase 3.1)
 *
 * Um evento aparece em GET /public/boston-city-hall/events* somente se:
 * - tenant.slug === BCH_VENUE_SLUG (`boston-city-hall`), resolvido no servidor (nunca via query do cliente);
 * - Event.organizer === 'tenant' e Event.tenantId === id desse tenant;
 * - Event.status === 'published' (mecanismo canônico existente; draft/archived ficam fora);
 * - filtros temporais opcionais: upcoming (padrão) ou past (?past=1), alinhados a findPublishedForPublic.
 *
 * Não há campo extra de “publicação BCH”: usa-se status published + escopo do tenant venue.
 */

export const BCH_PUBLIC_VENUE_DISPLAY_NAME = 'Boston City Hall';

export type BchPublicTicketAvailability =
  | 'AVAILABLE'
  | 'LOW_AVAILABILITY'
  | 'SOLD_OUT'
  | 'NOT_YET_ON_SALE'
  | 'SALES_ENDED'
  | 'NO_TICKETING';

export const BCH_PUBLIC_TICKET_AVAILABILITY_LABEL: Record<BchPublicTicketAvailability, string> = {
  AVAILABLE: 'Disponível',
  LOW_AVAILABILITY: 'Últimos ingressos',
  SOLD_OUT: 'Esgotado',
  NOT_YET_ON_SALE: 'Venda em breve',
  SALES_ENDED: 'Vendas encerradas',
  NO_TICKETING: 'Sem venda online',
};

/** Limiar relativo para “últimos ingressos” quando em venda. */
export const BCH_LOW_AVAILABILITY_RATIO = 0.15;
export const BCH_LOW_AVAILABILITY_ABSOLUTE = 10;

export type BchPublicEventListItemDto = {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  locationLabel: string | null;
  detailPath: string;
  ticketingEnabled: boolean;
  ticketAvailability: BchPublicTicketAvailability;
};

export type BchPublicTicketLotDto = {
  ticketLotId: string;
  name: string;
  price: string;
  salesStartAt: string | null;
  salesEndAt: string | null;
  availability: BchPublicTicketAvailability;
};

export type BchPublicTicketTypeDto = {
  ticketTypeId: string;
  name: string;
  description: string | null;
  price: string | null;
  currency: string;
  purchaseLimit: number | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
  availability: BchPublicTicketAvailability;
  currentLot: BchPublicTicketLotDto | null;
};

export type BchPublicEventDetailDto = BchPublicEventListItemDto & {
  content: {
    theme?: Record<string, unknown>;
    blocks?: Array<{
      id: string;
      type: string;
      sortOrder: number;
      config?: Record<string, unknown>;
    }>;
  };
  ticketing: {
    enabled: boolean;
    currency: string;
    types: BchPublicTicketTypeDto[];
  } | null;
};

export function mapSalesStatusToPublicAvailability(input: {
  salesStatus: EventTicketingSalesStatus;
  available: number;
  capacity: number;
}): BchPublicTicketAvailability {
  const { salesStatus, available, capacity } = input;
  if (salesStatus === 'not_started' || salesStatus === 'inactive') return 'NOT_YET_ON_SALE';
  if (salesStatus === 'ended') return 'SALES_ENDED';
  if (salesStatus === 'sold_out' || available <= 0) return 'SOLD_OUT';
  if (salesStatus === 'on_sale') {
    if (capacity > 0) {
      const ratio = available / capacity;
      if (ratio <= BCH_LOW_AVAILABILITY_RATIO || available <= BCH_LOW_AVAILABILITY_ABSOLUTE) {
        return 'LOW_AVAILABILITY';
      }
    } else if (available <= BCH_LOW_AVAILABILITY_ABSOLUTE) {
      return 'LOW_AVAILABILITY';
    }
    return 'AVAILABLE';
  }
  return 'NOT_YET_ON_SALE';
}

export function summarizeTicketAvailability(
  states: BchPublicTicketAvailability[],
  ticketingEnabled: boolean,
): BchPublicTicketAvailability {
  if (!ticketingEnabled || states.length === 0) return 'NO_TICKETING';
  const rank: Record<BchPublicTicketAvailability, number> = {
    AVAILABLE: 5,
    LOW_AVAILABILITY: 4,
    NOT_YET_ON_SALE: 3,
    SALES_ENDED: 2,
    SOLD_OUT: 1,
    NO_TICKETING: 0,
  };
  let best: BchPublicTicketAvailability = 'SOLD_OUT';
  for (const s of states) {
    if (rank[s] > rank[best]) best = s;
  }
  return best;
}

export function bchPublicDetailPath(slug: string): string {
  return `/portfolio/boston-city-hall/events/${encodeURIComponent(slug)}`;
}

export function bchPublicCheckoutPath(eventSlug: string): string {
  return `/portfolio/boston-city-hall/events/${encodeURIComponent(eventSlug)}/checkout`;
}

export function bchPublicOrderPath(publicAccessToken: string): string {
  return `/portfolio/boston-city-hall/orders/${encodeURIComponent(publicAccessToken)}`;
}

export function bchPublicMyTicketsPath(): string {
  return '/portfolio/boston-city-hall/my-tickets';
}
