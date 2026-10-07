import type { EventTicketStatus } from './boston-city-hall-event-ticket.constants';

export type BchPublicTicketStatusLabel = 'VALID' | 'USED' | 'CANCELLED';

export type BchPublicTicketSeatingDto = {
  tableName: string | null;
  seatLabel: string | null;
  section: string | null;
};

export type BchPublicTicketDto = {
  publicTicketRef: string;
  ticketCode: string;
  ticketTypeName: string;
  lotName: string | null;
  holderName: string;
  status: BchPublicTicketStatusLabel;
  issuedAt: string;
  seating: BchPublicTicketSeatingDto | null;
  qrPath: string;
};

export function mapTicketToPublicStatusLabel(status: EventTicketStatus | string): BchPublicTicketStatusLabel {
  if (status === 'used') return 'USED';
  if (status === 'cancelled') return 'CANCELLED';
  return 'VALID';
}

export function bchPublicTicketQrPath(orderPublicToken: string, publicTicketRef: string): string {
  return `/api/public/boston-city-hall/orders/${encodeURIComponent(orderPublicToken)}/tickets/${encodeURIComponent(publicTicketRef)}/qr`;
}
