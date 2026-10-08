import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';
import { BostonCityHallBarStockService } from './boston-city-hall-bar-stock.service';
import {
  BCH_BAR_EVENT_INVENTORY_OPERATION,
  BCH_BAR_EVENT_INVENTORY_REF_TYPE,
  BCH_BAR_EVENT_INVENTORY_STATUSES,
  type BchBarEventInventoryDto,
  type BchBarEventInventorySummaryDto,
  type BchBarEventInventorySummaryLineDto,
} from './boston-city-hall-bar-event-inventory.constants';
import { BCH_BAR_CONTENT_EMPTY_TOLERANCE } from './boston-city-hall-bar-portion.util';

function decStr(v: Prisma.Decimal | number): string {
  const d = v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
  return d.toFixed(4).replace(/\.?0+$/, '') || '0';
}

type InvRow = Prisma.BchBarEventInventoryGetPayload<{
  include: {
    event: { select: { name: true } };
    location: { select: { code: true; name: true; kind: true; eventId: true } };
    openedBy: { select: { name: true } };
    closedBy: { select: { name: true } };
  };
}>;

@Injectable()
export class BostonCityHallBarEventInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bar: BostonCityHallBarService,
    private readonly stock: BostonCityHallBarStockService,
  ) {}

  private async centralLocationId(tenantId: string): Promise<string> {
    const central = await this.bar.ensureCentralLocation(tenantId);
    return central.id;
  }

  private mapInv(row: InvRow, openContainersUnresolved = 0): BchBarEventInventoryDto {
    return {
      id: row.id,
      eventId: row.eventId,
      eventTitle: row.event?.name ?? null,
      locationId: row.locationId,
      locationCode: row.location.code,
      locationName: row.location.name,
      status: row.status,
      openedAt: row.openedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      openedByUserId: row.openedByUserId,
      openedByName: row.openedBy?.name ?? null,
      closedByUserId: row.closedByUserId,
      closedByName: row.closedBy?.name ?? null,
      notes: row.notes,
      openContainersUnresolved,
    };
  }

  private includeInv() {
    return {
      event: { select: { name: true } },
      location: { select: { code: true, name: true, kind: true, eventId: true } },
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    } as const;
  }

  private async loadInv(tenantId: string, id: string): Promise<InvRow> {
    const row = await this.prisma.bchBarEventInventory.findFirst({
      where: { id, tenantId },
      include: this.includeInv(),
    });
    if (!row) throw new NotFoundException('Estoque de evento não encontrado.');
    return row;
  }

  private assertStatus(row: InvRow, allowed: string[], action: string) {
    if (!allowed.includes(row.status)) {
      throw new BadRequestException(`Não é possível ${action} com status "${row.status}".`);
    }
  }

  private async countUnresolvedOpenContainers(
    tenantId: string,
    locationId: string,
  ): Promise<number> {
    const tol = BCH_BAR_CONTENT_EMPTY_TOLERANCE;
    const rows = await this.prisma.bchBarOpenContainer.findMany({
      where: { tenantId, locationId, status: 'open' },
      select: { remainingContent: true },
    });
    let n = 0;
    for (const r of rows) {
      if (r.remainingContent.gt(tol)) n += 1;
    }
    return n;
  }

  private async ensureEventBarLocation(
    tenantId: string,
    eventId: string,
  ): Promise<{ id: string; code: string; name: string }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, name: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');

    const code = `event-bar-${eventId.slice(-12)}`;
    const existing = await this.prisma.bchBarInventoryLocation.findFirst({
      where: { tenantId, eventId, kind: 'event_bar' },
    });
    if (existing) return { id: existing.id, code: existing.code, name: existing.name };

    const created = await this.prisma.bchBarInventoryLocation.create({
      data: {
        tenantId,
        code,
        name: `Bar — ${event.name}`,
        kind: 'event_bar',
        eventId,
        sortOrder: 10,
      },
    });
    return { id: created.id, code: created.code, name: created.name };
  }

  async openEventInventory(
    tenantId: string,
    userId: string | null,
    input: { eventId: string; notes?: string | null },
  ): Promise<BchBarEventInventoryDto> {
    const eventId = input.eventId?.trim();
    if (!eventId) throw new BadRequestException('eventId é obrigatório.');

    const location = await this.ensureEventBarLocation(tenantId, eventId);

    const conflict = await this.prisma.bchBarEventInventory.findFirst({
      where: {
        tenantId,
        eventId,
        locationId: location.id,
        status: { in: ['draft', 'active'] },
      },
    });
    if (conflict) {
      throw new BadRequestException('Já existe estoque de evento aberto para este evento/local.');
    }

    const row = await this.prisma.bchBarEventInventory.create({
      data: {
        tenantId,
        eventId,
        locationId: location.id,
        status: 'active',
        openedAt: new Date(),
        openedByUserId: userId,
        notes: input.notes?.trim() || null,
      },
      include: this.includeInv(),
    });

    return this.mapInv(row, 0);
  }

  async getEventInventory(tenantId: string, id: string): Promise<BchBarEventInventoryDto> {
    const row = await this.loadInv(tenantId, id);
    const unresolved = await this.countUnresolvedOpenContainers(tenantId, row.locationId);
    return this.mapInv(row, unresolved);
  }

  async listEventInventories(
    tenantId: string,
    query: { eventId?: string; status?: string },
  ): Promise<BchBarEventInventoryDto[]> {
    const where: Prisma.BchBarEventInventoryWhereInput = { tenantId };
    if (query.eventId?.trim()) where.eventId = query.eventId.trim();
    if (query.status?.trim()) {
      if (!BCH_BAR_EVENT_INVENTORY_STATUSES.includes(query.status as (typeof BCH_BAR_EVENT_INVENTORY_STATUSES)[number])) {
        throw new BadRequestException('Status inválido.');
      }
      where.status = query.status.trim();
    }
    const rows = await this.prisma.bchBarEventInventory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: this.includeInv(),
    });
    const out: BchBarEventInventoryDto[] = [];
    for (const row of rows) {
      const unresolved =
        row.status === 'active'
          ? await this.countUnresolvedOpenContainers(tenantId, row.locationId)
          : 0;
      out.push(this.mapInv(row, unresolved));
    }
    return out;
  }

  private async transferForInventory(
    tenantId: string,
    userId: string | null,
    inv: InvRow,
    direction: 'to_event' | 'to_central',
    operation: keyof typeof BCH_BAR_EVENT_INVENTORY_OPERATION,
    input: {
      lines: Array<{ productId: string; quantity: number | string; sourceKey?: string | null }>;
      batchSourceKey?: string | null;
      notes?: string | null;
    },
  ) {
    this.assertStatus(inv, ['active'], operation);
    const centralId = await this.centralLocationId(tenantId);
    const fromLocationId = direction === 'to_event' ? centralId : inv.locationId;
    const toLocationId = direction === 'to_event' ? inv.locationId : centralId;

    return this.stock.transferStockBatch(tenantId, userId, {
      fromLocationId,
      toLocationId,
      eventId: inv.eventId,
      batchSourceKey: input.batchSourceKey?.trim() || null,
      referenceType: BCH_BAR_EVENT_INVENTORY_REF_TYPE,
      referenceId: inv.id,
      reason: BCH_BAR_EVENT_INVENTORY_OPERATION[operation],
      notes: input.notes,
      lines: input.lines,
    });
  }

  async allocateInitial(
    tenantId: string,
    userId: string | null,
    inventoryId: string,
    input: {
      lines: Array<{ productId: string; quantity: number | string; sourceKey?: string | null }>;
      batchSourceKey?: string | null;
      notes?: string | null;
    },
  ): Promise<BchBarEventInventoryDto> {
    const inv = await this.loadInv(tenantId, inventoryId);
    await this.transferForInventory(tenantId, userId, inv, 'to_event', 'initial_allocation', input);
    return this.getEventInventory(tenantId, inventoryId);
  }

  async replenish(
    tenantId: string,
    userId: string | null,
    inventoryId: string,
    input: {
      lines: Array<{ productId: string; quantity: number | string; sourceKey?: string | null }>;
      batchSourceKey?: string | null;
      notes?: string | null;
    },
  ): Promise<BchBarEventInventoryDto> {
    const inv = await this.loadInv(tenantId, inventoryId);
    await this.transferForInventory(tenantId, userId, inv, 'to_event', 'replenishment', input);
    return this.getEventInventory(tenantId, inventoryId);
  }

  async returnClosedStock(
    tenantId: string,
    userId: string | null,
    inventoryId: string,
    input: {
      lines: Array<{ productId: string; quantity: number | string; sourceKey?: string | null }>;
      batchSourceKey?: string | null;
      notes?: string | null;
    },
  ): Promise<BchBarEventInventoryDto> {
    const inv = await this.loadInv(tenantId, inventoryId);
    await this.transferForInventory(tenantId, userId, inv, 'to_central', 'event_return', input);
    return this.getEventInventory(tenantId, inventoryId);
  }

  async getSummary(tenantId: string, inventoryId: string): Promise<BchBarEventInventorySummaryDto> {
    const inv = await this.loadInv(tenantId, inventoryId);
    const products = await this.prisma.bchBarProduct.findMany({
      where: { tenantId, active: true },
      select: { id: true, sku: true, name: true },
      orderBy: { name: 'asc' },
    });

    const movements = await this.prisma.bchBarStockMovement.findMany({
      where: {
        tenantId,
        OR: [
          { locationId: inv.locationId, eventId: inv.eventId },
          {
            referenceType: BCH_BAR_EVENT_INVENTORY_REF_TYPE,
            referenceId: inv.id,
          },
        ],
      },
    });

    const balances = await this.prisma.bchBarStockBalance.findMany({
      where: { tenantId, locationId: inv.locationId },
    });
    const balanceByProduct = new Map(balances.map((b) => [b.productId, b.quantityOnHand]));

    const openContainers = await this.prisma.bchBarOpenContainer.findMany({
      where: { tenantId, locationId: inv.locationId, status: 'open' },
      select: { productId: true, remainingContent: true },
    });
    const openByProduct = new Map<string, { count: number; sum: Prisma.Decimal }>();
    for (const c of openContainers) {
      const cur = openByProduct.get(c.productId) ?? { count: 0, sum: new Prisma.Decimal(0) };
      cur.count += 1;
      cur.sum = cur.sum.plus(c.remainingContent);
      openByProduct.set(c.productId, cur);
    }

    const lines: BchBarEventInventorySummaryLineDto[] = [];

    for (const product of products) {
      let initiallyAllocated = new Prisma.Decimal(0);
      let replenished = new Prisma.Decimal(0);
      let returnedClosed = new Prisma.Decimal(0);
      let posSold = new Prisma.Decimal(0);
      let complimentary = new Prisma.Decimal(0);
      let wasteBreakage = new Prisma.Decimal(0);
      let internalUseTasting = new Prisma.Decimal(0);

      for (const m of movements) {
        if (m.productId !== product.id) continue;
        const qty = m.quantity;
        const atEvent = m.locationId === inv.locationId;

        if (
          m.referenceId === inv.id &&
          m.reason === BCH_BAR_EVENT_INVENTORY_OPERATION.initial_allocation &&
          m.movementType === 'transfer_in' &&
          atEvent
        ) {
          initiallyAllocated = initiallyAllocated.plus(qty);
        }
        if (
          m.referenceId === inv.id &&
          m.reason === BCH_BAR_EVENT_INVENTORY_OPERATION.replenishment &&
          m.movementType === 'transfer_in' &&
          atEvent
        ) {
          replenished = replenished.plus(qty);
        }
        if (
          m.referenceId === inv.id &&
          m.reason === BCH_BAR_EVENT_INVENTORY_OPERATION.event_return &&
          m.movementType === 'transfer_out' &&
          atEvent
        ) {
          returnedClosed = returnedClosed.plus(qty);
        }
        if (atEvent && m.direction === 'out') {
          if (m.movementType === 'sale') posSold = posSold.plus(qty);
          if (m.movementType === 'complimentary') complimentary = complimentary.plus(qty);
          if (m.movementType === 'breakage' || m.movementType === 'spill_waste') {
            wasteBreakage = wasteBreakage.plus(qty);
          }
          if (m.movementType === 'internal_use' || m.movementType === 'tasting') {
            internalUseTasting = internalUseTasting.plus(qty);
          }
        }
      }

      const totalReceived = initiallyAllocated.plus(replenished);
      const openMeta = openByProduct.get(product.id);
      const hasActivity =
        totalReceived.gt(0) ||
        returnedClosed.gt(0) ||
        posSold.gt(0) ||
        (balanceByProduct.get(product.id) ?? new Prisma.Decimal(0)).gt(0) ||
        (openMeta?.count ?? 0) > 0;
      if (!hasActivity) continue;

      lines.push({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        initiallyAllocated: decStr(initiallyAllocated),
        replenished: decStr(replenished),
        totalReceived: decStr(totalReceived),
        returnedClosed: decStr(returnedClosed),
        currentClosedBalance: decStr(balanceByProduct.get(product.id) ?? 0),
        posSold: decStr(posSold),
        complimentary: decStr(complimentary),
        wasteBreakage: decStr(wasteBreakage),
        internalUseTasting: decStr(internalUseTasting),
        openContainersCount: openMeta?.count ?? 0,
        openRemainingContent: decStr(openMeta?.sum ?? 0),
      });
    }

    return {
      eventInventoryId: inv.id,
      eventId: inv.eventId,
      locationId: inv.locationId,
      status: inv.status,
      lines,
    };
  }

  async closeEventInventory(
    tenantId: string,
    userId: string | null,
    inventoryId: string,
  ): Promise<BchBarEventInventoryDto> {
    const inv = await this.loadInv(tenantId, inventoryId);
    this.assertStatus(inv, ['active'], 'fechar');

    const unresolved = await this.countUnresolvedOpenContainers(tenantId, inv.locationId);
    if (unresolved > 0) {
      throw new BadRequestException(
        `Existem ${unresolved} garrafa(s) aberta(s) com conteúdo. Resolva (descarte ou esvaziamento) antes de fechar.`,
      );
    }

    const summary = await this.getSummary(tenantId, inventoryId);

    await this.prisma.bchBarEventInventory.update({
      where: { id: inventoryId },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedByUserId: userId,
        closeSnapshot: summary as unknown as Prisma.InputJsonValue,
      },
    });

    return this.getEventInventory(tenantId, inventoryId);
  }

  /** Integração POS — impede consumo no central quando a venda é de evento. */
  async assertPosSaleLocation(
    tenantId: string,
    locationId: string,
    eventId: string | null | undefined,
  ): Promise<void> {
    const location = await this.prisma.bchBarInventoryLocation.findFirst({
      where: { id: locationId, tenantId },
    });
    if (!location) throw new NotFoundException('Local não encontrado.');

    if (location.kind === 'event_bar') {
      if (!eventId?.trim()) {
        throw new BadRequestException('Vendas no bar do evento exigem eventId.');
      }
      if (location.eventId && location.eventId !== eventId.trim()) {
        throw new BadRequestException('Local do bar não corresponde ao evento da venda.');
      }
      const active = await this.prisma.bchBarEventInventory.findFirst({
        where: {
          tenantId,
          eventId: eventId.trim(),
          locationId,
          status: 'active',
        },
      });
      if (!active) {
        throw new BadRequestException('Estoque de evento não está ativo para este local.');
      }
      return;
    }

    if (eventId?.trim()) {
      throw new BadRequestException(
        'Venda com eventId deve usar o local event_bar do evento, não o estoque central.',
      );
    }
  }
}
