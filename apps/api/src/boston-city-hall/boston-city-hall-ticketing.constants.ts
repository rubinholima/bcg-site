/**
 * BCH Event Ticketing — Fase 2.1
 *
 * Modos de preço/quantidade:
 * - TIPO SEM LOTES (_count.lots === 0): `price` e `quantity` no EventTicketType.
 * - TIPO COM LOTES: preço/capacidade vêm do lote vendável atual (ver pickCurrentLot).
 *
 * Lote vendável (determinístico):
 * - Lotes ativos, ordenados por sortOrder asc, depois id asc.
 * - Dentro da janela salesStartAt/salesEndAt (null = sem limite).
 * - available = quantity - sold - held (sold/held = 0 até Fase 2.2; depois atualização transacional no backend).
 *
 * Disponibilidade futura: Orders/holds incrementam `held`/`sold` em transação — não confiar no frontend.
 */

export type EventTicketingSalesStatus =
  | 'inactive'
  | 'not_started'
  | 'ended'
  | 'sold_out'
  | 'on_sale';

export const EVENT_TICKETING_SALES_STATUS_LABEL: Record<EventTicketingSalesStatus, string> = {
  inactive: 'Inativo',
  not_started: 'Venda não iniciada',
  ended: 'Venda encerrada',
  sold_out: 'Esgotado',
  on_sale: 'Em venda',
};

export type EventTicketingEventListItemDto = {
  id: string;
  name: string;
  slug: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  ticketingEnabled: boolean;
};

export type EventTicketingCapacityHintDto = {
  configuredTotal: number;
  venueCapacityStanding: number | null;
  venueCapacitySeated: number | null;
  exceedsVenueCapacity: boolean;
  message: string | null;
};

export type EventTicketLotDto = {
  id: string;
  ticketTypeId: string;
  name: string;
  price: string;
  quantity: number;
  active: boolean;
  sortOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  sold: number;
  held: number;
  available: number;
  salesStatus: EventTicketingSalesStatus;
  isCurrentLot: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EventTicketTypeDto = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: string | null;
  quantity: number | null;
  purchaseLimit: number | null;
  active: boolean;
  sortOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  usesLots: boolean;
  currentPrice: string | null;
  capacity: number;
  sold: number;
  held: number;
  available: number;
  salesStatus: EventTicketingSalesStatus;
  lots: EventTicketLotDto[];
  createdAt: string;
  updatedAt: string;
};

export type EventTicketingDetailDto = {
  eventId: string;
  eventName: string;
  eventSlug: string;
  eventStatus: string;
  ticketingEnabled: boolean;
  types: EventTicketTypeDto[];
  capacityHint: EventTicketingCapacityHintDto | null;
};

/** Snapshot interno para checkout público futuro (Fase 2.2+). */
export type EventTicketingPublicSnapshotDto = {
  eventId: string;
  eventName: string;
  eventSlug: string;
  ticketingEnabled: boolean;
  types: Array<{
    id: string;
    name: string;
    description: string | null;
    purchaseLimit: number | null;
    currentPrice: string | null;
    sold: number;
    held: number;
    available: number;
    salesStatus: EventTicketingSalesStatus;
    currentLot: { id: string; name: string; price: string } | null;
  }>;
};
