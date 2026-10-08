import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarEventInventoryService } from './boston-city-hall-bar-event-inventory.service';
import { BCH_BAR_POS_PAYMENT_METHOD_LABEL } from './boston-city-hall-bar-pos.constants';
import type {
  BchBarDashboardDto,
  BchBarPaymentMethodRow,
  BchBarProductPerformanceRow,
  BchBarReportPeriodQuery,
  BchBarSalesReportDto,
} from './boston-city-hall-bar-reports.constants';

function money(v: Prisma.Decimal): string {
  return v.toFixed(2);
}

function dec(v: Prisma.Decimal | number): string {
  const d = v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
  return d.toFixed(4).replace(/\.?0+$/, '') || '0';
}

function parsePeriod(query: BchBarReportPeriodQuery): { from: Date; to: Date } {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

@Injectable()
export class BostonCityHallBarReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventInventory: BostonCityHallBarEventInventoryService,
  ) {}

  private saleWhere(tenantId: string, query: BchBarReportPeriodQuery, from: Date, to: Date) {
    const status = query.status?.trim() || 'completed';
    const where: Prisma.BchBarSaleWhereInput = {
      tenantId,
      status,
      closedAt: { gte: from, lte: to },
    };
    if (query.eventId?.trim()) where.eventId = query.eventId.trim();
    if (query.locationId?.trim()) where.locationId = query.locationId.trim();
    if (query.operatorUserId?.trim()) where.closedByUserId = query.operatorUserId.trim();
    return where;
  }

  async getDashboard(tenantId: string, query: BchBarReportPeriodQuery): Promise<BchBarDashboardDto> {
    const { from, to } = parsePeriod(query);
    const sales = await this.prisma.bchBarSale.findMany({
      where: this.saleWhere(tenantId, query, from, to),
      include: { items: true },
    });

    let revenue = new Prisma.Decimal(0);
    let cogs = new Prisma.Decimal(0);
    let itemsSold = new Prisma.Decimal(0);
    let missingCostLines = 0;
    let totalLines = 0;

    for (const s of sales) {
      revenue = revenue.plus(s.total);
      for (const i of s.items) {
        itemsSold = itemsSold.plus(i.quantity);
        totalLines += 1;
        if (i.lineCostSnapshot != null) cogs = cogs.plus(i.lineCostSnapshot);
        else missingCostLines += 1;
      }
    }

    const margin = revenue.minus(cogs);
    const marginPct = revenue.gt(0) ? margin.div(revenue).mul(100) : null;

    const balances = await this.prisma.bchBarStockBalance.findMany({ where: { tenantId } });
    let low = 0;
    let out = 0;
    const lowThreshold = new Prisma.Decimal(5);
    for (const b of balances) {
      if (b.quantityOnHand.lte(0)) out += 1;
      else if (b.quantityOnHand.lte(lowThreshold)) low += 1;
    }

    const openContainers = await this.prisma.bchBarOpenContainer.count({
      where: { tenantId, status: 'open' },
    });
    const activeInv = await this.prisma.bchBarEventInventory.count({
      where: { tenantId, status: 'active' },
    });

    const recentCounts = await this.prisma.bchBarPhysicalCount.findMany({
      where: {
        tenantId,
        status: 'completed',
        completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { items: true },
    });
    let divProducts = 0;
    for (const c of recentCounts) {
      for (const i of c.items) {
        if (i.divergenceQuantity && !i.divergenceQuantity.isZero()) divProducts += 1;
      }
    }

    return {
      periodFrom: from.toISOString(),
      periodTo: to.toISOString(),
      salesCount: sales.length,
      revenue: money(revenue),
      estimatedCogs: money(cogs),
      estimatedGrossMargin: money(margin),
      estimatedGrossMarginPct: marginPct != null ? marginPct.toFixed(2) : null,
      itemsSold: dec(itemsSold),
      lowStockProducts: low,
      outOfStockProducts: out,
      openContainers,
      activeEventInventories: activeInv,
      recentDivergenceProducts: divProducts,
      marginIncomplete: missingCostLines > 0 && missingCostLines === totalLines ? true : missingCostLines > 0,
    };
  }

  async getSalesReport(tenantId: string, query: BchBarReportPeriodQuery): Promise<BchBarSalesReportDto> {
    const { from, to } = parsePeriod(query);
    const sales = await this.prisma.bchBarSale.findMany({
      where: this.saleWhere(tenantId, query, from, to),
      include: { items: true },
    });

    let units = new Prisma.Decimal(0);
    let gross = new Prisma.Decimal(0);
    let discount = new Prisma.Decimal(0);
    let net = new Prisma.Decimal(0);
    let cogs = new Prisma.Decimal(0);
    let missing = 0;
    let lines = 0;

    for (const s of sales) {
      gross = gross.plus(s.subtotal);
      discount = discount.plus(s.discountTotal);
      net = net.plus(s.total);
      for (const i of s.items) {
        if (query.productId && i.productId !== query.productId) continue;
        if (query.sellingUnitId && i.sellingUnitId !== query.sellingUnitId) continue;
        units = units.plus(i.quantity);
        lines += 1;
        if (i.lineCostSnapshot != null) cogs = cogs.plus(i.lineCostSnapshot);
        else missing += 1;
      }
    }

    const avg = sales.length > 0 ? net.div(sales.length) : new Prisma.Decimal(0);
    return {
      salesCount: sales.length,
      unitsSold: dec(units),
      grossSales: money(gross),
      discountTotal: money(discount),
      netSales: money(net),
      averageTicket: money(avg),
      estimatedCogs: money(cogs),
      estimatedGrossMargin: money(net.minus(cogs)),
      marginIncomplete: missing > 0,
    };
  }

  async getProductPerformance(
    tenantId: string,
    query: BchBarReportPeriodQuery,
  ): Promise<BchBarProductPerformanceRow[]> {
    const { from, to } = parsePeriod(query);
    const items = await this.prisma.bchBarSaleItem.findMany({
      where: {
        tenantId,
        sale: this.saleWhere(tenantId, query, from, to),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.sellingUnitId ? { sellingUnitId: query.sellingUnitId } : {}),
      },
    });

    const map = new Map<
      string,
      {
        productId: string;
        productName: string;
        sellingUnitId: string;
        sellingUnitName: string;
        qty: Prisma.Decimal;
        revenue: Prisma.Decimal;
        cost: Prisma.Decimal;
        missingCost: boolean;
      }
    >();

    for (const i of items) {
      const key = `${i.productId}:${i.sellingUnitId}`;
      const cur = map.get(key) ?? {
        productId: i.productId,
        productName: i.productName,
        sellingUnitId: i.sellingUnitId,
        sellingUnitName: i.sellingUnitName,
        qty: new Prisma.Decimal(0),
        revenue: new Prisma.Decimal(0),
        cost: new Prisma.Decimal(0),
        missingCost: false,
      };
      cur.qty = cur.qty.plus(i.quantity);
      cur.revenue = cur.revenue.plus(i.lineTotal);
      if (i.lineCostSnapshot != null) cur.cost = cur.cost.plus(i.lineCostSnapshot);
      else cur.missingCost = true;
      map.set(key, cur);
    }

    const locFilter = query.locationId?.trim();
    const movWhere: Prisma.BchBarStockMovementWhereInput = {
      tenantId,
      createdAt: { gte: from, lte: to },
      ...(query.eventId ? { eventId: query.eventId } : {}),
      ...(locFilter ? { locationId: locFilter } : {}),
    };

    const complimentary = await this.prisma.bchBarStockMovement.groupBy({
      by: ['productId'],
      where: { ...movWhere, movementType: 'complimentary', direction: 'out' },
      _sum: { quantity: true },
    });
    const waste = await this.prisma.bchBarStockMovement.groupBy({
      by: ['productId'],
      where: {
        ...movWhere,
        movementType: { in: ['breakage', 'spill_waste'] },
        direction: 'out',
      },
      _sum: { quantity: true },
    });
    const compMap = new Map(complimentary.map((r) => [r.productId, r._sum.quantity ?? new Prisma.Decimal(0)]));
    const wasteMap = new Map(waste.map((r) => [r.productId, r._sum.quantity ?? new Prisma.Decimal(0)]));

    return [...map.values()].map((r) => {
      const margin = r.revenue.minus(r.cost);
      const pct = r.revenue.gt(0) ? margin.div(r.revenue).mul(100) : null;
      return {
        productId: r.productId,
        productName: r.productName,
        sellingUnitId: r.sellingUnitId,
        sellingUnitName: r.sellingUnitName,
        quantitySold: dec(r.qty),
        revenue: money(r.revenue),
        expectedCost: money(r.cost),
        grossMargin: money(margin),
        grossMarginPct: pct != null ? pct.toFixed(2) : null,
        complimentaryQty: dec(compMap.get(r.productId) ?? 0),
        wasteQty: dec(wasteMap.get(r.productId) ?? 0),
        marginIncomplete: r.missingCost,
      };
    });
  }

  async getPaymentMethodReport(
    tenantId: string,
    query: BchBarReportPeriodQuery,
  ): Promise<BchBarPaymentMethodRow[]> {
    const { from, to } = parsePeriod(query);
    const payments = await this.prisma.bchBarSalePayment.findMany({
      where: {
        tenantId,
        sale: this.saleWhere(tenantId, query, from, to),
        ...(query.paymentMethod ? { method: query.paymentMethod } : {}),
      },
    });
    const map = new Map<string, { count: number; total: Prisma.Decimal }>();
    for (const p of payments) {
      const cur = map.get(p.method) ?? { count: 0, total: new Prisma.Decimal(0) };
      cur.count += 1;
      cur.total = cur.total.plus(p.amount);
      map.set(p.method, cur);
    }
    return [...map.entries()].map(([method, v]) => ({
      method,
      methodLabel:
        BCH_BAR_POS_PAYMENT_METHOD_LABEL[method as keyof typeof BCH_BAR_POS_PAYMENT_METHOD_LABEL] ?? method,
      count: v.count,
      totalAmount: money(v.total),
    }));
  }

  async getEventReport(tenantId: string, eventId: string) {
    const inv = await this.prisma.bchBarEventInventory.findFirst({
      where: { tenantId, eventId },
      orderBy: { createdAt: 'desc' },
    });
    const summary = inv ? await this.eventInventory.getSummary(tenantId, inv.id) : null;

    const sales = await this.prisma.bchBarSale.findMany({
      where: { tenantId, eventId, status: 'completed' },
      include: { items: true },
    });
    let revenue = new Prisma.Decimal(0);
    let cogs = new Prisma.Decimal(0);
    for (const s of sales) {
      revenue = revenue.plus(s.total);
      for (const i of s.items) {
        if (i.lineCostSnapshot != null) cogs = cogs.plus(i.lineCostSnapshot);
      }
    }

    return {
      eventId,
      eventInventoryId: inv?.id ?? null,
      inventorySummary: summary,
      revenue: money(revenue),
      estimatedCogs: money(cogs),
      estimatedGrossMargin: money(revenue.minus(cogs)),
      salesCount: sales.length,
    };
  }

  async getLossDivergenceReport(tenantId: string, query: BchBarReportPeriodQuery) {
    const { from, to } = parsePeriod(query);
    const types = [
      'breakage',
      'spill_waste',
      'internal_use',
      'tasting',
      'complimentary',
      'physical_count_adjustment',
      'other',
    ] as const;
    const where: Prisma.BchBarStockMovementWhereInput = {
      tenantId,
      direction: 'out',
      createdAt: { gte: from, lte: to },
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.eventId ? { eventId: query.eventId } : {}),
    };
    const rows = await this.prisma.bchBarStockMovement.groupBy({
      by: ['movementType'],
      where: { ...where, movementType: { in: [...types] } },
      _sum: { quantity: true },
    });
    return rows.map((r) => ({
      movementType: r.movementType,
      quantity: dec(r._sum.quantity ?? 0),
    }));
  }

  async getInventoryReport(tenantId: string, query: BchBarReportPeriodQuery) {
    const { from, to } = parsePeriod(query);
    const locationId = query.locationId?.trim();
    const movWhere: Prisma.BchBarStockMovementWhereInput = {
      tenantId,
      createdAt: { gte: from, lte: to },
      ...(locationId ? { locationId } : {}),
      ...(query.eventId ? { eventId: query.eventId } : {}),
    };
    const grouped = await this.prisma.bchBarStockMovement.groupBy({
      by: ['movementType', 'direction'],
      where: movWhere,
      _sum: { quantity: true },
    });
    const balances = await this.prisma.bchBarStockBalance.findMany({
      where: { tenantId, ...(locationId ? { locationId } : {}) },
      include: { product: { select: { name: true, sku: true } } },
    });
    return {
      periodFrom: from.toISOString(),
      periodTo: to.toISOString(),
      movements: grouped.map((g) => ({
        movementType: g.movementType,
        direction: g.direction,
        quantity: dec(g._sum.quantity ?? 0),
      })),
      currentBalances: balances.map((b) => ({
        productId: b.productId,
        productName: b.product.name,
        productSku: b.product.sku,
        quantityOnHand: dec(b.quantityOnHand),
        locationId: b.locationId,
      })),
    };
  }

  async getOperatorReport(tenantId: string, query: BchBarReportPeriodQuery) {
    const { from, to } = parsePeriod(query);
    const sales = await this.prisma.bchBarSale.findMany({
      where: this.saleWhere(tenantId, query, from, to),
      include: { closedBy: { select: { name: true } } },
    });
    const map = new Map<string, { name: string | null; count: number; revenue: Prisma.Decimal }>();
    for (const s of sales) {
      const key = s.closedByUserId ?? 'unknown';
      const cur = map.get(key) ?? { name: s.closedBy?.name ?? null, count: 0, revenue: new Prisma.Decimal(0) };
      cur.count += 1;
      cur.revenue = cur.revenue.plus(s.total);
      map.set(key, cur);
    }
    return [...map.entries()].map(([operatorUserId, v]) => ({
      operatorUserId: operatorUserId === 'unknown' ? null : operatorUserId,
      operatorName: v.name,
      salesCount: v.count,
      revenue: money(v.revenue),
    }));
  }
}
