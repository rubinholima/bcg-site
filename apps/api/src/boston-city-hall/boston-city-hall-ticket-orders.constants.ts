/** Duração padrão do hold (minutos). Configurável em um único lugar. */
export const BCH_TICKET_ORDER_HOLD_MINUTES = 15;

export const BCH_TICKET_ORDER_NUMBER_PREFIX = 'BCH-T';

export const EVENT_TICKET_ORDER_STATUSES = ['pending', 'confirmed', 'cancelled', 'expired'] as const;
export type EventTicketOrderStatus = (typeof EVENT_TICKET_ORDER_STATUSES)[number];

export const EVENT_TICKET_ORDER_STATUS_LABEL: Record<EventTicketOrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

export type EventTicketOrderItemDto = {
  id: string;
  ticketTypeId: string;
  ticketLotId: string | null;
  ticketTypeName: string;
  lotName: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type EventTicketOrderPaymentSummaryDto = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  paidAt: string | null;
  manualReference: string | null;
  externalProviderLabel: string | null;
  expiresAt: string | null;
};

export type EventTicketOrderListItemDto = {
  id: string;
  orderNumber: string;
  eventId: string;
  eventName: string;
  customerName: string;
  customerEmail: string;
  total: string;
  currency: string;
  status: EventTicketOrderStatus;
  holdExpiresAt: string | null;
  itemsCount: number;
  createdAt: string;
};

export type EventTicketOrderDetailDto = {
  id: string;
  orderNumber: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  status: EventTicketOrderStatus;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerDocument: string | null;
  subtotal: string;
  discount: string;
  fees: string;
  total: string;
  currency: string;
  holdExpiresAt: string | null;
  payment: EventTicketOrderPaymentSummaryDto | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: EventTicketOrderItemDto[];
};

/**
 * Anti-oversell (Fase 2.2): dentro de `$transaction`, para cada tipo envolvido
 * executamos `SELECT … FOR UPDATE` em EventTicketType (e EventTicketLot quando aplicável),
 * recalculamos sold/held a partir dos itens de pedido e só então inserimos o pedido.
 * Holds expirados não entram no held (`pending` + holdExpiresAt > now).
 * Sold = itens de pedidos `confirmed`.
 */
