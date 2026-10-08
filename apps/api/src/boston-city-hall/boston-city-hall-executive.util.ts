import { Prisma } from '@prisma/client';
import type { BchEventFinancialCurrencyGroupDto } from './boston-city-hall-event-financial.constants';
import type { BchEventExecutiveSummaryDto } from './boston-city-hall-event-financial.constants';
import {
  BCH_EXECUTIVE_ATTENTION_CODES,
  type BchExecutiveAttentionCode,
  type BchExecutivePeriodDto,
  type BchExecutiveRevenueMixSliceDto,
  type BchExecutiveRevenueTrendPointDto,
} from './boston-city-hall-executive.constants';
import { addMoneyStrings, moneyDec, operationalMarginPct } from './boston-city-hall-event-financial.util';

export type ResolvedExecutivePeriod = BchExecutivePeriodDto & { fromDate: Date; toDate: Date };

function parseLocalDateInput(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map((x) => Number.parseInt(x, 10));
  if (!y || !m || !d) return startOfDay(new Date(isoDate));
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function resolveExecutivePeriod(
  query: { period?: string; from?: string; to?: string },
  now: Date = new Date(),
): ResolvedExecutivePeriod {
  const presetRaw = query.period?.trim().toLowerCase() ?? 'this_month';
  const preset =
    presetRaw === 'today' || presetRaw === 'this_week' || presetRaw === 'this_month' || presetRaw === 'custom'
      ? presetRaw
      : 'this_month';

  let fromDate: Date;
  let toDate: Date;

  if (preset === 'custom') {
    const fromStr = query.from?.trim();
    const toStr = query.to?.trim();
    if (!fromStr || !toStr) {
      fromDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      toDate = endOfDay(now);
    } else {
      fromDate = startOfDay(parseLocalDateInput(fromStr));
      toDate = endOfDay(parseLocalDateInput(toStr));
    }
  } else if (preset === 'today') {
    fromDate = startOfDay(now);
    toDate = endOfDay(now);
  } else if (preset === 'this_week') {
    fromDate = startOfWeekMonday(now);
    toDate = endOfDay(now);
  } else {
    fromDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    toDate = endOfDay(now);
  }

  if (fromDate.getTime() > toDate.getTime()) {
    const swap = fromDate;
    fromDate = startOfDay(toDate);
    toDate = endOfDay(swap);
  }

  return {
    preset,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    fromDate,
    toDate,
  };
}

export function eventStartInPeriod(startDate: Date | null, period: ResolvedExecutivePeriod): boolean {
  if (!startDate) return false;
  const t = startDate.getTime();
  return t >= period.fromDate.getTime() && t <= period.toDate.getTime();
}

function addNullable(a: string | null, b: string | null): string | null {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return addMoneyStrings(a, b);
}

/** Soma grupos de moeda de vários eventos — nunca cruza moedas. */
export function mergeCurrencyGroups(groupsList: BchEventFinancialCurrencyGroupDto[][]): BchEventFinancialCurrencyGroupDto[] {
  const map = new Map<string, BchEventFinancialCurrencyGroupDto>();

  for (const groups of groupsList) {
    for (const g of groups) {
      const prev = map.get(g.currency);
      if (!prev) {
        map.set(g.currency, { ...g });
        continue;
      }
      map.set(g.currency, {
        currency: g.currency,
        ticketingRevenue: addNullable(prev.ticketingRevenue, g.ticketingRevenue),
        barRevenue: addNullable(prev.barRevenue, g.barRevenue),
        venueRevenue: addNullable(prev.venueRevenue, g.venueRevenue),
        grossOperationalRevenue: addMoneyStrings(prev.grossOperationalRevenue, g.grossOperationalRevenue),
        knownOperationalCost: addMoneyStrings(prev.knownOperationalCost, g.knownOperationalCost),
        operationalResult: addMoneyStrings(prev.operationalResult, g.operationalResult),
        operationalMarginPct: operationalMarginPct(
          addMoneyStrings(prev.grossOperationalRevenue, g.grossOperationalRevenue),
          addMoneyStrings(prev.knownOperationalCost, g.knownOperationalCost),
        ),
        marginIncomplete: prev.marginIncomplete || g.marginIncomplete,
        collected: addMoneyStrings(prev.collected, g.collected),
        outstanding: addMoneyStrings(prev.outstanding, g.outstanding),
        overdue: addNullable(prev.overdue, g.overdue),
      });
    }
  }

  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export function buildRevenueMix(currencies: BchEventFinancialCurrencyGroupDto[]): BchExecutiveRevenueMixSliceDto[] {
  return currencies.map((c) => {
    const ticketing = c.ticketingRevenue ?? '0.00';
    const bar = c.barRevenue ?? '0.00';
    const venue = c.venueRevenue ?? '0.00';
    let total = new Prisma.Decimal(0);
    if (c.ticketingRevenue != null) total = total.plus(c.ticketingRevenue);
    if (c.barRevenue != null) total = total.plus(c.barRevenue);
    if (c.venueRevenue != null) total = total.plus(c.venueRevenue);
    return {
      currency: c.currency,
      ticketing: c.ticketingRevenue ?? '0.00',
      bar: c.barRevenue ?? '0.00',
      venue: c.venueRevenue ?? '0.00',
      total: moneyDec(total),
    };
  });
}

export function buildRevenueTrend(
  rows: Array<{ eventStartAt: string | null; currencies: BchEventFinancialCurrencyGroupDto[]; attendance: number }>,
): BchExecutiveRevenueTrendPointDto[] {
  const byKey = new Map<string, BchExecutiveRevenueTrendPointDto>();

  for (const row of rows) {
    if (!row.eventStartAt) continue;
    const date = row.eventStartAt.slice(0, 10);
    for (const c of row.currencies) {
      const key = `${date}|${c.currency}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, {
          date,
          currency: c.currency,
          grossOperationalRevenue: c.grossOperationalRevenue,
          attendance: row.attendance,
        });
      } else {
        byKey.set(key, {
          date,
          currency: c.currency,
          grossOperationalRevenue: addMoneyStrings(prev.grossOperationalRevenue, c.grossOperationalRevenue),
          attendance: prev.attendance + row.attendance,
        });
      }
    }
  }

  return [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date) || a.currency.localeCompare(b.currency));
}

export function deriveAttentionFlags(
  summary: BchEventExecutiveSummaryDto,
  ctx: {
    bookingLinked: boolean;
    eventPast: boolean;
    ticketingEnabled: boolean;
  },
): BchExecutiveAttentionCode[] {
  const flags: BchExecutiveAttentionCode[] = [];
  const c = summary.completeness;

  const hasOverdue = summary.currencies.some((g) => g.overdue != null && new Prisma.Decimal(g.overdue).gt(0));
  if (hasOverdue) flags.push('overdue_receivable');

  if (!c.resultComplete) flags.push('incomplete_financial_data');
  if (summary.barSalesCount > 0 && !c.barCloseFinalized) flags.push('bar_not_closed');
  if ((summary.barSalesCount > 0 || c.barCloseFinalized) && !c.physicalCountCompleted) flags.push('no_physical_count');
  if (summary.marginIncomplete || c.barCostComplete === false) flags.push('margin_incomplete');

  if (
    ctx.ticketingEnabled &&
    ctx.eventPast &&
    summary.ticketsSold === 0 &&
    summary.ticketRevenue == null
  ) {
    flags.push('ticketing_pending');
  }

  if (ctx.bookingLinked && !c.venueContractLinked) flags.push('event_without_contract');

  return flags.filter((f) => BCH_EXECUTIVE_ATTENTION_CODES.includes(f));
}

export function attendanceRatePct(ticketsSold: number, attendance: number): string | null {
  const denom = ticketsSold;
  if (denom <= 0) return null;
  return ((attendance / denom) * 100).toFixed(1);
}
