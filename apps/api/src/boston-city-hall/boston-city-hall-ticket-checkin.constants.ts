export const EVENT_TICKET_CHECKIN_RESULTS = [
  'accepted',
  'already_used',
  'cancelled',
  'invalid',
  'wrong_event',
] as const;

export type EventTicketCheckinResult = (typeof EVENT_TICKET_CHECKIN_RESULTS)[number];

export const EVENT_TICKET_CHECKIN_RESULT_LABEL: Record<EventTicketCheckinResult, string> = {
  accepted: 'ACEITO',
  already_used: 'JÁ UTILIZADO',
  cancelled: 'CANCELADO',
  invalid: 'INVÁLIDO',
  wrong_event: 'OUTRO EVENTO',
};

export type EventTicketCheckinResponseDto = {
  result: EventTicketCheckinResult;
  checkinId: string;
  scannedAt: string;
  ticket: {
    id: string;
    ticketCode: string;
    ticketTypeName: string;
    lotName: string | null;
    holderName: string;
    status: string;
    usedAt: string | null;
    admissionSource?: string;
    tableName?: string | null;
    seatLabel?: string | null;
    section?: string | null;
  } | null;
};

export type EventTicketCheckinRecentItemDto = {
  id: string;
  result: EventTicketCheckinResult;
  ticketCode: string | null;
  ticketTypeName: string | null;
  holderName: string | null;
  stationLabel: string | null;
  createdAt: string;
};
