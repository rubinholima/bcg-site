import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallFinanceService } from './boston-city-hall-finance.service';
import {
  BCH_EVENT_FINANCIAL_REVENUE_OWNERS,
  type BchEventExecutiveSummaryDto,
  type BchEventFinancialResultDto,
} from './boston-city-hall-event-financial.constants';
import {
  buildPerCurrencyAggregates,
  consolidatedFromGroups,
  moneyDec,
  operationalMarginPct,
} from './boston-city-hall-event-financial.util';
import {
  aggregateLaborCostsByCurrency,
  laborOperationalCostForEvent,
} from './boston-city-hall-staff-cost.util';
import {
  BCH_TICKETING_FINANCE_SOURCE_MODULE,
  BCH_TICKETING_FINANCE_SOURCE_TYPE,
} from './boston-city-hall-ticket-finance-projection';
import { uniqueCheckedInFromTickets } from './boston-city-hall-ticket-reports.util';

const bookingInclude = {
  venueContracts: {
    include: {
      venueReceivable: {
        include: {
          installments: {
            orderBy: [{ sequence: 'asc' as const }],
            include: { payments: { where: { voidedAt: null } } },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' as const },
  },
} satisfies Prisma.VenueBookingInclude;

@Injectable()
export class BostonCityHallEventFinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: BostonCityHallFinanceService,
  ) {}

  async getFinancialResult(tenantId: string, eventId: string): Promise<BchEventFinancialResultDto> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      include: { ticketing: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');

    const [
      ticketAgg,
      ticketItemAgg,
      ticketCurrencyRow,
      complimentaryAgg,
      ticketsForAttendance,
      barSales,
      barClose,
      eventInventory,
      physicalCount,
      booking,
      financeProjections,
      staffCosts,
      serviceCosts,
      openCashSessions,
    ] = await Promise.all([
      this.prisma.eventTicketOrder.aggregate({
        where: { tenantId, eventId, status: 'confirmed' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.eventTicketOrderItem.aggregate({
        where: { order: { tenantId, eventId, status: 'confirmed' } },
        _sum: { quantity: true },
      }),
      this.prisma.eventTicketOrder.findFirst({
        where: { tenantId, eventId, status: 'confirmed' },
        select: { currency: true },
        orderBy: { confirmedAt: 'desc' },
      }),
      this.prisma.eventComplimentaryAdmission.aggregate({
        where: { tenantId, eventId, status: 'active', cancelledAt: null },
        _sum: { quantity: true },
      }),
      this.prisma.eventTicket.findMany({
        where: { tenantId, eventId },
        select: { status: true, admissionSource: true, ticketTypeId: true, ticketLotId: true, unitPrice: true },
      }),
      this.prisma.bchBarSale.findMany({
        where: { tenantId, eventId, status: 'completed' },
        include: { items: true },
      }),
      this.prisma.bchBarClose.findFirst({
        where: { tenantId, eventId, status: 'finalized' },
        orderBy: { closedAt: 'desc' },
      }),
      this.prisma.bchBarEventInventory.findFirst({
        where: { tenantId, eventId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bchBarPhysicalCount.findFirst({
        where: { tenantId, eventId, status: 'completed' },
        orderBy: { completedAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.venueBooking.findFirst({
        where: { tenantId, eventId },
        include: bookingInclude,
      }),
      this.loadTicketingFinanceProjectionStats(tenantId, eventId),
      this.prisma.bchEventStaffAssignment.findMany({
        where: { tenantId, eventId, status: { not: 'cancelled' } },
        select: {
          actualCost: true,
          plannedCost: true,
          rateCurrency: true,
          paymentStatus: true,
        },
      }),
      this.prisma.bchEventServiceCommitment.findMany({
        where: { tenantId, eventId, operationalStatus: { not: 'cancelled' } },
        select: { actualCost: true, plannedCost: true, contractedAmount: true },
      }),
      this.prisma.bchPosCashSession.count({
        where: { tenantId, eventId, status: 'open' },
      }),
    ]);

    let barRevenue = new Prisma.Decimal(0);
    let barCogs = new Prisma.Decimal(0);
    let missingBarCostLines = 0;
    let barLineCount = 0;
    for (const sale of barSales) {
      barRevenue = barRevenue.plus(sale.total);
      for (const item of sale.items) {
        barLineCount += 1;
        if (item.lineCostSnapshot != null) barCogs = barCogs.plus(item.lineCostSnapshot);
        else missingBarCostLines += 1;
      }
    }
    const barMarginIncomplete = barLineCount > 0 && missingBarCostLines > 0;
    const barMargin = barRevenue.minus(barCogs);

    const laborByCurrency = laborOperationalCostForEvent(staffCosts);
    const laborAgg = aggregateLaborCostsByCurrency(staffCosts).map((g) => ({
      currency: g.currency,
      planned: moneyDec(g.planned),
      incurred: moneyDec(g.incurred),
      paid: moneyDec(g.paid),
      outstanding: moneyDec(g.outstanding),
    }));

    let supplierCost = new Prisma.Decimal(0);
    for (const row of serviceCosts) {
      const c =
        row.actualCost != null ? row.actualCost : row.plannedCost ?? row.contractedAmount;
      if (c) supplierCost = supplierCost.plus(c);
    }
    const eventOpsCost = supplierCost;

    const lossTypes = [
      'breakage',
      'spill_waste',
      'internal_use',
      'tasting',
      'complimentary',
      'physical_count_adjustment',
      'other',
    ] as const;
    const wasteGrouped = await this.prisma.bchBarStockMovement.groupBy({
      by: ['movementType'],
      where: {
        tenantId,
        eventId,
        direction: 'out',
        movementType: { in: [...lossTypes] },
      },
      _sum: { quantity: true },
    });

    let physicalDivergenceProducts = 0;
    if (physicalCount) {
      for (const i of physicalCount.items) {
        if (i.divergenceQuantity && !i.divergenceQuantity.isZero()) physicalDivergenceProducts += 1;
      }
    }

    const signedContract =
      booking?.venueContracts.find((c) => c.status === 'signed') ?? null;
    const receivableRow = signedContract?.venueReceivable ?? null;
    const receivableSummary = this.finance.receivableToSummary(receivableRow ?? undefined);

    let overdueAmount: string | null = null;
    if (receivableRow && receivableSummary) {
      overdueAmount = await this.computeOverdueBalance(receivableRow);
    }

    const ticketRevenueDec = ticketAgg._sum.total ?? new Prisma.Decimal(0);
    const ticketingConfigured = !!event.ticketing?.enabled;
    const ticketApplicable = ticketingConfigured || ticketAgg._count > 0;

    const venueApplicable = !!signedContract;

    const ticketingLine = {
      applicable: ticketApplicable,
      amount: ticketApplicable ? moneyDec(ticketRevenueDec) : null,
      currency: ticketCurrencyRow?.currency ?? null,
      ticketsSold: ticketItemAgg._sum.quantity ?? 0,
      complimentaryCount: complimentaryAgg._sum.quantity ?? 0,
      confirmedOrderCount: ticketAgg._count,
      notes: !ticketingConfigured && ticketAgg._count === 0 ? 'Ingressos não configurados ou sem vendas.' : null,
    };

    const barApplicable = barSales.length > 0 || !!eventInventory;
    const barLine = {
      applicable: barApplicable,
      amount: barSales.length > 0 ? moneyDec(barRevenue) : barApplicable ? '0.00' : null,
      currency: 'BRL',
      salesCount: barSales.length,
      estimatedCogs: barSales.length > 0 ? moneyDec(barCogs) : null,
      estimatedGrossMargin: barSales.length > 0 ? moneyDec(barMargin) : null,
      marginIncomplete: barMarginIncomplete,
      wasteLossSummary: wasteGrouped.map((g) => ({
        movementType: g.movementType,
        quantity: (g._sum.quantity ?? new Prisma.Decimal(0)).toFixed(4).replace(/\.?0+$/, '') || '0',
      })),
      physicalDivergenceProducts,
      notes: null as string | null,
    };

    const venueLine = {
      applicable: venueApplicable,
      amount: signedContract ? moneyDec(signedContract.total) : null,
      currency: venueApplicable ? 'USD' : null,
      contractId: signedContract?.id ?? null,
      contractNumber: signedContract?.contractNumber ?? null,
      contractStatus: signedContract?.status ?? (booking ? 'unsigned_or_missing' : null),
      notes: booking && !signedContract ? 'Reserva sem contrato assinado vinculado.' : !booking ? 'Sem reserva BCH ligada ao evento.' : null,
    };

    const otherLine = {
      applicable: false,
      amount: null as string | null,
      currency: null as string | null,
      notes: 'Nenhuma outra fonte canônica configurada nesta fase.',
    };

    const ticketCollected = ticketApplicable ? moneyDec(ticketRevenueDec) : null;
    const barCollected = barSales.length > 0 ? moneyDec(barRevenue) : barApplicable ? '0.00' : null;

    let perCurrency = buildPerCurrencyAggregates({
      ticketing: {
        applicable: ticketApplicable,
        currency: ticketingLine.currency,
        revenue: ticketingLine.amount,
        collected: ticketCollected,
      },
      bar: {
        applicable: barApplicable,
        currency: barLine.currency,
        revenue: barLine.amount,
        cogs: barLine.estimatedCogs,
        collected: barCollected,
        marginIncomplete: barMarginIncomplete,
      },
      venue: {
        applicable: venueApplicable,
        currency: venueLine.currency,
        revenue: venueLine.amount,
        collected: receivableSummary?.totalPaid ?? null,
        outstanding: receivableSummary?.balance ?? null,
        overdue: overdueAmount,
      },
    });

    if (laborByCurrency.size > 0) {
      const currencies = perCurrency.currencies.map((g) => {
        const labor = laborByCurrency.get(g.currency);
        if (!labor || labor.lte(0)) return g;
        const known = new Prisma.Decimal(g.knownOperationalCost).plus(labor);
        const gross = new Prisma.Decimal(g.grossOperationalRevenue);
        const result = gross.minus(known);
        return {
          ...g,
          knownOperationalCost: moneyDec(known),
          operationalResult: moneyDec(result),
          operationalMarginPct: operationalMarginPct(moneyDec(gross), moneyDec(known)),
        };
      });
      for (const [currency, labor] of laborByCurrency) {
        if (currencies.some((c) => c.currency === currency)) continue;
        currencies.push({
          currency,
          ticketingRevenue: null,
          barRevenue: null,
          venueRevenue: null,
          grossOperationalRevenue: '0.00',
          knownOperationalCost: moneyDec(labor),
          operationalResult: moneyDec(new Prisma.Decimal(0).minus(labor)),
          operationalMarginPct: null,
          marginIncomplete: false,
          collected: '0.00',
          outstanding: '0.00',
          overdue: null,
        });
      }
      currencies.sort((a, b) => a.currency.localeCompare(b.currency));
      const sortedCodes = currencies.map((c) => c.currency);
      perCurrency = {
        ...perCurrency,
        currencies,
        multiCurrency: sortedCodes.length > 1,
        currencyMismatch: sortedCodes.length > 1,
        consolidatedCurrency: sortedCodes.length === 1 ? sortedCodes[0]! : null,
      };
    }

    let laborOpsTotal = new Prisma.Decimal(0);
    for (const v of laborByCurrency.values()) laborOpsTotal = laborOpsTotal.plus(v);

    const consolidated = consolidatedFromGroups(perCurrency.currencies, perCurrency.multiCurrency);
    const marginIncomplete = consolidated.marginIncomplete;

    const completeness = {
      ticketingConfigured,
      barCloseFinalized: !!barClose,
      barCostComplete: !barMarginIncomplete,
      receivableLinked: !!receivableSummary,
      financialProjectionPresent: financeProjections.count > 0,
      physicalCountCompleted: !!physicalCount,
      venueContractLinked: !!signedContract,
      multiCurrency: perCurrency.multiCurrency,
      currencyMismatch: perCurrency.currencyMismatch,
      resultComplete:
        !perCurrency.multiCurrency &&
        (!barSales.length || !barMarginIncomplete) &&
        (!booking || !!signedContract) &&
        (ticketingConfigured || ticketAgg._count === 0) &&
        openCashSessions === 0,
    };

    const attendance = uniqueCheckedInFromTickets(
      ticketsForAttendance.map((t) => ({
        ...t,
        unitPrice: t.unitPrice.toFixed(2),
      })),
    );

    return {
      eventId: event.id,
      eventName: event.name,
      eventStatus: event.status,
      eventStartAt: event.startDate?.toISOString() ?? null,
      currencyHint: perCurrency.consolidatedCurrency ?? ticketCurrencyRow?.currency ?? null,
      revenue: {
        ticketing: ticketingLine,
        bar: barLine,
        venueContract: venueLine,
        otherCanonical: otherLine,
        grossOperationalRevenue: consolidated.grossOperationalRevenue,
      },
      collection: {
        ticketing: {
          applicable: ticketApplicable,
          invoicedOrReceivable: ticketCollected,
          paid: ticketCollected,
          outstanding: ticketApplicable ? '0.00' : null,
          overdue: null,
          currency: ticketCurrencyRow?.currency ?? null,
        },
        bar: {
          applicable: barApplicable,
          invoicedOrReceivable: barCollected,
          paid: barCollected,
          outstanding: barApplicable ? '0.00' : null,
          overdue: null,
          currency: 'BRL',
        },
        venueReceivable: {
          applicable: !!receivableSummary,
          invoicedOrReceivable: receivableSummary?.originalAmount ?? null,
          paid: receivableSummary?.totalPaid ?? null,
          outstanding: receivableSummary?.balance ?? null,
          overdue: overdueAmount,
          currency: 'USD',
        },
        totalCollected: consolidated.totalCollected,
        totalOutstanding: consolidated.totalOutstanding,
      },
      cost: {
        barCogs: barSales.length > 0 ? moneyDec(barCogs) : null,
        otherKnownOperationalCost:
          eventOpsCost.gt(0) || laborOpsTotal.gt(0)
            ? moneyDec(eventOpsCost.plus(laborOpsTotal))
            : staffCosts.length + serviceCosts.length > 0
              ? '0.00'
              : null,
        totalKnownOperationalCost:
          consolidated.knownOperationalCost != null || eventOpsCost.gt(0) || laborOpsTotal.gt(0)
            ? moneyDec(
                (consolidated.knownOperationalCost
                  ? new Prisma.Decimal(consolidated.knownOperationalCost)
                  : new Prisma.Decimal(0)
                ).plus(eventOpsCost),
              )
            : null,
        labor: laborAgg.length ? { byCurrency: laborAgg } : undefined,
      },
      result: {
        grossOperationalRevenue: consolidated.grossOperationalRevenue,
        knownOperationalCost: consolidated.knownOperationalCost,
        operationalResult: consolidated.operationalResult,
        operationalMarginPct: consolidated.operationalMarginPct,
        marginIncomplete,
      },
      multiCurrency: perCurrency.multiCurrency,
      currencyMismatch: perCurrency.currencyMismatch,
      consolidatedCurrency: perCurrency.consolidatedCurrency,
      currencies: perCurrency.currencies,
      financeiro: {
        projectionCount: financeProjections.count,
        projectionAmountInformative: moneyDec(financeProjections.amount),
        note: 'Projeções Financeiro espelham domínios (ex.: ingressos confirmados). Não somar em receita operacional.',
      },
      operationalKpis: {
        ticketsSold: ticketingLine.ticketsSold,
        attendance,
        complimentaryCount: ticketingLine.complimentaryCount,
        barSalesCount: barSales.length,
        barRevenue: barLine.amount,
        ticketRevenue: ticketingLine.amount,
        venueRevenue: venueLine.amount,
      },
      completeness,
      revenueOwnership: BCH_EVENT_FINANCIAL_REVENUE_OWNERS,
    };
  }

  async getExecutiveSummary(tenantId: string, eventId: string): Promise<BchEventExecutiveSummaryDto> {
    const full = await this.getFinancialResult(tenantId, eventId);
    return {
      eventId: full.eventId,
      eventName: full.eventName,
      eventStatus: full.eventStatus,
      eventStartAt: full.eventStartAt,
      ticketRevenue: full.revenue.ticketing.amount,
      barRevenue: full.revenue.bar.amount,
      venueRevenue: full.revenue.venueContract.amount,
      totalOperationalRevenue: full.revenue.grossOperationalRevenue,
      collected: full.collection.totalCollected,
      outstanding: full.collection.totalOutstanding,
      knownCosts: full.cost.totalKnownOperationalCost,
      operationalResult: full.result.operationalResult,
      operationalMarginPct: full.result.operationalMarginPct,
      marginIncomplete: full.result.marginIncomplete,
      multiCurrency: full.multiCurrency,
      currencyMismatch: full.currencyMismatch,
      consolidatedCurrency: full.consolidatedCurrency,
      currencies: full.currencies,
      ticketsSold: full.operationalKpis.ticketsSold,
      attendance: full.operationalKpis.attendance,
      complimentaryCount: full.operationalKpis.complimentaryCount,
      confirmedOrderCount: full.revenue.ticketing.confirmedOrderCount,
      barSalesCount: full.operationalKpis.barSalesCount,
      inventoryDivergenceProducts: full.revenue.bar.physicalDivergenceProducts,
      completeness: full.completeness,
    };
  }

  private async loadTicketingFinanceProjectionStats(tenantId: string, eventId: string) {
    const orderIds = await this.prisma.eventTicketOrder.findMany({
      where: { tenantId, eventId, status: 'confirmed' },
      select: { id: true },
    });
    if (!orderIds.length) return { count: 0, amount: new Prisma.Decimal(0) };
    const rows = await this.prisma.financeiroLancamento.findMany({
      where: {
        tenantId,
        ownershipKind: 'projection',
        sourceModule: BCH_TICKETING_FINANCE_SOURCE_MODULE,
        sourceType: BCH_TICKETING_FINANCE_SOURCE_TYPE,
        sourceId: { in: orderIds.map((o) => o.id) },
      },
      select: { valor: true },
    });
    let amount = new Prisma.Decimal(0);
    for (const r of rows) amount = amount.plus(r.valor);
    return { count: rows.length, amount };
  }

  private async computeOverdueBalance(receivableRow: {
    status: string;
    cancelledAt: Date | null;
    installments: Array<{
      cancelledAt: Date | null;
      dueDate: Date;
      amount: Prisma.Decimal;
      payments: Array<{ amount: Prisma.Decimal; voidedAt: Date | null }>;
    }>;
  }): Promise<string | null> {
    const cancelled = receivableRow.status === 'cancelled' || !!receivableRow.cancelledAt;
    if (cancelled) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let overdue = new Prisma.Decimal(0);
    for (const inst of receivableRow.installments) {
      if (inst.cancelledAt) continue;
      const paid = inst.payments
        .filter((p) => !p.voidedAt)
        .reduce((s, p) => s.plus(p.amount), new Prisma.Decimal(0));
      const balance = inst.amount.minus(paid);
      if (balance.lte(0)) continue;
      if (inst.dueDate < today) overdue = overdue.plus(balance);
    }
    return overdue.lte(0) ? '0.00' : moneyDec(overdue);
  }
}
