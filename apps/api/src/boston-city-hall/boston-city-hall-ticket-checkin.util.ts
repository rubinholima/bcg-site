import { createHash } from 'crypto';
import { parseCup360TicketQrCredential } from './boston-city-hall-ticket-credential.util';
import { CUP360_TICKET_QR_PREFIX } from './boston-city-hall-event-ticket.constants';

const CUID_LIKE = /^c[a-z0-9]{20,}$/i;
const TICKET_CODE_LIKE = /^BCH-/i;

export type CheckinInputKind =
  | { kind: 'empty' }
  | { kind: 'reject_id' }
  | { kind: 'token'; token: string }
  | { kind: 'code'; code: string };

/** Classifica entrada de scan/manual — não aceita ID de banco como credencial QR. */
export function classifyCheckinInput(raw: string): CheckinInputKind {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'empty' };

  if (CUID_LIKE.test(trimmed)) return { kind: 'reject_id' };

  if (TICKET_CODE_LIKE.test(trimmed)) {
    return { kind: 'code', code: trimmed.toUpperCase() };
  }

  if (trimmed.startsWith(CUP360_TICKET_QR_PREFIX)) {
    const token = parseCup360TicketQrCredential(trimmed);
    if (token) return { kind: 'token', token };
    return { kind: 'reject_id' };
  }

  const token = parseCup360TicketQrCredential(trimmed);
  if (token) return { kind: 'token', token };

  return { kind: 'reject_id' };
}

export function credentialFingerprint(raw: string): string {
  const normalized = raw.trim();
  if (!normalized) return '';
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

export function resolveCheckinResultForTicket(params: {
  ticketStatus: string;
  ticketEventId: string;
  selectedEventId: string;
}): 'accepted' | 'already_used' | 'cancelled' | 'wrong_event' | 'invalid' {
  if (params.ticketEventId !== params.selectedEventId) return 'wrong_event';
  if (params.ticketStatus === 'cancelled') return 'cancelled';
  if (params.ticketStatus === 'used') return 'already_used';
  if (params.ticketStatus === 'valid') return 'accepted';
  return 'invalid';
}
