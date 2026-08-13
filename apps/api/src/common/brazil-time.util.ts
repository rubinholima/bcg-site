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

/** datetime-local (sem fuso), ISO ou YYYY-MM-DD → Date em horário de São Paulo. */
export function parseDateTimeBrazil(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = parseDateOnlyBrazil(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const localIso = parseDateTimeLocalBrazil(trimmed);
  if (localIso) return new Date(localIso);
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** datetime-local (sem fuso) ou ISO → ISO UTC (interpretando como São Paulo). */
export function parseDateTimeLocalBrazil(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4] ?? '00'}-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO ou Date → valor para input datetime-local (sempre horário de São Paulo). */
export function toDateTimeLocalBrazil(v: string | Date | null | undefined): string {
  if (!v) return '';
  const trimmed = typeof v === 'string' ? v.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const date = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(date.getTime())) return '';
  const { year, month, day, hour, minute } = datePartsInTz(date, BRAZIL_TZ);
  return `${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
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

const AGENDA_PERIOD_SORT_TIME: Record<string, string> = {
  manha: '08:00:00',
  tarde: '13:00:00',
  noite: '19:00:00',
};

/** ISO usado na ordenação — respeita manhã/tarde/noite e dia inteiro. */
export function agendaEffectiveSortAt(
  startAt: string,
  opts?: { allDay?: boolean; dayPeriod?: string | null },
): string {
  const period = opts?.dayPeriod;
  if (period === 'manha' || period === 'tarde' || period === 'noite') {
    const dateKey = dateKeyInBrazil(startAt);
    return `${dateKey}T${AGENDA_PERIOD_SORT_TIME[period]}-03:00`;
  }
  if (opts?.allDay) {
    const dateKey = dateKeyInBrazil(startAt);
    return `${dateKey}T11:58:00-03:00`;
  }
  return startAt;
}

function agendaTypeSortPriority(type: string): number {
  if (type === 'jogo' || type === 'viagem') return 0;
  if (type === 'aniversario') return 90;
  return 40;
}

export function compareAgendaCalendarItems(
  a: { type: string; startAt: string; allDay?: boolean; dayPeriod?: string | null },
  b: { type: string; startAt: string; allDay?: boolean; dayPeriod?: string | null },
): number {
  const byTime = agendaEffectiveSortAt(a.startAt, a).localeCompare(
    agendaEffectiveSortAt(b.startAt, b),
  );
  if (byTime !== 0) return byTime;
  return agendaTypeSortPriority(a.type) - agendaTypeSortPriority(b.type);
}

/** Dia do calendário — jogos/viagens usam data do jogo (endAt), não embarque. */
export function resolveAgendaCalendarDateKey(item: {
  source: string;
  type: string;
  startAt: string;
  endAt?: string | null;
}): string {
  if (
    item.source === 'travel' &&
    (item.type === 'jogo' || item.type === 'viagem') &&
    item.endAt
  ) {
    return dateKeyInBrazil(item.endAt);
  }
  return dateKeyInBrazil(item.startAt);
}
