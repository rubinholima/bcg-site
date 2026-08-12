/** Horário oficial BCG — America/Sao_Paulo. */

export const BRAZIL_TZ = 'America/Sao_Paulo';

function datePartsInTz(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
  };
}

export function dateKeyInBrazil(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const { year, month, day } = datePartsInTz(date, BRAZIL_TZ);
  return `${year}-${month}-${day}`;
}

export function formatTimeBrazil(
  d: Date | string,
  allDay?: boolean,
  dayPeriod?: string | null,
): string {
  if (dayPeriod === 'manha') return 'MANHÃ';
  if (dayPeriod === 'tarde') return 'TARDE';
  if (dayPeriod === 'noite') return 'NOITE';
  if (allDay) return 'Dia inteiro';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKeyInBrazil(d);
}

/** YYYY-MM-DD como meio-dia em Brasília (evita UTC midnight virar dia anterior). */
export function parseDateOnlyBrazil(dateKey: string): Date {
  const key = dateKey.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return new Date(NaN);
  return new Date(`${key}T12:00:00-03:00`);
}

export function dayStartBrazil(dateKey: string): Date {
  const key = dateKey.trim().slice(0, 10);
  return new Date(`${key}T00:00:00-03:00`);
}

export function dayEndBrazil(dateKey: string): Date {
  const key = dateKey.trim().slice(0, 10);
  return new Date(`${key}T23:59:59.999-03:00`);
}

/** Período inclusivo por chaves YYYY-MM-DD (Brasília). */
export function parsePeriodBrazil(fromKey: string, toKey: string): { from: Date; to: Date } {
  return {
    from: dayStartBrazil(fromKey),
    to: dayEndBrazil(toKey),
  };
}

function parseTimeLabelMinutes(t: string): number {
  const normalized = t.trim().replace(/h$/i, '');
  if (normalized === 'Dia inteiro') return -2;
  const periodOrder: Record<string, number> = {
    MANHÃ: 8 * 60,
    TARDE: 13 * 60,
    NOITE: 19 * 60,
  };
  if (normalized in periodOrder) return periodOrder[normalized]!;
  const m = normalized.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 24 * 60;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function compareTimeLabels(a: string, b: string): number {
  const av = parseTimeLabelMinutes(a);
  const bv = parseTimeLabelMinutes(b);
  if (av !== bv) return av - bv;
  return a.localeCompare(b, 'pt-BR');
}
