/** Tipos de canal suportados (channel-agnostic). */
export const COMMUNICATION_CHANNELS = [
  'whatsapp',
  'instagram',
  'messenger',
  'email',
  'sms',
  'internal',
] as const;

export type CommunicationChannelType = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
export type CommunicationStatus = (typeof COMMUNICATION_STATUSES)[number];

export const COMMUNICATION_MESSAGE_DIRECTIONS = ['inbound', 'outbound', 'system'] as const;

export function previewText(body: string | null | undefined, max = 120): string | null {
  if (!body?.trim()) return null;
  const t = body.trim().replace(/\s+/g, ' ');
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function digitsOnly(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  return d.length >= 8 ? d : null;
}
