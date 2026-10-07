import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import {
  pickCurrentLot,
  resolveTypeAvailability,
  type InventoryCounters,
  type LotRow,
  type TypeRow,
} from './boston-city-hall-ticketing.availability';
import {
  BostonCityHallTicketInventoryService,
  type TicketInventoryMaps,
} from './boston-city-hall-ticket-inventory.service';
import {
  BCH_TICKET_ORDER_HOLD_MINUTES,
  BCH_TICKET_ORDER_NUMBER_PREFIX,
  type EventTicketOrderDetailDto,
  type EventTicketOrderListItemDto,
  type EventTicketOrderPaymentSummaryDto,
  type EventTicketOrderStatus,
} from './boston-city-hall-ticket-orders.constants';
import { BostonCityHallTicketPaymentService } from './boston-city-hall-ticket-payment.service';
import { BostonCityHallTicketFinanceProjectionService } from './boston-city-hall-ticket-finance-projection.service';
import { normalizeTicketingCurrency } from './boston-city-hall-ticketing-currency.constants';
import type { EventTicketOrderFinanceProjectionDto } from './boston-city-hall-ticket-orders.constants';

function moneyToString(value: Prisma.Decimal | number | string): string {
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

function countersFromMaps(
  maps: TicketInventoryMaps,
  inv: BostonCityHallTicketInventoryService,
): InventoryCounters {
  return {
    soldForType: (id) => inv.soldForType(maps, id),
    heldForType: (id) => inv.heldForType(maps, id),
    soldForLot: (id) => inv.soldForLot(maps, id),
    heldForLot: (id) => inv.heldForLot(maps, id),
  };
}

type ResolvedLine = {
  ticketTypeId: string;
  ticketLotId: string | null;
  ticketTypeName: string;
  lotName: string | null;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
};

@Injectable()
export class BostonCityHallTicketOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: BostonCityHallTicketInventoryService,
    private readonly ticketPayment: BostonCityHallTicketPaymentService,
    private readonly ticketFinanceProjection: BostonCityHallTicketFinanceProjectionService,
  ) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant "${venueSlug}" não encontrado.`);
    return tenant.id;
  }

  private async nextOrderNumber(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const seqRow = await tx.eventTicketOrderNumberSeq.upsert({
      where: { tenantId_year: { tenantId, year } },
      create: { tenantId, year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    return `${BCH_TICKET_ORDER_NUMBER_PREFIX}-${year}-${String(seqRow.lastSeq).padStart(6, '0')}`;
  }

  private normalizeStatus(
    row: { status: string; holdExpiresAt: Date | null },
    now: Date,
  ): EventTicketOrderStatus {
    if (row.status === 'pending' && row.holdExpiresAt && row.holdExpiresAt <= now) {
      return 'expired';
    }
    if (
      row.status === 'pending' ||
      row.status === 'confirmed' ||
      row.status === 'cancelled' ||
      row.status === 'expired'
    ) {
      return row.status;
    }
    return 'pending';
  }

  private async maybeMarkExpired(tx: Prisma.TransactionClient, id: string, tenantId: string, now: Date) {
    const res = await tx.eventTicketOrder.updateMany({
      where: {
        id,
        tenantId,
        status: 'pending',
        holdExpiresAt: { lte: now },
      },
      data: { status: 'expired' },
    });
    if (res.count > 0) {
      await this.ticketPayment.syncPaymentAfterOrderExpired(id, tenantId, now);
    }
  }

  private toDetail(
    row: Prisma.EventTicketOrderGetPayload<{
      include: {
        items: true;
        event: { select: { name: true; slug: true } };
        payment: true;
      };
    }>,
    now: Date,
    payment?: EventTicketOrderPaymentSummaryDto | null,
    financeProjection?: EventTicketOrderFinanceProjectionDto | null,
  ): EventTicketOrderDetailDto {
    const status = this.normalizeStatus(row, now);
    const paymentSummary = payment ?? this.ticketPayment.serializePaymentRow(row.payment);
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      eventId: row.eventId,
      eventName: row.event.name,
      eventSlug: row.event.slug,
      status,
      customerId: row.customerId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      customerDocument: row.customerDocument,
      subtotal: moneyToString(row.subtotal),
      discount: moneyToString(row.discount),
      fees: moneyToString(row.fees),
      total: moneyToString(row.total),
      currency: row.currency,
      holdExpiresAt: row.holdExpiresAt?.toISOString() ?? null,
      payment: paymentSummary,
      financeProjection: financeProjection ?? null,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      items: row.items.map((it) => ({
        id: it.id,
        ticketTypeId: it.ticketTypeId,
        ticketLotId: it.ticketLotId,
        ticketTypeName: it.ticketTypeName,
        lotName: it.lotName,
        quantity: it.quantity,
        unitPrice: moneyToString(it.unitPrice),
        totalPrice: moneyToString(it.totalPrice),
      })),
    };
  }

  async listOrders(filters: {
    eventId?: string;
    status?: string;
    q?: string;
  }): Promise<EventTicketOrderListItemDto[]> {
    const tenantId = await this.resolveTenantId();
    const now = new Date();
    const where: Prisma.EventTicketOrderWhereInput = { tenantId };
    if (filters.eventId?.trim()) where.eventId = filters.eventId.trim();
    if (filters.status?.trim() && filters.status !== 'all') {
      if (filters.status === 'expired') {
        where.OR = [
          { status: 'expired' },
          { status: 'pending', holdExpiresAt: { lte: now } },
        ];
      } else if (filters.status === 'pending') {
        where.status = 'pending';
        where.holdExpiresAt = { gt: now };
      } else {
        where.status = filters.status.trim();
      }
    }
    const q = filters.q?.trim();
    if (q) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { customerName: { contains: q, mode: 'insensitive' } },
            { customerEmail: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const rows = await this.prisma.eventTicketOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        event: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      eventId: r.eventId,
      eventName: r.event.name,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      total: moneyToString(r.total),
      currency: r.currency,
      status: this.normalizeStatus(r, now),
      holdExpiresAt: r.holdExpiresAt?.toISOString() ?? null,
      itemsCount: r._count.items,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getOrder(id: string): Promise<EventTicketOrderDetailDto> {
    const tenantId = await this.resolveTenantId();
    const now = new Date();
    await this.maybeMarkExpired(this.prisma, id, tenantId, now);
    const row = await this.prisma.eventTicketOrder.findFirst({
      where: { id, tenantId },
      include: { items: true, event: { select: { name: true, slug: true } }, payment: true },
    });
    if (!row) throw new NotFoundException('Pedido não encontrado.');
    let paymentSummary = this.ticketPayment.serializePaymentRow(row.payment);
    if (!paymentSummary && row.status === 'pending') {
      try {
        paymentSummary = await this.ticketPayment.ensurePaymentForOrder(id, tenantId);
      } catch {
        /* pedido legado sem pagamento — não bloquear detalhe */
      }
    }

    const status = this.normalizeStatus(row, now);
    let financeProjection: EventTicketOrderFinanceProjectionDto | null = null;
    if (status === 'confirmed' && paymentSummary?.status === 'paid') {
      const ensured = await this.ticketFinanceProjection.ensureProjectionForOrder(id, tenantId);
      if (ensured.projection) {
        financeProjection = {
          id: ensured.projection.id,
          status: ensured.projection.status,
        };
      }
    } else {
      const existing = await this.ticketFinanceProjection.findProjectionForOrder(tenantId, id);
      if (existing) {
        financeProjection = { id: existing.id, status: existing.status };
      }
    }

    return this.toDetail(row, now, paymentSummary, financeProjection);
  }

  async cancelOrder(id: string): Promise<EventTicketOrderDetailDto> {
    const tenantId = await this.resolveTenantId();
    const now = new Date();
    const row = await this.prisma.eventTicketOrder.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Pedido não encontrado.');
    const effective = this.normalizeStatus(row, now);
    if (effective !== 'pending') {
      throw new BadRequestException('Só pedidos pendentes podem ser cancelados.');
    }
    await this.prisma.eventTicketOrder.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: now },
    });
    await this.ticketPayment.syncPaymentAfterOrderCancelled(id, tenantId, now);
    return this.getOrder(id);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async resolveCustomerId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: { name: string; email: string; phone?: string; document?: string },
  ): Promise<string | null> {
    const name = input.name.trim();
    const email = this.normalizeEmail(input.email);
    if (!name || !email) throw new BadRequestException('Nome e e-mail são obrigatórios.');

    const existing = await tx.customer.findFirst({
      where: { tenantId, email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      const phone = input.phone?.trim() || null;
      const document = input.document?.trim() || null;
      if ((phone && !existing.phone) || (document && !existing.document)) {
        await tx.customer.update({
          where: { id: existing.id },
          data: {
            ...(phone && !existing.phone ? { phone } : {}),
            ...(document && !existing.document ? { document } : {}),
          },
        });
      }
      return existing.id;
    }

    const created = await tx.customer.create({
      data: {
        tenantId,
        name,
        email,
        phone: input.phone?.trim() || null,
        document: input.document?.trim() || null,
      },
    });
    return created.id;
  }

  private validateSalesAllowed(
    typeRow: TypeRow,
    typeId: string,
    counters: InventoryCounters,
    now: Date,
    ticketingEnabled: boolean,
  ) {
    if (!ticketingEnabled) {
      throw new BadRequestException('Ingressos não habilitados para este evento.');
    }
    const avail = resolveTypeAvailability(typeRow, typeId, now, counters);
    if (avail.salesStatus !== 'on_sale') {
      throw new BadRequestException(`Tipo indisponível para venda (${avail.salesStatus}).`);
    }
    return avail;
  }

  async createOrder(dto: {
    eventId: string;
    customer: { name: string; email: string; phone?: string; document?: string };
    items: Array<{ ticketTypeId: string; quantity: number | string }>;
  }): Promise<EventTicketOrderDetailDto> {
    const tenantId = await this.resolveTenantId();
    const eventId = dto.eventId?.trim();
    if (!eventId) throw new BadRequestException('Evento é obrigatório.');
    if (!dto.items?.length) throw new BadRequestException('Informe ao menos um item.');

    const now = new Date();
    const holdExpiresAt = new Date(now.getTime() + BCH_TICKET_ORDER_HOLD_MINUTES * 60 * 1000);

    const aggregated = new Map<string, number>();
    for (const item of dto.items) {
      const typeId = item.ticketTypeId?.trim();
      if (!typeId) throw new BadRequestException('ticketTypeId inválido.');
      const qty =
        typeof item.quantity === 'number'
          ? item.quantity
          : Number.parseInt(String(item.quantity), 10);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new BadRequestException('Quantidade inválida.');
      }
      aggregated.set(typeId, (aggregated.get(typeId) ?? 0) + qty);
    }

    const typeIds = [...aggregated.keys()].sort();

    const orderId = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: eventId, tenantId },
        include: { ticketing: true },
      });
      if (!event) throw new NotFoundException('Evento não encontrado.');
      const ticketingEnabled = event.ticketing?.enabled ?? false;

      await this.inventory.lockTicketTypes(tx, typeIds);

      const types = await tx.eventTicketType.findMany({
        where: { tenantId, eventId, id: { in: typeIds } },
        include: { lots: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      });
      if (types.length !== typeIds.length) {
        throw new BadRequestException('Tipo de ingresso inválido para este evento.');
      }

      const maps = await this.inventory.loadInTransaction(tx, tenantId, eventId, now);
      const counters = countersFromMaps(maps, this.inventory);

      const resolved: ResolvedLine[] = [];
      const lotIdsToLock: string[] = [];

      for (const type of types) {
        const qtyRequested = aggregated.get(type.id)!;
        if (type.purchaseLimit != null && qtyRequested > type.purchaseLimit) {
          throw new BadRequestException(
            `Limite por compra (${type.purchaseLimit}) excedido para "${type.name}".`,
          );
        }

        const typeRow: TypeRow = {
          active: type.active,
          price: type.price,
          quantity: type.quantity,
          salesStartAt: type.salesStartAt,
          salesEndAt: type.salesEndAt,
          lots: type.lots as LotRow[],
        };

        this.validateSalesAllowed(typeRow, type.id, counters, now, ticketingEnabled);

        const usesLots = type.lots.length > 0;
        if (usesLots) {
          const picked = pickCurrentLot(type.lots as LotRow[], now, counters);
          if (!picked) {
            throw new BadRequestException(`Sem lote vendável para "${type.name}".`);
          }
          if (qtyRequested > picked.available) {
            throw new BadRequestException(
              `Disponibilidade insuficiente para "${type.name}" (restam ${picked.available}).`,
            );
          }
          lotIdsToLock.push(picked.lot.id);
          const unit = picked.lot.price;
          const total = unit.mul(qtyRequested).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          resolved.push({
            ticketTypeId: type.id,
            ticketLotId: picked.lot.id,
            ticketTypeName: type.name,
            lotName: picked.lot.name,
            quantity: qtyRequested,
            unitPrice: unit,
            totalPrice: total,
          });
        } else {
          const avail = resolveTypeAvailability(typeRow, type.id, now, counters);
          if (qtyRequested > avail.available) {
            throw new BadRequestException(
              `Disponibilidade insuficiente para "${type.name}" (restam ${avail.available}).`,
            );
          }
          if (type.price == null) {
            throw new BadRequestException(`Preço não configurado para "${type.name}".`);
          }
          const unit = type.price;
          const total = unit.mul(qtyRequested).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          resolved.push({
            ticketTypeId: type.id,
            ticketLotId: null,
            ticketTypeName: type.name,
            lotName: null,
            quantity: qtyRequested,
            unitPrice: unit,
            totalPrice: total,
          });
        }
      }

      await this.inventory.lockTicketLots(tx, lotIdsToLock);

      const customerId = await this.resolveCustomerId(tx, tenantId, dto.customer);
      const customerName = dto.customer.name.trim();
      const customerEmail = this.normalizeEmail(dto.customer.email);

      let subtotal = new Prisma.Decimal(0);
      for (const line of resolved) {
        subtotal = subtotal.add(line.totalPrice);
      }
      subtotal = subtotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const discount = new Prisma.Decimal(0);
      const fees = new Prisma.Decimal(0);
      const total = subtotal;

      const orderNumber = await this.nextOrderNumber(tx, tenantId);
      const currency = normalizeTicketingCurrency(event.ticketing?.currency);

      const order = await tx.eventTicketOrder.create({
        data: {
          tenantId,
          eventId,
          orderNumber,
          status: 'pending',
          customerId,
          customerName,
          customerEmail,
          customerPhone: dto.customer.phone?.trim() || null,
          customerDocument: dto.customer.document?.trim() || null,
          subtotal,
          discount,
          fees,
          total,
          currency,
          holdExpiresAt,
          items: {
            create: resolved.map((line) => ({
              ticketTypeId: line.ticketTypeId,
              ticketLotId: line.ticketLotId,
              ticketTypeName: line.ticketTypeName,
              lotName: line.lotName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              totalPrice: line.totalPrice,
            })),
          },
        },
      });
      return order.id;
    });

    await this.ticketPayment.ensurePaymentForOrder(orderId, tenantId);
    return this.getOrder(orderId);
  }
}
