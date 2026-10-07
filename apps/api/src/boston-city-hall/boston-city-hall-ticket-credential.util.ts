import { randomBytes } from 'crypto';
import { BCH_TICKET_CODE_PREFIX, CUP360_TICKET_QR_PREFIX } from './boston-city-hall-event-ticket.constants';

const TICKET_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateQrToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Referência opaca para URLs públicas de ingresso (não é qrToken). */
export function generatePublicTicketRef(): string {
  return randomBytes(18).toString('base64url');
}

export function buildCup360TicketQrPayload(qrToken: string): string {
  return `${CUP360_TICKET_QR_PREFIX}${qrToken.trim()}`;
}

/** Extrai token opaco de payload escaneado ou token cru. */
export function parseCup360TicketQrCredential(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  if (input.startsWith(CUP360_TICKET_QR_PREFIX)) {
    const token = input.slice(CUP360_TICKET_QR_PREFIX.length).trim();
    return token.length >= 16 ? token : null;
  }
  if (/^[A-Za-z0-9_-]{16,}$/.test(input)) return input;
  return null;
}

export function generateHumanTicketCode(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    const idx = randomBytes(1)[0]! % TICKET_CODE_ALPHABET.length;
    suffix += TICKET_CODE_ALPHABET[idx]!;
  }
  return `${BCH_TICKET_CODE_PREFIX}-${yy}-${suffix}`;
}
