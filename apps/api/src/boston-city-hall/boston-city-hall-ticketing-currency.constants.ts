/** Padrão BCH (EUA) quando não configurado. */
export const BCH_TICKETING_DEFAULT_CURRENCY = 'USD';

export function normalizeTicketingCurrency(raw?: string | null): string {
  const c = raw?.trim().toUpperCase();
  if (!c || c.length !== 3) return BCH_TICKETING_DEFAULT_CURRENCY;
  return c;
}
