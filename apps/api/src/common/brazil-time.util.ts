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

export function formatTimeBrazil(d: Date | string, allDay?: boolean): string {
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

export function compareTimeLabels(a: string, b: string): number {
  if (a === 'Dia inteiro' && b === 'Dia inteiro') return 0;
  if (a === 'Dia inteiro') return -1;
  if (b === 'Dia inteiro') return 1;
  const parse = (t: string) => {
    const [h, m] = t.split(':').map((x) => parseInt(x, 10));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  return parse(a) - parse(b);
}
