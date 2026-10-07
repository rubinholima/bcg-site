import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import { COMPLIMENTARY_REASON_LABEL } from './boston-city-hall-complimentary.constants';
import {
  BCH_TICKETING_FINANCE_SOURCE_MODULE,
  BCH_TICKETING_FINANCE_SOURCE_TYPE,
} from './boston-city-hall-ticket-finance-projection';
import { BostonCityHallTicketInventoryService } from './boston-city-hall-ticket-inventory.service';
import type {
  TicketReportCapacityDto,
  TicketReportCheckinDto,
  TicketReportComplimentaryDto,
  TicketReportOverviewDto,
  TicketReportQueryDto,
  TicketReportSalesDto,
  TicketReportSeatingDto,
  TicketReportTicketsDto,
} from './boston-city-hall-ticket-reports.constants';
import {
  aggregateCheckinResults,
  aggregateTickets,
  bucketByDay,
  computeOccupancyPercent,
  computeRemainingCapacity,
  countCapacityConsumed,
  countOrdersByStatus,
  isConfirmedCommercialOrder,
  sumConfirmedOrderTotals,
  sumTypeCapacityFromLotsOrType,
  ticketsSoldFromConfirmedItems,
  uniqueCheckedInFromTickets,
  type CheckinRowForReports,
  type OrderItemRowForSales,
  type OrderRowForSales,
  type TicketRowForReports,
} from './boston-city-hall-ticket-reports.util';
import {
  resolveTypeAvailability,
  type InventoryCounters,
  type TypeRow,
} from './boston-city-hall-ticketing.availability';

function money(v: number): string {
  return new Prisma.Decimal(v).toFixed(2);
}

function parseOptionalDate(iso?: string): Date | undefined {
  if (!iso?.trim()) return undefined;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) throw new BadRequestException('dateFrom/dateTo inválido.');
  return d;
}

