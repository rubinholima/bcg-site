import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallEventFinancialService } from './boston-city-hall-event-financial.service';
import {
  BCH_ALERT_EVENT_HORIZON_FUTURE_DAYS,
  BCH_ALERT_EVENT_HORIZON_PAST_DAYS,
  BCH_ALERT_TYPES,
  type BchAlertCandidate,
  type BchAlertListQuery,
  type BchAlertSummaryCountsDto,
  type BchOperationalAlertDto,
} from './boston-city-hall-operational-alert.constants';
import { buildAlertCandidates, type AlertEvaluationContext } from './boston-city-hall-operational-alert.evaluator';
import { planAlertSync } from './boston-city-hall-operational-alert.sync';

type EvaluateScope = {
  eventId?: string;
  receivableId?: string;
  bookingId?: string;
};

@Injectable()
export class BostonCityHallOperationalAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventFinancial: BostonCityHallEventFinancialService,
  ) {}

  async evaluate(tenantId: string, scope?: EvaluateScope): Promise<{ evaluated: number; active: number }> {
    const ctx = await this.loadContext(tenantId, scope);
    let candidates = buildAlertCandidates(ctx);

    if (scope?.eventId) {
      const eid = scope.eventId;
      candidates = candidates.filter((c) => c.eventId === eid || c.deduplicationKey.includes(eid));
    }
    if (scope?.receivableId) {
      candidates = candidates.filter(
        (c) => c.sourceId === scope.receivableId || c.deduplicationKey.includes(scope.receivableId!),
      );
    }
    if (scope?.bookingId) {
      candidates = candidates.filter((c) => c.bookingId === scope.bookingId);
    }

    await this.syncCandidates(tenantId, candidates, scope);
    const active = await this.prisma.bchOperationalAlert.count({
      where: { tenantId, status: { in: ['open', 'acknowledged'] } },
    });
    return { evaluated: candidates.length, active };
  }

  async list(tenantId: string, query: BchAlertListQuery): Promise<BchOperationalAlertDto[]> {
    const where: Prisma.BchOperationalAlertWhereInput = { tenantId };
    if (query.status?.trim()) where.status = query.status.trim();
    if (query.severity?.trim()) where.severity = query.severity.trim();
    if (query.alertType?.trim()) where.alertType = query.alertType.trim();
    if (query.eventId?.trim()) where.eventId = query.eventId.trim();

    const rows = await this.prisma.bchOperationalAlert.findMany({
      where,
      orderBy: [{ status: 'asc' }, { severity: 'desc' }, { detectedAt: 'desc' }],
      take: 500,
      include: { event: { select: { name: true } } },
    });
    return rows.map((r) => this.toDto(r));
  }

  async getSummaryCounts(tenantId: string): Promise<BchAlertSummaryCountsDto> {
    const [openCritical, openWarning, openInfo, acknowledgedUnresolved, recentlyResolved] = await Promise.all([
      this.prisma.bchOperationalAlert.count({ where: { tenantId, status: 'open', severity: 'critical' } }),
      this.prisma.bchOperationalAlert.count({ where: { tenantId, status: 'open', severity: 'warning' } }),
      this.prisma.bchOperationalAlert.count({ where: { tenantId, status: 'open', severity: 'info' } }),
      this.prisma.bchOperationalAlert.count({ where: { tenantId, status: 'acknowledged' } }),
      this.prisma.bchOperationalAlert.count({
        where: {
          tenantId,
          status: 'resolved',
          resolvedAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      }),
    ]);
    return { openCritical, openWarning, openInfo, acknowledgedUnresolved, recentlyResolved };
  }

  async listAttentionByEventIds(
    tenantId: string,
    eventIds: string[],
  ): Promise<Map<string, BchOperationalAlertDto[]>> {
    if (!eventIds.length) return new Map();
    const rows = await this.prisma.bchOperationalAlert.findMany({
      where: {
        tenantId,
        eventId: { in: eventIds },
        status: { in: ['open', 'acknowledged'] },
      },
      include: { event: { select: { name: true } } },
    });
    const map = new Map<string, BchOperationalAlertDto[]>();
    for (const r of rows) {
      if (!r.eventId) continue;
      const dto = this.toDto(r);
      const list = map.get(r.eventId) ?? [];
      list.push(dto);
      map.set(r.eventId, list);
    }
    return map;
  }

  async acknowledge(tenantId: string, alertId: string, userId: string): Promise<BchOperationalAlertDto> {
    const row = await this.prisma.bchOperationalAlert.findFirst({
      where: { id: alertId, tenantId },
      include: { event: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Alerta não encontrado.');
    if (row.status === 'resolved') throw new NotFoundException('Alerta já resolvido.');

    const updated = await this.prisma.bchOperationalAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedByUserId: userId,
      },
      include: { event: { select: { name: true } } },
    });
    return this.toDto(updated);
  }

  private async syncCandidates(tenantId: string, candidates: BchAlertCandidate[], scope?: EvaluateScope) {
    const managedTypes = [...BCH_ALERT_TYPES];
    const existing = await this.prisma.bchOperationalAlert.findMany({
      where: {
        tenantId,
        alertType: { in: managedTypes },
        ...(scope?.eventId ? { eventId: scope.eventId } : {}),
      },
      select: {
        deduplicationKey: true,
        status: true,
        acknowledgedAt: true,
        acknowledgedByUserId: true,
      },
    });

    const { upsert, resolveKeys } = planAlertSync(candidates, existing);
    const now = new Date();

    for (const item of upsert) {
      const { reopen, ...c } = item;
      await this.prisma.bchOperationalAlert.upsert({
        where: { tenantId_deduplicationKey: { tenantId, deduplicationKey: c.deduplicationKey } },
        create: {
          tenantId,
          eventId: c.eventId,
          bookingId: c.bookingId,
          alertType: c.alertType,
          severity: c.severity,
          status: 'open',
          title: c.title,
          message: c.message,
          sourceModule: c.sourceModule,
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          deduplicationKey: c.deduplicationKey,
          actionUrl: c.actionUrl,
          detectedAt: now,
          metadata: c.metadata as Prisma.InputJsonValue,
        },
        update: {
          eventId: c.eventId,
          bookingId: c.bookingId,
          alertType: c.alertType,
          severity: c.severity,
          title: c.title,
          message: c.message,
          sourceModule: c.sourceModule,
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          actionUrl: c.actionUrl,
          metadata: c.metadata as Prisma.InputJsonValue,
          detectedAt: now,
          ...(reopen
            ? {
                status: 'open',
                resolvedAt: null,
                acknowledgedAt: null,
                acknowledgedByUserId: null,
              }
            : {}),
        },
      });
    }

    if (resolveKeys.length) {
      await this.prisma.bchOperationalAlert.updateMany({
        where: {
          tenantId,
          deduplicationKey: { in: resolveKeys },
          status: { in: ['open', 'acknowledged'] },
        },
        data: { status: 'resolved', resolvedAt: now },
      });
    }
  }

  private async loadContext(tenantId: string, scope?: EvaluateScope): Promise<AlertEvaluationContext> {
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - BCH_ALERT_EVENT_HORIZON_PAST_DAYS);
    const future = new Date(now);
    future.setDate(future.getDate() + BCH_ALERT_EVENT_HORIZON_FUTURE_DAYS);

    const eventWhere: Prisma.EventWhereInput = {
      tenantId,
      startDate: { gte: past, lte: future },
    };
    if (scope?.eventId) eventWhere.id = scope.eventId;

    const eventsRaw = await this.prisma.event.findMany({
      where: eventWhere,
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        ticketing: { select: { enabled: true } },
        venueBooking: { select: { id: true } },
      },
    });

    const events = eventsRaw.map((e) => ({
      id: e.id,
      name: e.name,
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      bookingId: e.venueBooking?.id ?? null,
      ticketingEnabled: e.ticketing?.enabled ?? false,
    }));

    const eventIds = events.map((e) => e.id);
    const bookingIds = events.map((e) => e.bookingId).filter(Boolean) as string[];

    const [
      contracts,
      barSalesGrouped,
      barCloses,
      inventories,
      physicalCounts,
      openContainersGrouped,
      ticketTypes,
      receivables,
    ] = await Promise.all([
      this.prisma.venueContract.findMany({
        where: { tenantId, bookingId: { in: bookingIds }, status: 'signed' },
        select: { id: true, bookingId: true, total: true, venueReceivable: { select: { id: true } } },
      }),
      eventIds.length
        ? this.prisma.bchBarSale.groupBy({
            by: ['eventId'],
            where: { tenantId, eventId: { in: eventIds }, status: 'completed' },
            _count: true,
          })
        : Promise.resolve([]),
      eventIds.length
        ? this.prisma.bchBarClose.findMany({
            where: { tenantId, eventId: { in: eventIds }, status: 'finalized' },
            select: { eventId: true },
          })
        : Promise.resolve([]),
      eventIds.length
        ? this.prisma.bchBarEventInventory.findMany({
            where: { tenantId, eventId: { in: eventIds } },
            select: { id: true, eventId: true, status: true, locationId: true },
          })
        : Promise.resolve([]),
      eventIds.length
        ? this.prisma.bchBarPhysicalCount.findMany({
            where: { tenantId, eventId: { in: eventIds }, status: 'completed' },
            select: { eventId: true },
          })
        : Promise.resolve([]),
      eventIds.length
        ? this.prisma.bchBarOpenContainer.groupBy({
            by: ['eventId'],
            where: { tenantId, eventId: { in: eventIds }, status: 'open' },
            _count: true,
          })
        : Promise.resolve([]),
      eventIds.length
        ? this.prisma.eventTicketType.findMany({
            where: { tenantId, eventId: { in: eventIds } },
            select: {
              eventId: true,
              active: true,
              price: true,
              quantity: true,
              salesStartAt: true,
              salesEndAt: true,
              lots: { select: { active: true, quantity: true } },
            },
          })
        : Promise.resolve([]),
      this.loadOverdueReceivables(tenantId, scope?.receivableId),
    ]);

    const signedContractByBooking = new Map<string, { id: string; total: Prisma.Decimal }>();
    const receivableByContract = new Map<string, { id: string }>();
    for (const c of contracts) {
      if (!c.bookingId) continue;
      signedContractByBooking.set(c.bookingId, { id: c.id, total: c.total });
      if (c.venueReceivable) receivableByContract.set(c.id, { id: c.venueReceivable.id });
    }

    const barSalesCountByEvent = new Map<string, number>();
    for (const g of barSalesGrouped) {
      if (g.eventId) barSalesCountByEvent.set(g.eventId, g._count);
    }

    const finalizedBarCloseByEvent = new Map<string, boolean>();
    for (const c of barCloses) finalizedBarCloseByEvent.set(c.eventId, true);

    const completedPhysicalCountByEvent = new Map<string, boolean>();
    for (const p of physicalCounts) {
      if (p.eventId) completedPhysicalCountByEvent.set(p.eventId, true);
    }

    const openContainersByEvent = new Map<string, number>();
    for (const g of openContainersGrouped) {
      if (g.eventId) openContainersByEvent.set(g.eventId, g._count);
    }

    const ticketTypesByEvent = new Map<string, AlertEvaluationContext['ticketTypesByEvent'] extends Map<string, infer V> ? V : never>();
    for (const t of ticketTypes) {
      const list = ticketTypesByEvent.get(t.eventId) ?? [];
      list.push(t);
      ticketTypesByEvent.set(t.eventId, list);
    }

    const financialByEvent = new Map<string, Awaited<ReturnType<BostonCityHallEventFinancialService['getExecutiveSummary']>>>();
    for (let i = 0; i < eventIds.length; i += 6) {
      const chunk = eventIds.slice(i, i + 6);
      const summaries = await Promise.all(
        chunk.map((id) => this.eventFinancial.getExecutiveSummary(tenantId, id)),
      );
      chunk.forEach((id, idx) => financialByEvent.set(id, summaries[idx]!));
    }

    return {
      now,
      events,
      signedContractByBooking,
      receivableByContract,
      barSalesCountByEvent,
      finalizedBarCloseByEvent,
      eventInventories: inventories,
      completedPhysicalCountByEvent,
      openContainersByEvent,
      financialByEvent,
      ticketTypesByEvent,
      overdueReceivables: receivables,
    };
  }

  private async loadOverdueReceivables(tenantId: string, receivableId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await this.prisma.venueReceivable.findMany({
      where: {
        tenantId,
        status: { not: 'cancelled' },
        cancelledAt: null,
        ...(receivableId ? { id: receivableId } : {}),
      },
      include: {
        contract: {
          select: {
            id: true,
            booking: { select: { id: true, eventId: true } },
          },
        },
        installments: {
          include: { payments: { where: { voidedAt: null } } },
        },
      },
    });

    const out: AlertEvaluationContext['overdueReceivables'] = [];

    for (const r of rows) {
      let overdueBalance = new Prisma.Decimal(0);
      let maxOverdueDays = 0;
      for (const inst of r.installments) {
        if (inst.cancelledAt) continue;
        const paid = inst.payments.reduce((s, p) => s.plus(p.amount), new Prisma.Decimal(0));
        const balance = inst.amount.minus(paid);
        if (balance.lte(0)) continue;
        if (inst.dueDate >= today) continue;
        overdueBalance = overdueBalance.plus(balance);
        const days = Math.floor((today.getTime() - inst.dueDate.getTime()) / 86400000);
        if (days > maxOverdueDays) maxOverdueDays = days;
      }
      if (overdueBalance.lte(0)) continue;
      out.push({
        receivableId: r.id,
        contractId: r.contractId,
        eventId: r.contract.booking?.eventId ?? null,
        bookingId: r.contract.booking?.id ?? null,
        maxOverdueDays,
        overdueBalance,
        currency: 'USD',
      });
    }
    return out;
  }

  private toDto(row: {
    id: string;
    tenantId: string;
    eventId: string | null;
    bookingId: string | null;
    alertType: string;
    severity: string;
    status: string;
    title: string;
    message: string;
    sourceModule: string;
    sourceType: string;
    sourceId: string | null;
    deduplicationKey: string;
    actionUrl: string | null;
    detectedAt: Date;
    acknowledgedAt: Date | null;
    acknowledgedByUserId: string | null;
    resolvedAt: Date | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    event?: { name: string } | null;
  }): BchOperationalAlertDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      eventId: row.eventId,
      eventName: row.event?.name ?? null,
      bookingId: row.bookingId,
      alertType: row.alertType as BchOperationalAlertDto['alertType'],
      severity: row.severity as BchOperationalAlertDto['severity'],
      status: row.status as BchOperationalAlertDto['status'],
      title: row.title,
      message: row.message,
      sourceModule: row.sourceModule,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      deduplicationKey: row.deduplicationKey,
      actionUrl: row.actionUrl,
      detectedAt: row.detectedAt.toISOString(),
      acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      acknowledgedByUserId: row.acknowledgedByUserId,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
