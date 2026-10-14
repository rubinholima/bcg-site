import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarOpenContainerService } from './boston-city-hall-bar-open-container.service';
import { BostonCityHallBarEventInventoryService } from './boston-city-hall-bar-event-inventory.service';
import { BostonCityHallBarCostService } from './boston-city-hall-bar-cost.service';
import {
  BCH_BAR_POS_PAYMENT_METHOD_LABEL,
  BCH_BAR_POS_PAYMENT_METHODS,
  BCH_BAR_SALE_PAYMENT_STATUSES,
  BCH_BAR_SALE_STATUSES,
  type BchBarPosCatalogItemDto,
  type BchBarPosPaymentMethod,
  type BchBarSaleDto,
  saleItemInventorySourceKey,
} from './boston-city-hall-bar-pos.constants';

function decStr(v: Prisma.Decimal | number | string): string {
  const d = v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
  return d.toFixed(4).replace(/\.?0+$/, '') || '0';
}

function moneyStr(v: Prisma.Decimal): string {
  return v.toFixed(2);
}

function parsePositiveQty(value: number | string, field: string): Prisma.Decimal {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException(`${field} inválido.`);
  return new Prisma.Decimal(n);
}

function parseNonNegativeMoney(value: number | string | undefined, field: string): Prisma.Decimal {
  if (value == null || value === '') return new Prisma.Decimal(0);
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${field} inválido.`);
  return new Prisma.Decimal(n);
}

type SaleWithRelations = Prisma.BchBarSaleGetPayload<{
  include: {
    location: true;
    items: { orderBy: { sortOrder: 'asc' } };
    payments: {
      orderBy: { createdAt: 'asc' };
      include: { receivedBy: { select: { name: true } } };
    };
    openedBy: { select: { name: true } };
    closedBy: { select: { name: true } };
  };
}>;

@Injectable()
export class BostonCityHallBarPosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openContainer: BostonCityHallBarOpenContainerService,
    private readonly eventInventory: BostonCityHallBarEventInventoryService,
    private readonly cost: BostonCityHallBarCostService,
  ) {}

  private assertSaleStatus(status: string): void {
    if (!BCH_BAR_SALE_STATUSES.includes(status as (typeof BCH_BAR_SALE_STATUSES)[number])) {
      throw new BadRequestException('Status de venda inválido.');
    }
  }

  private assertPaymentMethod(method: string): BchBarPosPaymentMethod {
    if (!BCH_BAR_POS_PAYMENT_METHODS.includes(method as BchBarPosPaymentMethod)) {
      throw new BadRequestException('Forma de pagamento inválida.');
    }
    return method as BchBarPosPaymentMethod;
  }

  async resolveActivePrice(
    tenantId: string,
    sellingUnitId: string,
    at: Date = new Date(),
  ): Promise<{ id: string; price: Prisma.Decimal; currency: string }> {
    const prices = await this.prisma.bchBarSellingUnitPrice.findMany({
      where: {
        tenantId,
        sellingUnitId,
        active: true,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: at } }] },
          { OR: [{ validTo: null }, { validTo: { gte: at } }] },
        ],
      },
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    });
    if (prices.length === 0) {
      throw new BadRequestException('Nenhum preço vigente para esta unidade de venda.');
    }
    const chosen = prices[0];
    return { id: chosen.id, price: chosen.price, currency: chosen.currency };
  }

  private async assertLocation(tenantId: string, locationId: string) {
    const loc = await this.prisma.bchBarInventoryLocation.findFirst({
      where: { id: locationId, tenantId, active: true },
    });
    if (!loc) throw new NotFoundException('Local de estoque não encontrado ou inativo.');
    return loc;
  }

  private async assertEvent(tenantId: string, eventId: string | null | undefined) {
    if (!eventId?.trim()) return null;
    const ev = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
    });
    if (!ev) throw new NotFoundException('Evento não encontrado.');
    return ev.id;
  }

  private async loadOpenSale(tenantId: string, saleId: string): Promise<SaleWithRelations> {
    const sale = await this.prisma.bchBarSale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        location: true,
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' }, include: { receivedBy: { select: { name: true } } } },
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    });
    if (!sale) throw new NotFoundException('Venda não encontrada.');
    return sale;
  }

  private computePaymentSummary(sale: { total: Prisma.Decimal; payments: { amount: Prisma.Decimal }[] }) {
    let paid = new Prisma.Decimal(0);
    for (const p of sale.payments) paid = paid.plus(p.amount);
    const due = sale.total.minus(paid);
    let paymentStatus: (typeof BCH_BAR_SALE_PAYMENT_STATUSES)[number] = 'unpaid';
    if (paid.gte(sale.total) && sale.total.gt(0)) paymentStatus = 'paid';
    else if (paid.gt(0)) paymentStatus = 'partial';
    return { paid, due, paymentStatus };
  }

  private mapSale(sale: SaleWithRelations): BchBarSaleDto {
    const { paid, due, paymentStatus } = this.computePaymentSummary(sale);
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      locationId: sale.locationId,
      locationCode: sale.location.code,
      locationName: sale.location.name,
      eventId: sale.eventId,
      status: sale.status,
      currency: sale.currency,
      subtotal: moneyStr(sale.subtotal),
      discountTotal: moneyStr(sale.discountTotal),
      total: moneyStr(sale.total),
      paymentStatus: sale.status === 'completed' ? sale.paymentStatus : paymentStatus,
      terminalLabel: sale.terminalLabel,
      openedByUserId: sale.openedByUserId,
      openedByName: sale.openedBy?.name ?? null,
      closedByUserId: sale.closedByUserId,
      closedByName: sale.closedBy?.name ?? null,
      openedAt: sale.openedAt.toISOString(),
      closedAt: sale.closedAt?.toISOString() ?? null,
      notes: sale.notes,
      amountPaid: moneyStr(paid),
      amountDue: due.lte(0) ? '0.00' : moneyStr(due),
      items: sale.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        sellingUnitId: i.sellingUnitId,
        productName: i.productName,
        sellingUnitName: i.sellingUnitName,
        quantity: decStr(i.quantity),
        unitPrice: moneyStr(i.unitPrice),
        lineSubtotal: moneyStr(i.lineSubtotal),
        lineDiscount: moneyStr(i.lineDiscount),
        lineTotal: moneyStr(i.lineTotal),
        currency: i.currency,
        priceId: i.priceId,
        inventoryConsumedAt: i.inventoryConsumedAt?.toISOString() ?? null,
        unitCostSnapshot: i.unitCostSnapshot != null ? moneyStr(i.unitCostSnapshot) : null,
        lineCostSnapshot: i.lineCostSnapshot != null ? moneyStr(i.lineCostSnapshot) : null,
        sortOrder: i.sortOrder,
      })),
      payments: sale.payments.map((p) => ({
        id: p.id,
        method: p.method,
        methodLabel:
          BCH_BAR_POS_PAYMENT_METHOD_LABEL[p.method as BchBarPosPaymentMethod] ?? p.method,
        amount: moneyStr(p.amount),
        amountReceived: p.amountReceived != null ? moneyStr(p.amountReceived) : null,
        changeDue: p.changeDue != null ? moneyStr(p.changeDue) : null,
        status: p.status,
        reference: p.reference,
        receivedByUserId: p.receivedByUserId,
        receivedByName: p.receivedBy?.name ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  private async nextSaleNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BCH-BAR-${year}-`;
    const last = await this.prisma.bchBarSale.findFirst({
      where: { tenantId, saleNumber: { startsWith: prefix } },
      orderBy: { saleNumber: 'desc' },
      select: { saleNumber: true },
    });
    const next = last ? Number.parseInt(last.saleNumber.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  private async recalculateSaleTotals(tx: Prisma.TransactionClient, tenantId: string, saleId: string) {
    const items = await tx.bchBarSaleItem.findMany({ where: { saleId, tenantId } });
    let subtotal = new Prisma.Decimal(0);
    let discountTotal = new Prisma.Decimal(0);
    let total = new Prisma.Decimal(0);
    for (const item of items) {
      subtotal = subtotal.plus(item.lineSubtotal);
      discountTotal = discountTotal.plus(item.lineDiscount);
      total = total.plus(item.lineTotal);
    }
    const sale = await tx.bchBarSale.findFirst({
      where: { id: saleId, tenantId },
      include: { payments: true },
    });
    if (!sale) return;
    const { paymentStatus } = this.computePaymentSummary({ total, payments: sale.payments });
    await tx.bchBarSale.update({
      where: { id: saleId },
      data: { subtotal, discountTotal, total, paymentStatus },
    });
  }

  private buildLinePricing(
    quantity: Prisma.Decimal,
    unitPrice: Prisma.Decimal,
    lineDiscount: Prisma.Decimal,
  ) {
    const lineSubtotal = unitPrice.mul(quantity);
    const lineTotal = lineSubtotal.minus(lineDiscount);
    if (lineTotal.lt(0)) throw new BadRequestException('Desconto maior que o subtotal da linha.');
    return { lineSubtotal, lineTotal };
  }

  async createSale(
    tenantId: string,
    userId: string | null,
    input: {
      locationId: string;
      eventId?: string | null;
      terminalLabel?: string | null;
      notes?: string | null;
      currency?: string;
      cashSessionId?: string | null;
    },
  ): Promise<BchBarSaleDto> {
    await this.assertLocation(tenantId, input.locationId);
    const eventId = await this.assertEvent(tenantId, input.eventId);
    await this.eventInventory.assertPosSaleLocation(tenantId, input.locationId, eventId);
    if (input.cashSessionId?.trim()) {
      const session = await this.prisma.bchPosCashSession.findFirst({
        where: {
          id: input.cashSessionId.trim(),
          tenantId,
          status: 'open',
          locationId: input.locationId,
          ...(eventId ? { eventId } : {}),
        },
      });
      if (!session) throw new BadRequestException('Sessão de caixa inválida ou fechada.');
    }
    const saleNumber = await this.nextSaleNumber(tenantId);
    const currency = input.currency?.trim() || 'BRL';
    const sale = await this.prisma.bchBarSale.create({
      data: {
        tenantId,
        saleNumber,
        locationId: input.locationId,
        eventId,
        status: 'open',
        currency,
        subtotal: new Prisma.Decimal(0),
        discountTotal: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
        paymentStatus: 'unpaid',
        terminalLabel: input.terminalLabel?.trim() || null,
        notes: input.notes?.trim() || null,
        openedByUserId: userId,
        cashSessionId: input.cashSessionId?.trim() || null,
      },
      include: {
        location: true,
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' }, include: { receivedBy: { select: { name: true } } } },
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    });
    return this.mapSale(sale);
  }

  async getSale(tenantId: string, saleId: string): Promise<BchBarSaleDto> {
    return this.mapSale(await this.loadOpenSale(tenantId, saleId));
  }

  async listSales(
    tenantId: string,
    query: { limit?: number; status?: string; locationId?: string },
  ): Promise<BchBarSaleDto[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const where: Prisma.BchBarSaleWhereInput = { tenantId };
    if (query.status?.trim()) {
      this.assertSaleStatus(query.status.trim());
      where.status = query.status.trim();
    }
    if (query.locationId?.trim()) where.locationId = query.locationId.trim();
    const rows = await this.prisma.bchBarSale.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      take: limit,
      include: {
        location: true,
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' }, include: { receivedBy: { select: { name: true } } } },
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    });
    return rows.map((s) => this.mapSale(s));
  }

  async addSaleItem(
    tenantId: string,
    saleId: string,
    input: {
      sellingUnitId: string;
      quantity: number | string;
      lineDiscount?: number | string;
      unitPrice?: number | string;
      lineTotal?: number | string;
    },
  ): Promise<BchBarSaleDto> {
    if (input.unitPrice != null || input.lineTotal != null) {
      throw new BadRequestException('Preço definido pelo cliente não é permitido.');
    }
    const sale = await this.loadOpenSale(tenantId, saleId);
    if (sale.status !== 'open') throw new BadRequestException('Venda não está aberta.');

    const quantity = parsePositiveQty(input.quantity, 'Quantidade');
    const lineDiscount = parseNonNegativeMoney(input.lineDiscount, 'Desconto');

    const sellingUnit = await this.prisma.bchBarSellingUnit.findFirst({
      where: { id: input.sellingUnitId, tenantId },
      include: { product: true },
    });
    if (!sellingUnit?.product) throw new NotFoundException('Unidade de venda não encontrada.');
    if (!sellingUnit.active || !sellingUnit.product.active) {
      throw new BadRequestException('Produto ou unidade de venda inativo.');
    }

    const priceRow = await this.resolveActivePrice(tenantId, sellingUnit.id);
    const { lineSubtotal, lineTotal } = this.buildLinePricing(quantity, priceRow.price, lineDiscount);

    const sortOrder =
      sale.items.length > 0 ? Math.max(...sale.items.map((i) => i.sortOrder)) + 1 : 0;

    await this.prisma.$transaction(async (tx) => {
      const item = await tx.bchBarSaleItem.create({
        data: {
          tenantId,
          saleId,
          productId: sellingUnit.productId,
          sellingUnitId: sellingUnit.id,
          productName: sellingUnit.product.name,
          sellingUnitName: sellingUnit.name,
          quantity,
          unitPrice: priceRow.price,
          lineSubtotal,
          lineDiscount,
          lineTotal,
          currency: priceRow.currency,
          priceId: priceRow.id,
          inventorySourceKey: 'pending',
          sortOrder,
        },
      });
      await tx.bchBarSaleItem.update({
        where: { id: item.id },
        data: { inventorySourceKey: saleItemInventorySourceKey(saleId, item.id) },
      });
      await this.recalculateSaleTotals(tx, tenantId, saleId);
    });

    return this.getSale(tenantId, saleId);
  }

  async updateSaleItem(
    tenantId: string,
    saleId: string,
    itemId: string,
    input: { quantity?: number | string; lineDiscount?: number | string; unitPrice?: number | string },
  ): Promise<BchBarSaleDto> {
    if (input.unitPrice != null) {
      throw new BadRequestException('Preço definido pelo cliente não é permitido.');
    }
    const sale = await this.loadOpenSale(tenantId, saleId);
    if (sale.status !== 'open') throw new BadRequestException('Venda não está aberta.');
    const item = sale.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item não encontrado.');

    const quantity =
      input.quantity != null ? parsePositiveQty(input.quantity, 'Quantidade') : item.quantity;
    const lineDiscount =
      input.lineDiscount != null
        ? parseNonNegativeMoney(input.lineDiscount, 'Desconto')
        : item.lineDiscount;

    const priceRow = await this.resolveActivePrice(tenantId, item.sellingUnitId);
    const { lineSubtotal, lineTotal } = this.buildLinePricing(quantity, priceRow.price, lineDiscount);

    await this.prisma.$transaction(async (tx) => {
      await tx.bchBarSaleItem.update({
        where: { id: itemId },
        data: {
          quantity,
          unitPrice: priceRow.price,
          lineSubtotal,
          lineDiscount,
          lineTotal,
          currency: priceRow.currency,
          priceId: priceRow.id,
        },
      });
      await this.recalculateSaleTotals(tx, tenantId, saleId);
    });

    return this.getSale(tenantId, saleId);
  }

  async removeSaleItem(tenantId: string, saleId: string, itemId: string): Promise<BchBarSaleDto> {
    const sale = await this.loadOpenSale(tenantId, saleId);
    if (sale.status !== 'open') throw new BadRequestException('Venda não está aberta.');
    if (!sale.items.some((i) => i.id === itemId)) throw new NotFoundException('Item não encontrado.');

    await this.prisma.$transaction(async (tx) => {
      await tx.bchBarSaleItem.delete({ where: { id: itemId, tenantId } });
      await this.recalculateSaleTotals(tx, tenantId, saleId);
    });

    return this.getSale(tenantId, saleId);
  }

  async addPayment(
    tenantId: string,
    saleId: string,
    userId: string | null,
    input: {
      method: string;
      amount: number | string;
      reference?: string | null;
      amountReceived?: number | string | null;
      changeDue?: number | string | null;
    },
  ): Promise<BchBarSaleDto> {
    const method = this.assertPaymentMethod(input.method);
    const amount = parsePositiveQty(input.amount, 'Valor pago');
    const sale = await this.loadOpenSale(tenantId, saleId);
    if (sale.status !== 'open') throw new BadRequestException('Venda não está aberta.');

    const { paid } = this.computePaymentSummary(sale);
    const remaining = sale.total.minus(paid);

    if (method !== 'cash' && amount.gt(remaining)) {
      throw new BadRequestException('Valor acima do saldo da venda não permitido para este meio.');
    }

    let amountReceived: Prisma.Decimal | null = null;
    let changeDue: Prisma.Decimal | null = null;
    if (method === 'cash') {
      if (input.amountReceived != null) {
        amountReceived = parsePositiveQty(input.amountReceived, 'Valor recebido');
        if (amountReceived.lt(amount)) {
          throw new BadRequestException('Valor recebido menor que o valor registrado.');
        }
        changeDue = amountReceived.minus(amount);
      } else if (input.changeDue != null) {
        changeDue = parseNonNegativeMoney(input.changeDue, 'Troco');
        amountReceived = amount.plus(changeDue);
      }
    } else if (input.amountReceived != null || input.changeDue != null) {
      throw new BadRequestException('Troco/recebido só se aplica a dinheiro.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bchBarSalePayment.create({
        data: {
          tenantId,
          saleId,
          method,
          amount,
          amountReceived,
          changeDue,
          reference: input.reference?.trim() || null,
          receivedByUserId: userId,
        },
      });
      await this.recalculateSaleTotals(tx, tenantId, saleId);
    });

    return this.getSale(tenantId, saleId);
  }

  async removePayment(
    tenantId: string,
    saleId: string,
    paymentId: string,
  ): Promise<BchBarSaleDto> {
    const sale = await this.loadOpenSale(tenantId, saleId);
    if (sale.status !== 'open') throw new BadRequestException('Venda não está aberta.');
    if (!sale.payments.some((p) => p.id === paymentId)) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bchBarSalePayment.delete({ where: { id: paymentId, tenantId } });
      await this.recalculateSaleTotals(tx, tenantId, saleId);
    });

    return this.getSale(tenantId, saleId);
  }

  async completeSale(tenantId: string, saleId: string, userId: string | null): Promise<BchBarSaleDto> {
    const existing = await this.loadOpenSale(tenantId, saleId);
    if (existing.status === 'completed') return this.mapSale(existing);
    if (existing.status === 'cancelled') {
      throw new BadRequestException('Venda cancelada não pode ser concluída.');
    }
    if (existing.status !== 'open') throw new BadRequestException('Venda não está aberta.');
    if (existing.items.length === 0) {
      throw new BadRequestException('Adicione itens antes de concluir.');
    }

    const { paid } = this.computePaymentSummary(existing);
    if (paid.lt(existing.total)) {
      throw new BadRequestException('Pagamento insuficiente para concluir a venda.');
    }

    for (const item of existing.items) {
      if (item.inventoryConsumedAt) continue;
      const avail = await this.openContainer.getSellingUnitAvailability(
        tenantId,
        item.sellingUnitId,
        existing.locationId,
      );
      const need = item.quantity;
      const have = new Prisma.Decimal(avail.fulfillableUnits);
      if (have.lt(need)) {
        throw new BadRequestException(
          `Estoque insuficiente para ${item.productName} (${item.sellingUnitName}).`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const sale = await tx.bchBarSale.findFirst({
        where: { id: saleId, tenantId, status: 'open' },
        include: { items: { orderBy: { sortOrder: 'asc' } }, payments: true },
      });
      if (!sale) {
        const done = await tx.bchBarSale.findFirst({ where: { id: saleId, tenantId, status: 'completed' } });
        if (done) return;
        throw new BadRequestException('Venda não está aberta.');
      }

      const paidNow = sale.payments.reduce((s, p) => s.plus(p.amount), new Prisma.Decimal(0));
      if (paidNow.lt(sale.total)) {
        throw new BadRequestException('Pagamento insuficiente para concluir a venda.');
      }

      for (const item of sale.items) {
        if (item.inventoryConsumedAt) continue;

        const consume = await this.openContainer.consumeSellingUnitInTransaction(
          tx,
          tenantId,
          userId,
          {
            sellingUnitId: item.sellingUnitId,
            locationId: sale.locationId,
            consumptionType: 'sale',
            eventId: sale.eventId,
            sourceKey: item.inventorySourceKey,
            portions: item.quantity,
          },
        );

        const at = new Date();
        const costSnap = await this.cost.computeLineCostSnapshot(
          tenantId,
          item.productId,
          item.sellingUnitId,
          item.quantity,
          at,
        );

        await tx.bchBarSaleItem.update({
          where: { id: item.id },
          data: {
            inventoryConsumedAt: at,
            inventoryMode: consume.mode,
            inventoryRefId: consume.stockMovementId ?? consume.openContainerLedgerId ?? null,
            unitCostSnapshot: costSnap?.unitCostSnapshot ?? null,
            lineCostSnapshot: costSnap?.lineCostSnapshot ?? null,
          },
        });
      }

      await tx.bchBarSale.update({
        where: { id: saleId },
        data: {
          status: 'completed',
          paymentStatus: 'paid',
          closedAt: new Date(),
          closedByUserId: userId,
        },
      });
    });

    return this.getSale(tenantId, saleId);
  }

  async cancelOpenSale(tenantId: string, saleId: string, userId: string | null): Promise<BchBarSaleDto> {
    const sale = await this.loadOpenSale(tenantId, saleId);
    if (sale.status === 'completed') {
      throw new BadRequestException('Venda concluída não pode ser cancelada nesta fase.');
    }
    if (sale.status === 'cancelled') return this.mapSale(sale);
    if (sale.status !== 'open') throw new BadRequestException('Venda não está aberta.');

    await this.prisma.bchBarSale.update({
      where: { id: saleId },
      data: {
        status: 'cancelled',
        closedAt: new Date(),
        closedByUserId: userId,
      },
    });

    return this.getSale(tenantId, saleId);
  }

  async getPosCatalog(
    tenantId: string,
    locationId?: string | null,
  ): Promise<BchBarPosCatalogItemDto[]> {
    const products = await this.prisma.bchBarProduct.findMany({
      where: { tenantId, active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        sellingUnits: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const at = new Date();
    const out: BchBarPosCatalogItemDto[] = [];

    for (const product of products) {
      for (const su of product.sellingUnits) {
        let priceRow: { id: string; price: Prisma.Decimal; currency: string };
        try {
          priceRow = await this.resolveActivePrice(tenantId, su.id, at);
        } catch {
          continue;
        }

        let availability: BchBarPosCatalogItemDto['availability'] = null;
        let fulfillableUnits: string | null = null;
        if (locationId?.trim()) {
          const avail = await this.openContainer.getSellingUnitAvailability(
            tenantId,
            su.id,
            locationId.trim(),
          );
          fulfillableUnits = avail.fulfillableUnits;
          const n = new Prisma.Decimal(avail.fulfillableUnits);
          if (n.lte(0)) availability = 'unavailable';
          else if (n.lte(3)) availability = 'low';
          else availability = 'available';
        }

        out.push({
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          category: product.category,
          sellingUnitId: su.id,
          sellingUnitName: su.name,
          unitPrice: moneyStr(priceRow.price),
          currency: priceRow.currency,
          priceId: priceRow.id,
          availability,
          fulfillableUnits,
        });
      }
    }

    return out;
  }
}