@Injectable()
export class BostonCityHallTicketReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: BostonCityHallTicketInventoryService,
  ) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant "${venueSlug}" não encontrado.`);
    return tenant.id;
  }

  private async assertEvent(tenantId: string, eventId: string) {
    if (!eventId?.trim()) throw new BadRequestException('eventId é obrigatório.');
    const event = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
      include: { ticketing: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    return event;
  }

  private ticketWhere(
    tenantId: string,
    eventId: string,
    q: TicketReportQueryDto,
  ): Prisma.EventTicketWhereInput {
    const where: Prisma.EventTicketWhereInput = { tenantId, eventId };
    if (q.ticketTypeId) where.ticketTypeId = q.ticketTypeId;
    if (q.ticketLotId) where.ticketLotId = q.ticketLotId;
    if (q.admissionSource) where.admissionSource = q.admissionSource;
    if (q.ticketStatus) where.status = q.ticketStatus;
    if (q.complimentaryReason) {
      where.complimentaryAdmission = { reason: q.complimentaryReason };
    }
    return where;
  }

  private async loadTickets(
    tenantId: string,
    eventId: string,
    q: TicketReportQueryDto,
  ): Promise<TicketRowForReports[]> {
    const rows = await this.prisma.eventTicket.findMany({
      where: this.ticketWhere(tenantId, eventId, q),
      select: {
        status: true,
        admissionSource: true,
        ticketTypeId: true,
        ticketLotId: true,
        unitPrice: true,
      },
    });
    return rows.map((r) => ({
      ...r,
      unitPrice: r.unitPrice.toFixed(2),
    }));
  }

  private async loadOrders(tenantId: string, eventId: string): Promise<OrderRowForSales[]> {
    const rows = await this.prisma.eventTicketOrder.findMany({
      where: { tenantId, eventId },
      select: { status: true, total: true, currency: true, createdAt: true },
    });
    return rows.map((r) => ({
      status: r.status,
      total: r.total.toFixed(2),
      currency: r.currency,
      createdAt: r.createdAt,
    }));
  }

  private async loadOrderItems(tenantId: string, eventId: string): Promise<OrderItemRowForSales[]> {
    const rows = await this.prisma.eventTicketOrderItem.findMany({
      where: { order: { tenantId, eventId } },
      select: {
        ticketTypeId: true,
        ticketLotId: true,
        quantity: true,
        totalPrice: true,
        order: { select: { status: true } },
      },
    });
    return rows.map((r) => ({
      ticketTypeId: r.ticketTypeId,
      ticketLotId: r.ticketLotId,
      quantity: r.quantity,
      totalPrice: r.totalPrice.toFixed(2),
      orderStatus: r.order.status,
    }));
  }

  private async loadCheckins(
    tenantId: string,
    eventId: string,
    q: TicketReportQueryDto,
  ): Promise<CheckinRowForReports[]> {
    const where: Prisma.EventTicketCheckinWhereInput = { tenantId, eventId };
    const from = parseOptionalDate(q.dateFrom);
    const to = parseOptionalDate(q.dateTo);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    if (q.stationLabel) where.stationLabel = q.stationLabel;
    if (q.operatorUserId) where.operatorUserId = q.operatorUserId;

    const rows = await this.prisma.eventTicketCheckin.findMany({
      where,
      select: {
        result: true,
        ticketId: true,
        ticketTypeName: true,
        stationLabel: true,
        operatorUserId: true,
        createdAt: true,
      },
    });
    return rows;
  }

  private async configuredCapacity(tenantId: string, eventId: string): Promise<number> {
    const types = await this.prisma.eventTicketType.findMany({
      where: { tenantId, eventId },
      include: { lots: true },
    });
    return types.reduce(
      (sum, t) =>
        sum +
        sumTypeCapacityFromLotsOrType({
          lots: t.lots,
          typeQuantity: t.quantity,
        }),
      0,
    );
  }

  private async totalHeld(tenantId: string, eventId: string, now = new Date()): Promise<number> {
    const agg = await this.prisma.eventTicketOrderItem.aggregate({
      where: {
        order: {
          tenantId,
          eventId,
          status: 'pending',
          holdExpiresAt: { gt: now },
        },
      },
      _sum: { quantity: true },
    });
    return agg._sum.quantity ?? 0;
  }

  private countersForEvent(tenantId: string, eventId: string): Promise<InventoryCounters> {
    return this.inventory.loadForEvent(tenantId, eventId).then((maps) => ({
      soldForType: (id) => this.inventory.soldForType(maps, id),
      heldForType: (id) => this.inventory.heldForType(maps, id),
      soldForLot: (id) => this.inventory.soldForLot(maps, id),
      heldForLot: (id) => this.inventory.heldForLot(maps, id),
    }));
  }

  async getOverviewForVenue(q: TicketReportQueryDto): Promise<TicketReportOverviewDto> {
    const tenantId = await this.resolveTenantId();
    const event = await this.assertEvent(tenantId, q.eventId);
    const [orders, items, tickets, configured, held] = await Promise.all([
      this.loadOrders(tenantId, q.eventId),
      this.loadOrderItems(tenantId, q.eventId),
      this.loadTickets(tenantId, q.eventId, q),
      this.configuredCapacity(tenantId, q.eventId),
      this.totalHeld(tenantId, q.eventId),
    ]);

    const orderCounts = countOrdersByStatus(orders);
    const sales = sumConfirmedOrderTotals(orders);
    const ticketAgg = aggregateTickets(tickets);
    const consumed = countCapacityConsumed(tickets);
    const checkedIn = uniqueCheckedInFromTickets(tickets);
    const ticketsSold = ticketsSoldFromConfirmedItems(items);
    const currency = event.ticketing?.currency ?? sales.currency ?? 'USD';

    const confirmedIds = await this.prisma.eventTicketOrder.findMany({
      where: { tenantId, eventId: q.eventId, status: 'confirmed' },
      select: { id: true },
    });
    const withProjection =
      confirmedIds.length === 0
        ? 0
        : await this.prisma.financeiroLancamento.count({
            where: {
              tenantId,
              sourceModule: BCH_TICKETING_FINANCE_SOURCE_MODULE,
              sourceType: BCH_TICKETING_FINANCE_SOURCE_TYPE,
              sourceId: { in: confirmedIds.map((r) => r.id) },
            },
          });

    const avgOrder =
      sales.confirmedOrderCount > 0 ? sales.grossSales / sales.confirmedOrderCount : null;
    const avgTicket = ticketsSold > 0 ? sales.grossSales / ticketsSold : null;

    return {
      event: {
        id: event.id,
        name: event.name,
        startDate: event.startDate?.toISOString() ?? null,
        endDate: event.endDate?.toISOString() ?? null,
        status: event.status,
      },
      ticketing: {
        enabled: event.ticketing?.enabled ?? false,
        currency,
        seatingEnabled: event.ticketing?.seatingEnabled ?? false,
      },
      capacity: {
        configured,
        consumed,
        held,
        remaining: computeRemainingCapacity(configured, consumed, held),
        committed: consumed + held,
      },
      orders: {
        total: orders.length,
        confirmed: orderCounts.confirmed ?? 0,
        pending: orderCounts.pending ?? 0,
        cancelled: orderCounts.cancelled ?? 0,
        expired: orderCounts.expired ?? 0,
      },
      sales: {
        grossAmount: money(sales.grossSales),
        currency,
        confirmedOrders: sales.confirmedOrderCount,
        ticketsSold,
        averageOrderValue: avgOrder != null ? money(avgOrder) : null,
        averagePaidTicketValue: avgTicket != null ? money(avgTicket) : null,
      },
      tickets: {
        paidIssued: ticketAgg.paidIssued,
        complimentaryIssued: ticketAgg.complimentaryIssued,
        activeIssued: ticketAgg.activeIssued,
        checkedIn,
        noShow: ticketAgg.noShowTotal,
        paidNoShow: ticketAgg.paidNoShow,
        complimentaryNoShow: ticketAgg.complimentaryNoShow,
        cancelled: ticketAgg.cancelled,
        occupancyPercent: computeOccupancyPercent(checkedIn, configured),
      },
      financeReconciliation: {
        confirmedOrdersWithProjection: withProjection,
        note: 'Projeção Financeiro espelha o mesmo valor comercial do pedido confirmado — não somar à receita.',
      },
    };
  }

  async getSalesForVenue(q: TicketReportQueryDto): Promise<TicketReportSalesDto> {
    const tenantId = await this.resolveTenantId();
    const event = await this.assertEvent(tenantId, q.eventId);
    const [orders, items] = await Promise.all([
      this.loadOrders(tenantId, q.eventId),
      this.loadOrderItems(tenantId, q.eventId),
    ]);

    const sales = sumConfirmedOrderTotals(orders);
    const orderCounts = countOrdersByStatus(orders);
    const ticketsSold = ticketsSoldFromConfirmedItems(items);
    const currency = event.ticketing?.currency ?? sales.currency ?? 'USD';

    const types = await this.prisma.eventTicketType.findMany({
      where: { tenantId, eventId: q.eventId },
      select: { id: true, name: true },
    });
    const typeName = new Map(types.map((t) => [t.id, t.name]));

    const byTypeMap = new Map<string, { qty: number; revenue: number }>();
    const byLotMap = new Map<string, { qty: number; revenue: number; lotName: string; typeName: string }>();

    for (const row of items) {
      if (!isConfirmedCommercialOrder(row.orderStatus)) continue;
      const rev = Number.parseFloat(row.totalPrice) || 0;
      const cur = byTypeMap.get(row.ticketTypeId) ?? { qty: 0, revenue: 0 };
      cur.qty += row.quantity;
      cur.revenue += rev;
      byTypeMap.set(row.ticketTypeId, cur);

      if (row.ticketLotId) {
        const lk = row.ticketLotId;
        const curLot = byLotMap.get(lk) ?? {
          qty: 0,
          revenue: 0,
          lotName: '',
          typeName: typeName.get(row.ticketTypeId) ?? '—',
        };
        curLot.qty += row.quantity;
        curLot.revenue += rev;
        byLotMap.set(lk, curLot);
      }
    }

    const lotRows = await this.prisma.eventTicketLot.findMany({
      where: { ticketType: { tenantId, eventId: q.eventId } },
      select: { id: true, name: true, ticketType: { select: { name: true } } },
    });
    for (const lot of lotRows) {
      const entry = byLotMap.get(lot.id);
      if (entry) {
        entry.lotName = lot.name;
        entry.typeName = lot.ticketType.name;
      }
    }

    const confirmedOrders = orders.filter((o) => isConfirmedCommercialOrder(o.status));
    const salesOverTime = bucketByDay(confirmedOrders.map((o) => o.createdAt)).map((b) => {
      const dayOrders = confirmedOrders.filter(
        (o) => o.createdAt.toISOString().slice(0, 10) === b.date,
      );
      const rev = dayOrders.reduce((s, o) => s + (Number.parseFloat(o.total) || 0), 0);
      return { date: b.date, orders: dayOrders.length, revenue: money(rev) };
    });

    const avgOrder =
      sales.confirmedOrderCount > 0 ? sales.grossSales / sales.confirmedOrderCount : null;
    const avgTicket = ticketsSold > 0 ? sales.grossSales / ticketsSold : null;

    return {
      currency,
      summary: {
        grossSales: money(sales.grossSales),
        confirmedOrders: sales.confirmedOrderCount,
        ticketsSold,
        averageOrderValue: avgOrder != null ? money(avgOrder) : null,
        averagePaidTicketValue: avgTicket != null ? money(avgTicket) : null,
        pendingOrders: orderCounts.pending ?? 0,
        cancelledOrders: orderCounts.cancelled ?? 0,
      },
      byTicketType: [...byTypeMap.entries()].map(([ticketTypeId, v]) => ({
        ticketTypeId,
        ticketTypeName: typeName.get(ticketTypeId) ?? ticketTypeId,
        ticketsSold: v.qty,
        revenue: money(v.revenue),
        averageUnitPrice: v.qty > 0 ? money(v.revenue / v.qty) : null,
      })),
      byLot: [...byLotMap.entries()].map(([ticketLotId, v]) => ({
        ticketLotId,
        lotName: v.lotName || ticketLotId,
        ticketTypeName: v.typeName,
        ticketsSold: v.qty,
        revenue: money(v.revenue),
      })),
      salesOverTime,
    };
  }

  async getComplimentaryForVenue(q: TicketReportQueryDto): Promise<TicketReportComplimentaryDto> {
    const tenantId = await this.resolveTenantId();
    const event = await this.assertEvent(tenantId, q.eventId);
    const tickets = await this.loadTickets(tenantId, q.eventId, {
      ...q,
      admissionSource: 'complimentary',
    });

    const agg = aggregateTickets(tickets);
    const currency = event.ticketing?.currency ?? 'USD';

    const byReason = new Map<string, { issued: number; used: number; unused: number }>();
    const ticketDetails = await this.prisma.eventTicket.findMany({
      where: { tenantId, eventId: q.eventId, admissionSource: 'complimentary' },
      select: {
        status: true,
        ticketTypeId: true,
        unitPrice: true,
        complimentaryAdmission: { select: { reason: true } },
        ticketType: { select: { name: true } },
      },
    });

    for (const t of ticketDetails) {
      const reason = t.complimentaryAdmission?.reason ?? 'other';
      const cur = byReason.get(reason) ?? { issued: 0, used: 0, unused: 0 };
      cur.issued += 1;
      if (t.status === 'used') cur.used += 1;
      if (t.status === 'valid') cur.unused += 1;
      byReason.set(reason, cur);
    }

    const byType = new Map<string, { name: string; issued: number; used: number; face: number }>();
    for (const t of ticketDetails) {
      const cur = byType.get(t.ticketTypeId) ?? {
        name: t.ticketType.name,
        issued: 0,
        used: 0,
        face: 0,
      };
      cur.issued += 1;
      if (t.status === 'used') cur.used += 1;
      if (t.status === 'valid' || t.status === 'used') {
        cur.face += Number(t.unitPrice) || 0;
      }
      byType.set(t.ticketTypeId, cur);
    }

    return {
      currency,
      summary: {
        issued: agg.complimentaryIssued,
        active: tickets.filter((t) => t.status === 'valid' || t.status === 'used').length,
        cancelled: tickets.filter((t) => t.status === 'cancelled').length,
        used: tickets.filter((t) => t.status === 'used').length,
        unused: tickets.filter((t) => t.status === 'valid').length,
        faceValueTotal: money(agg.faceValueComplimentary),
        faceValueLabel: 'Valor de face das cortesias',
      },
      byReason: [...byReason.entries()].map(([reason, v]) => ({
        reason,
        reasonLabel:
          COMPLIMENTARY_REASON_LABEL[reason as keyof typeof COMPLIMENTARY_REASON_LABEL] ?? reason,
        ...v,
      })),
      byTicketType: [...byType.entries()].map(([ticketTypeId, v]) => ({
        ticketTypeId,
        ticketTypeName: v.name,
        issued: v.issued,
        used: v.used,
        faceValueTotal: money(v.face),
      })),
    };
  }

  async getCapacityForVenue(q: TicketReportQueryDto): Promise<TicketReportCapacityDto> {
    const tenantId = await this.resolveTenantId();
    await this.assertEvent(tenantId, q.eventId);
    const [configured, held, tickets, counters, types] = await Promise.all([
      this.configuredCapacity(tenantId, q.eventId),
      this.totalHeld(tenantId, q.eventId),
      this.loadTickets(tenantId, q.eventId, q),
      this.countersForEvent(tenantId, q.eventId),
      this.prisma.eventTicketType.findMany({
        where: { tenantId, eventId: q.eventId },
        include: { lots: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      }),
    ]);

    const consumed = countCapacityConsumed(tickets);
    const checkedIn = uniqueCheckedInFromTickets(tickets);

    const byTicketType = types.map((type) => {
      const typeRow: TypeRow = {
        active: type.active,
        price: type.price,
        quantity: type.quantity,
        salesStartAt: type.salesStartAt,
        salesEndAt: type.salesEndAt,
        lots: type.lots.map((l) => ({
          id: l.id,
          name: l.name,
          price: l.price,
          quantity: l.quantity,
          active: l.active,
          sortOrder: l.sortOrder,
          salesStartAt: l.salesStartAt,
          salesEndAt: l.salesEndAt,
        })),
      };
      const avail = resolveTypeAvailability(typeRow, type.id, new Date(), counters);
      const typeTickets = tickets.filter((t) => t.ticketTypeId === type.id);
      return {
        ticketTypeId: type.id,
        ticketTypeName: type.name,
        capacity: avail.capacity,
        sold: avail.sold,
        held: avail.held,
        available: avail.available,
        complimentary: typeTickets.filter((t) => t.admissionSource === 'complimentary').length,
        issued: typeTickets.filter((t) => t.status === 'valid' || t.status === 'used').length,
        used: typeTickets.filter((t) => t.status === 'used').length,
      };
    });

    return {
      configuredCapacity: configured,
      consumedTickets: consumed,
      activeHolds: held,
      committed: consumed + held,
      checkedIn,
      remaining: computeRemainingCapacity(configured, consumed, held),
      occupancyPercent: computeOccupancyPercent(checkedIn, configured),
      byTicketType,
    };
  }

  async getCheckinForVenue(q: TicketReportQueryDto): Promise<TicketReportCheckinDto> {
    const tenantId = await this.resolveTenantId();
    await this.assertEvent(tenantId, q.eventId);
    const [checkins, tickets] = await Promise.all([
      this.loadCheckins(tenantId, q.eventId, q),
      this.loadTickets(tenantId, q.eventId, q),
    ]);

    const summaryBase = aggregateCheckinResults(checkins);
    const uniqueCheckedInTickets = uniqueCheckedInFromTickets(tickets);

    const usedTickets = await this.prisma.eventTicket.findMany({
      where: { tenantId, eventId: q.eventId, status: 'used' },
      select: {
        ticketType: { select: { name: true } },
        admissionSource: true,
      },
    });

    const byType = new Map<string, number>();
    for (const t of usedTickets) {
      const name = t.ticketType.name;
      byType.set(name, (byType.get(name) ?? 0) + 1);
    }

    const bySource = new Map<string, number>();
    for (const t of usedTickets) {
      bySource.set(t.admissionSource, (bySource.get(t.admissionSource) ?? 0) + 1);
    }

    const stationMap = new Map<string, { attempts: number; accepted: number }>();
    for (const c of checkins) {
      const label = c.stationLabel?.trim() || '—';
      const cur = stationMap.get(label) ?? { attempts: 0, accepted: 0 };
      cur.attempts += 1;
      if (c.result === 'accepted') cur.accepted += 1;
      stationMap.set(label, cur);
    }

    const operatorMap = new Map<
      string,
      { operatorUserId: string | null; operatorLabel: string; accepted: number }
    >();
    const operatorIds = [...new Set(checkins.map((c) => c.operatorUserId).filter(Boolean))] as string[];
    const users =
      operatorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: operatorIds } },
            select: { id: true, name: true, username: true },
          })
        : [];
    const userLabel = new Map(
      users.map((u) => [u.id, u.name?.trim() || u.username || u.id]),
    );

    for (const c of checkins) {
      if (c.result !== 'accepted') continue;
      const key = c.operatorUserId ?? '__none__';
      const label = c.operatorUserId ? userLabel.get(c.operatorUserId) ?? c.operatorUserId : '—';
      const cur = operatorMap.get(key) ?? {
        operatorUserId: c.operatorUserId,
        operatorLabel: label,
        accepted: 0,
      };
      cur.accepted += 1;
      operatorMap.set(key, cur);
    }

    const acceptedDates = checkins.filter((c) => c.result === 'accepted').map((c) => c.createdAt);
    const rejectedDates = checkins.filter((c) => c.result !== 'accepted').map((c) => c.createdAt);
    const allDays = new Set([
      ...acceptedDates.map((d) => d.toISOString().slice(0, 10)),
      ...rejectedDates.map((d) => d.toISOString().slice(0, 10)),
    ]);
    const checkinsOverTime = [...allDays].sort().map((date) => ({
      date,
      accepted: acceptedDates.filter((d) => d.toISOString().slice(0, 10) === date).length,
      rejected: rejectedDates.filter((d) => d.toISOString().slice(0, 10) === date).length,
    }));

    return {
      summary: { ...summaryBase, uniqueCheckedInTickets },
      byTicketType: [...byType.entries()].map(([ticketTypeName, uniqueUsed]) => ({
        ticketTypeName,
        accepted: checkins.filter((c) => c.result === 'accepted' && c.ticketTypeName === ticketTypeName)
          .length,
        uniqueUsed,
      })),
      byAdmissionSource: [...bySource.entries()].map(([admissionSource, uniqueUsed]) => ({
        admissionSource,
        uniqueUsed,
      })),
      byStation: [...stationMap.entries()].map(([stationLabel, v]) => ({
        stationLabel,
        ...v,
      })),
      byOperator: [...operatorMap.values()],
      checkinsOverTime,
    };
  }

  async getTicketsPerformanceForVenue(q: TicketReportQueryDto): Promise<TicketReportTicketsDto> {
    const tenantId = await this.resolveTenantId();
    const event = await this.assertEvent(tenantId, q.eventId);
    const [items, tickets, counters, types] = await Promise.all([
      this.loadOrderItems(tenantId, q.eventId),
      this.loadTickets(tenantId, q.eventId, q),
      this.countersForEvent(tenantId, q.eventId),
      this.prisma.eventTicketType.findMany({
        where: { tenantId, eventId: q.eventId },
        include: { lots: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      }),
    ]);
    const currency = event.ticketing?.currency ?? 'USD';

    const revenueByTypeLot = new Map<string, { revenue: number; sold: number }>();
    for (const row of items) {
      if (!isConfirmedCommercialOrder(row.orderStatus)) continue;
      const key = `${row.ticketTypeId}:${row.ticketLotId ?? ''}`;
      const cur = revenueByTypeLot.get(key) ?? { revenue: 0, sold: 0 };
      cur.revenue += Number.parseFloat(row.totalPrice) || 0;
      cur.sold += row.quantity;
      revenueByTypeLot.set(key, cur);
    }

    const rows: TicketReportTicketsDto['typeAndLotPerformance'] = [];

    for (const type of types) {
      const typeRow: TypeRow = {
        active: type.active,
        price: type.price,
        quantity: type.quantity,
        salesStartAt: type.salesStartAt,
        salesEndAt: type.salesEndAt,
        lots: type.lots.map((l) => ({
          id: l.id,
          name: l.name,
          price: l.price,
          quantity: l.quantity,
          active: l.active,
          sortOrder: l.sortOrder,
          salesStartAt: l.salesStartAt,
          salesEndAt: l.salesEndAt,
        })),
      };

      if (type.lots.length > 0) {
        for (const lot of type.lots) {
          const key = `${type.id}:${lot.id}`;
          const rev = revenueByTypeLot.get(key) ?? { revenue: 0, sold: 0 };
          const lotTickets = tickets.filter(
            (t) => t.ticketTypeId === type.id && t.ticketLotId === lot.id,
          );
          const issued = lotTickets.filter((t) => t.status === 'valid' || t.status === 'used').length;
          const used = lotTickets.filter((t) => t.status === 'used').length;
          const cancelled = lotTickets.filter((t) => t.status === 'cancelled').length;
          const complimentary = lotTickets.filter((t) => t.admissionSource === 'complimentary').length;
          rows.push({
            ticketTypeId: type.id,
            ticketTypeName: type.name,
            ticketLotId: lot.id,
            lotName: lot.name,
            capacity: lot.quantity,
            sold: rev.sold,
            complimentary,
            issued,
            used,
            unused: lotTickets.filter((t) => t.status === 'valid').length,
            cancelled,
            revenue: money(rev.revenue),
            averagePaidUnitPrice: rev.sold > 0 ? money(rev.revenue / rev.sold) : null,
            usagePercent: issued > 0 ? Math.round((used / issued) * 1000) / 10 : 0,
          });
        }
      } else {
        const key = `${type.id}:`;
        const rev = revenueByTypeLot.get(key) ?? { revenue: 0, sold: 0 };
        const avail = resolveTypeAvailability(typeRow, type.id, new Date(), counters);
        const typeTickets = tickets.filter((t) => t.ticketTypeId === type.id && !t.ticketLotId);
        const issued = typeTickets.filter((t) => t.status === 'valid' || t.status === 'used').length;
        const used = typeTickets.filter((t) => t.status === 'used').length;
        rows.push({
          ticketTypeId: type.id,
          ticketTypeName: type.name,
          ticketLotId: null,
          lotName: null,
          capacity: avail.capacity,
          sold: rev.sold,
          complimentary: typeTickets.filter((t) => t.admissionSource === 'complimentary').length,
          issued,
          used,
          unused: typeTickets.filter((t) => t.status === 'valid').length,
          cancelled: typeTickets.filter((t) => t.status === 'cancelled').length,
          revenue: money(rev.revenue),
          averagePaidUnitPrice: rev.sold > 0 ? money(rev.revenue / rev.sold) : null,
          usagePercent: issued > 0 ? Math.round((used / issued) * 1000) / 10 : 0,
        });
      }
    }

    return { currency, typeAndLotPerformance: rows };
  }

  async getSeatingForVenue(q: TicketReportQueryDto): Promise<TicketReportSeatingDto | null> {
    const tenantId = await this.resolveTenantId();
    const event = await this.assertEvent(tenantId, q.eventId);
    if (!event.ticketing?.seatingEnabled) return null;

    const [tables, seats, tickets] = await Promise.all([
      this.prisma.eventTicketTable.findMany({
        where: { tenantId, eventId: q.eventId, active: true },
        select: { id: true, name: true, capacity: true, section: true },
      }),
      this.prisma.eventTicketSeat.findMany({
        where: { tenantId, eventId: q.eventId, active: true },
        select: { id: true, section: true, tableId: true },
      }),
      this.prisma.eventTicket.findMany({
        where: {
          tenantId,
          eventId: q.eventId,
          seatId: { not: null },
          status: { in: ['valid', 'used'] },
        },
        select: { seatId: true, tableId: true, status: true },
      }),
    ]);

    const assignedSeatIds = new Set(tickets.map((t) => t.seatId).filter(Boolean) as string[]);
    const usedSeatIds = new Set(
      tickets.filter((t) => t.status === 'used').map((t) => t.seatId).filter(Boolean) as string[],
    );

    const byTable = tables.map((table) => {
      const assigned = tickets.filter((t) => t.tableId === table.id).length;
      const used = tickets.filter((t) => t.tableId === table.id && t.status === 'used').length;
      return {
        tableId: table.id,
        tableName: table.name,
        capacity: table.capacity,
        assigned,
        used,
      };
    });

    const sectionMap = new Map<string, { assigned: number; used: number }>();
    for (const seat of seats) {
      if (!assignedSeatIds.has(seat.id)) continue;
      const section = seat.section?.trim() || '—';
      const cur = sectionMap.get(section) ?? { assigned: 0, used: 0 };
      cur.assigned += 1;
      if (usedSeatIds.has(seat.id)) cur.used += 1;
      sectionMap.set(section, cur);
    }

    return {
      seatingEnabled: true,
      tablesConfigured: tables.length,
      seatsConfigured: seats.length,
      assignedSeats: assignedSeatIds.size,
      unassignedSeats: Math.max(0, seats.length - assignedSeatIds.size),
      usedAssignedSeats: usedSeatIds.size,
      unusedAssignedSeats: Math.max(0, assignedSeatIds.size - usedSeatIds.size),
      byTable,
      bySection: [...sectionMap.entries()].map(([section, v]) => ({ section, ...v })),
    };
  }
}
