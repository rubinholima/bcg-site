export const EVENT_TICKET_STATUSES = ['valid', 'used', 'cancelled'] as const;
export type EventTicketStatus = (typeof EVENT_TICKET_STATUSES)[number];

export const EVENT_TICKET_STATUS_LABEL: Record<EventTicketStatus, string> = {
  valid: 'Válido',
  used: 'Utilizado',
  cancelled: 'Cancelado',
};

/** Versão do payload QR CUP360 (check-in Fase 2.5). */
export const CUP360_TICKET_QR_VERSION = 'T1';
export const CUP360_TICKET_QR_PREFIX = `CUP360-${CUP360_TICKET_QR_VERSION}:`;

export const BCH_TICKET_CODE_PREFIX = 'BCH';

export type EventTicketSummaryDto = {
  id: string;
  ticketCode: string;
  qrPayload: string;
  status: EventTicketStatus;
  ticketTypeName: string;
  lotName: string | null;
  holderName: string;
  unitPrice: string;
  currency: string;
  issuedAt: string;
};

export type EventTicketLookupDto = {
  id: string;
  ticketCode: string;
  status: EventTicketStatus;
  orderNumber: string;
  eventName: string;
  ticketTypeName: string;
  lotName: string | null;
  holderName: string;
  issuedAt: string;
};
