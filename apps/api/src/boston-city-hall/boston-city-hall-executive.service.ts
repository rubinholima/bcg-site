import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallEventFinancialService } from './boston-city-hall-event-financial.service';
import type {
  BchExecutiveCompactEventDto,
  BchExecutiveEventsQuery,
  BchExecutiveEventsResponseDto,
  BchExecutiveEventPerformanceRowDto,
  BchExecutiveSummaryResponseDto,
} from './boston-city-hall-executive.constants';
import {
  attendanceRatePct,
  buildRevenueMix,
  buildRevenueTrend,
  deriveAttentionFlags,
  mergeCurrencyGroups,
  resolveExecutivePeriod,
  type ResolvedExecutivePeriod,
} from './boston-city-hall-executive.util';
import type { BchEventExecutiveSummaryDto } from './boston-city-hall-event-financial.constants';

type EventRow = {
  id: string;
  name: string;
  status: string;
  startDate: Date | null;
  ticketing: { enabled: boolean } | null;
};

type BookingMeta = {
  bookingId: string;
  bookingStatus: string;
  spaceName: string | null;
};

@Injectable()
export class BostonCityHallExecutiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventFinancial: BostonCityHallEventFinancialService,
  ) {}

  async getSummary(tenantId: string, query: BchExecutiveEventsQuery): Promise<BchExecutiveSummaryResponseDto> {
    const period = resolveExecutivePeriod(query);
    const { inPeriod, summaries, bookingByEvent } = await this.loadPeriodContext(tenantId, period, query);

    const now = new Date();
    const upcomingEvents = await this.loadCompactEvents(tenantId, { gte: now }, 8, 'asc');
    const recentEvents = await this.loadCompactEvents(tenantId, { lt: now }, 8, 'desc');

    return this.buildSummaryResponse(period, inPeriod, summaries, bookingByEvent, upcomingEvents, recentEvents);
  }

  async getEventPerformance(
    tenantId: string,
    query: BchExecutiveEventsQuery,
  ): Promise<BchExecutiveEventsResponseDto> {
    const period = resolveExecutivePeriod(query);
    const { inPeriod, summaries, bookingByEvent } = await this.loadPeriodContext(tenantId, period, query);

    const items: BchExecutiveEventPerformanceRowDto[] = inPeriod.map((event) => {
      const summary = summaries.get(event.id)!;
      const booking = bookingByEvent.get(event.id);
      const eventPast = event.startDate ? event.startDate.getTime() < Date.now() : false;
      const flags = deriveAttentionFlags(summary, {
        bookingLinked: !!booking,
        eventPast,
        ticketingEnabled: event.ticketing?.enabled ?? false,
      });

      const ticketsSold = summary.ticketsSold;
      const attendance = summary.attendance;

      return {
        eventId: event.id,
        eventName: event.name,
        eventStatus: event.status,
        eventStartAt: event.startDate?.toISOString() ?? null,
        bookingId: booking?.bookingId ?? null,
        bookingStatus: booking?.bookingStatus ?? null,
        spaceName: booking?.spaceName ?? null,
        ticketingEnabled: event.ticketing?.enabled ?? false,
        ticketingStatusNote: summary.completeness.ticketingConfigured ? null : 'Ingressos não configurados',
        ticketsSold,
        attendance,
        attendanceRatePct: attendanceRatePct(ticketsSold, attendance),
        complimentaryCount: summary.complimentaryCount,
        ticketRevenue: summary.ticketRevenue,
        ticketRevenueCurrency: summary.consolidatedCurrency ?? summary.currencies[0]?.currency ?? null,
        barRevenue: summary.barRevenue,
        barSalesCount: summary.barSalesCount,
        venueRevenue: summary.venueRevenue,
        collected: summary.collected,
        outstanding: summary.outstanding,
        knownCost: summary.knownCosts,
        operationalResult: summary.operationalResult,
        operationalMarginPct: summary.operationalMarginPct,
        multiCurrency: summary.multiCurrency,
        currencies: summary.currencies,
        consolidatedCurrency: summary.consolidatedCurrency,
        marginIncomplete: summary.marginIncomplete,
        resultComplete: summary.completeness.resultComplete,
        attentionFlags: flags,
        inventoryDivergenceProducts: summary.inventoryDivergenceProducts,
        summary,
      };
    });

    const comparisonByCurrency = this.buildComparison(items);

    return {
      period: { preset: period.preset, from: period.from, to: period.to },
      total: items.length,
      items,
      comparisonByCurrency,
    };
  }

  private async loadPeriodContext(
    tenantId: string,
    period: ResolvedExecutivePeriod,
    query: BchExecutiveEventsQuery,
  ) {
    const where: Prisma.EventWhereInput = {
      tenantId,
      startDate: {
        gte: period.fromDate,
        lte: period.toDate,
      },
    };

    const status = query.status?.trim();
    if (status) where.status = status;

    const search = query.search?.trim();
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const inPeriod = await this.prisma.event.findMany({
      where,
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        ticketing: { select: { enabled: true } },
      },
    });

    const eventIds = inPeriod.map((e) => e.id);
    const bookingByEvent = await this.loadBookingMeta(tenantId, eventIds);
    const summaries = await this.loadExecutiveSummaries(tenantId, eventIds);

    let filtered = inPeriod;
    const fc = query.financialComplete;
    if (fc === 'true' || fc === 'false') {
      const wantComplete = fc === 'true';
      filtered = inPeriod.filter((e) => {
        const s = summaries.get(e.id);
        if (!s) return false;
        return s.completeness.resultComplete === wantComplete;
      });
    }

    return { inPeriod: filtered, summaries, bookingByEvent };
  }

  private async loadExecutiveSummaries(tenantId: string, eventIds: string[]) {
    const map = new Map<string, BchEventExecutiveSummaryDto>();
    if (!eventIds.length) return map;

    const chunkSize = 8;
    for (let i = 0; i < eventIds.length; i += chunkSize) {
      const chunk = eventIds.slice(i, i + chunkSize);
      const rows = await Promise.all(
        chunk.map((id) => this.eventFinancial.getExecutiveSummary(tenantId, id)),
      );
      chunk.forEach((id, idx) => map.set(id, rows[idx]!));
    }
    return map;
  }

  private async loadBookingMeta(tenantId: string, eventIds: string[]) {
    const map = new Map<string, BookingMeta>();
    if (!eventIds.length) return map;

    const rows = await this.prisma.venueBooking.findMany({
      where: { tenantId, eventId: { in: eventIds } },
      select: {
        id: true,
        status: true,
        eventId: true,
        space: { select: { name: true } },
      },
    });

    for (const r of rows) {
      if (!r.eventId) continue;
      map.set(r.eventId, {
        bookingId: r.id,
        bookingStatus: r.status,
        spaceName: r.space.name,
      });
    }
    return map;
  }

  private buildSummaryResponse(
    period: ResolvedExecutivePeriod,
    inPeriod: EventRow[],
    summaries: Map<string, BchEventExecutiveSummaryDto>,
    bookingByEvent: Map<string, BookingMeta>,
    upcomingEvents: BchExecutiveCompactEventDto[],
    recentEvents: BchExecutiveCompactEventDto[],
  ): BchExecutiveSummaryResponseDto {
    const summaryList = inPeriod.map((e) => summaries.get(e.id)).filter(Boolean) as BchEventExecutiveSummaryDto[];
    const currencyGroups = mergeCurrencyGroups(summaryList.map((s) => s.currencies));
    const multiCurrency = currencyGroups.length > 1;

    const now = Date.now();
    let upcoming = 0;
    let pastInPeriod = 0;
    let activeOperational = 0;

    for (const e of inPeriod) {
      if (!e.startDate) continue;
      const t = e.startDate.getTime();
      if (t >= now) upcoming += 1;
      else pastInPeriod += 1;
      if (e.status === 'published' && t >= now - 7 * 86400000) activeOperational += 1;
    }

    let confirmedOrders = 0;
    let ticketsSold = 0;
    let complimentary = 0;
    let attendance = 0;
    const ticketRevMap = new Map<string, Prisma.Decimal>();

    let barSales = 0;
    const barRevMap = new Map<string, Prisma.Decimal>();
    const barCogsMap = new Map<string, Prisma.Decimal>();
    let wasteEvents = 0;
    let divergenceEvents = 0;
    let barClosePending = 0;

    let overdueEvents = 0;
    let incompleteResults = 0;

    const attentionRequired: BchExecutiveSummaryResponseDto['attentionRequired'] = [];

    for (const event of inPeriod) {
      const s = summaries.get(event.id);
      if (!s) continue;

      confirmedOrders += s.confirmedOrderCount;
      ticketsSold += s.ticketsSold;
      complimentary += s.complimentaryCount;
      attendance += s.attendance;

      for (const g of s.currencies) {
        if (g.ticketingRevenue != null) {
          const cur = ticketRevMap.get(g.currency) ?? new Prisma.Decimal(0);
          ticketRevMap.set(g.currency, cur.plus(g.ticketingRevenue));
        }
        if (g.barRevenue != null) {
          const cur = barRevMap.get(g.currency) ?? new Prisma.Decimal(0);
          barRevMap.set(g.currency, cur.plus(g.barRevenue));
        }
        if (g.knownOperationalCost != null) {
          const cur = barCogsMap.get(g.currency) ?? new Prisma.Decimal(0);
          barCogsMap.set(g.currency, cur.plus(g.knownOperationalCost));
        }
      }

      barSales += s.barSalesCount;
      if (s.inventoryDivergenceProducts > 0) divergenceEvents += 1;
      if (s.barSalesCount > 0 && !s.completeness.barCloseFinalized) barClosePending += 1;
      if (s.currencies.some((g) => g.overdue != null && new Prisma.Decimal(g.overdue).gt(0))) overdueEvents += 1;
      if (!s.completeness.resultComplete) incompleteResults += 1;

      const eventPast = event.startDate ? event.startDate.getTime() < now : false;
      const flags = deriveAttentionFlags(s, {
        bookingLinked: bookingByEvent.has(event.id),
        eventPast,
        ticketingEnabled: event.ticketing?.enabled ?? false,
      });
      if (flags.length) {
        attentionRequired.push({
          eventId: event.id,
          eventName: event.name,
          eventStartAt: event.startDate?.toISOString() ?? null,
          flags,
        });
      }
    }

    const revenueMix = buildRevenueMix(currencyGroups);
    const trendInput = inPeriod
      .map((e) => {
        const s = summaries.get(e.id);
        if (!s) return null;
        return {
          eventStartAt: e.startDate?.toISOString() ?? null,
          currencies: s.currencies,
          attendance: s.attendance,
        };
      })
      .filter(Boolean) as Array<{
      eventStartAt: string | null;
      currencies: typeof currencyGroups;
      attendance: number;
    }>;

    return {
      period: { preset: period.preset, from: period.from, to: period.to },
      multiCurrency,
      currencyMismatch: multiCurrency,
      currencies: currencyGroups,
      events: {
        inPeriod: inPeriod.length,
        upcoming,
        pastInPeriod,
        activeOperational,
      },
      ticketing: {
        confirmedOrderCount: confirmedOrders,
        ticketsSold,
        complimentaryCount: complimentary,
        attendance,
        attendanceRatePct: attendanceRatePct(ticketsSold, attendance),
        revenueByCurrency: [...ticketRevMap.entries()].map(([currency, amount]) => ({
          currency,
          amount: amount.toFixed(2),
        })),
      },
      bar: {
        completedSalesCount: barSales,
        revenueByCurrency: [...barRevMap.entries()].map(([currency, amount]) => ({
          currency,
          amount: amount.toFixed(2),
        })),
        knownCogsByCurrency: [...barCogsMap.entries()].map(([currency, amount]) => ({
          currency,
          amount: amount.toFixed(2),
        })),
        grossMarginByCurrency: [...barRevMap.entries()].map(([currency, rev]) => {
          const cogs = barCogsMap.get(currency) ?? new Prisma.Decimal(0);
          const margin = rev.minus(cogs);
          return {
            currency,
            amount: margin.toFixed(2),
            marginPct: rev.lte(0) ? null : margin.div(rev).mul(100).toFixed(2),
          };
        }),
        wasteLossEventCount: wasteEvents,
        physicalDivergenceEventCount: divergenceEvents,
        barClosePendingEventCount: barClosePending,
      },
      collection: {
        byCurrency: currencyGroups.map((c) => ({
          currency: c.currency,
          receivable: addReceivable(c),
          collected: c.collected,
          outstanding: c.outstanding,
          overdue: c.overdue,
        })),
        overdueEventCount: overdueEvents,
      },
      result: {
        byCurrency: currencyGroups.map((c) => ({
          currency: c.currency,
          grossOperationalRevenue: c.grossOperationalRevenue,
          knownOperationalCost: c.knownOperationalCost,
          operationalResult: c.operationalResult,
          operationalMarginPct: c.operationalMarginPct,
          marginIncomplete: c.marginIncomplete,
        })),
        incompleteResultEventCount: incompleteResults,
      },
      revenueMix,
      revenueTrend: buildRevenueTrend(trendInput),
      attentionRequired,
      upcomingEvents,
      recentEvents,
    };
  }

  private buildComparison(items: BchExecutiveEventPerformanceRowDto[]) {
    const currencies = new Set<string>();
    for (const item of items) {
      for (const c of item.currencies) currencies.add(c.currency);
    }

    return [...currencies].sort().map((currency) => {
      const inCurrency = items.filter((i) => i.currencies.some((c) => c.currency === currency));
      const topByRevenue = [...inCurrency]
        .map((i) => {
          const g = i.currencies.find((c) => c.currency === currency)!;
          return { eventId: i.eventId, eventName: i.eventName, grossOperationalRevenue: g.grossOperationalRevenue };
        })
        .sort((a, b) => new Prisma.Decimal(b.grossOperationalRevenue).cmp(a.grossOperationalRevenue))
        .slice(0, 5);

      const topByAttendance = [...inCurrency]
        .map((i) => ({ eventId: i.eventId, eventName: i.eventName, attendance: i.attendance }))
        .sort((a, b) => b.attendance - a.attendance)
        .slice(0, 5);

      return { currency, topByRevenue, topByAttendance };
    });
  }

  private async loadCompactEvents(
    tenantId: string,
    startDateFilter: Prisma.DateTimeNullableFilter,
    take: number,
    direction: 'asc' | 'desc',
  ): Promise<BchExecutiveCompactEventDto[]> {
    const rows = await this.prisma.event.findMany({
      where: { tenantId, startDate: startDateFilter },
      orderBy: { startDate: direction },
      take,
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        ticketing: { select: { enabled: true } },
      },
    });

    const ids = rows.map((r) => r.id);
    const [summaries, bookingByEvent] = await Promise.all([
      this.loadExecutiveSummaries(tenantId, ids),
      this.loadBookingMeta(tenantId, ids),
    ]);

    return rows.map((e) => {
      const s = summaries.get(e.id);
      const b = bookingByEvent.get(e.id);
      const eventPast = e.startDate ? e.startDate.getTime() < Date.now() : false;
      const flags = s
        ? deriveAttentionFlags(s, {
            bookingLinked: !!b,
            eventPast,
            ticketingEnabled: e.ticketing?.enabled ?? false,
          })
        : [];

      return {
        eventId: e.id,
        eventName: e.name,
        eventStatus: e.status,
        eventStartAt: e.startDate?.toISOString() ?? null,
        spaceName: b?.spaceName ?? null,
        bookingId: b?.bookingId ?? null,
        bookingStatus: b?.bookingStatus ?? null,
        ticketingEnabled: e.ticketing?.enabled ?? false,
        ticketsSold: s?.ticketsSold ?? 0,
        attendance: s?.attendance ?? 0,
        currencies: s?.currencies ?? [],
        multiCurrency: s?.multiCurrency ?? false,
        attentionFlags: flags,
        resultComplete: s?.completeness.resultComplete ?? false,
      };
    });
  }
}

function addReceivable(c: {
  collected: string;
  outstanding: string;
  ticketingRevenue: string | null;
  barRevenue: string | null;
  venueRevenue: string | null;
}): string {
  let r = new Prisma.Decimal(c.collected).plus(c.outstanding);
  return r.toFixed(2);
}
