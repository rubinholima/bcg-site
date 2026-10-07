import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type TicketInventoryMaps = {
  soldByType: Map<string, number>;
  heldByType: Map<string, number>;
  soldByLot: Map<string, number>;
  heldByLot: Map<string, number>;
};

type Tx = Prisma.TransactionClient;

function add(map: Map<string, number>, key: string, qty: number) {
  map.set(key, (map.get(key) ?? 0) + qty);
}

@Injectable()
export class BostonCityHallTicketInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  emptyMaps(): TicketInventoryMaps {
    return {
      soldByType: new Map(),
      heldByType: new Map(),
      soldByLot: new Map(),
      heldByLot: new Map(),
    };
  }

  async loadForEvent(
    tenantId: string,
    eventId: string,
    now: Date = new Date(),
  ): Promise<TicketInventoryMaps> {
    return this.loadFromDb(this.prisma, tenantId, eventId, now);
  }

  async loadInTransaction(tx: Tx, tenantId: string, eventId: string, now: Date): Promise<TicketInventoryMaps> {
    return this.loadFromDb(tx, tenantId, eventId, now);
  }

  private async loadFromDb(
    db: Tx,
    tenantId: string,
    eventId: string,
    now: Date,
  ): Promise<TicketInventoryMaps> {
    const maps = this.emptyMaps();

    const soldItems = await db.eventTicketOrderItem.findMany({
      where: { order: { tenantId, eventId, status: 'confirmed' } },
      select: { ticketTypeId: true, ticketLotId: true, quantity: true },
    });
    for (const row of soldItems) {
      if (row.ticketLotId) add(maps.soldByLot, row.ticketLotId, row.quantity);
      else add(maps.soldByType, row.ticketTypeId, row.quantity);
    }

    const heldItems = await db.eventTicketOrderItem.findMany({
      where: {
        order: {
          tenantId,
          eventId,
          status: 'pending',
          holdExpiresAt: { gt: now },
        },
      },
      select: { ticketTypeId: true, ticketLotId: true, quantity: true },
    });
    for (const row of heldItems) {
      if (row.ticketLotId) add(maps.heldByLot, row.ticketLotId, row.quantity);
      else add(maps.heldByType, row.ticketTypeId, row.quantity);
    }

    return maps;
  }

  soldForType(maps: TicketInventoryMaps, typeId: string): number {
    return maps.soldByType.get(typeId) ?? 0;
  }

  heldForType(maps: TicketInventoryMaps, typeId: string): number {
    return maps.heldByType.get(typeId) ?? 0;
  }

  soldForLot(maps: TicketInventoryMaps, lotId: string): number {
    return maps.soldByLot.get(lotId) ?? 0;
  }

  heldForLot(maps: TicketInventoryMaps, lotId: string): number {
    return maps.heldByLot.get(lotId) ?? 0;
  }

  async lockTicketTypes(tx: Tx, typeIds: string[]): Promise<void> {
    const sorted = [...new Set(typeIds)].sort();
    for (const id of sorted) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "EventTicketType" WHERE id = ${id} FOR UPDATE`);
    }
  }

  async lockTicketLots(tx: Tx, lotIds: string[]): Promise<void> {
    const sorted = [...new Set(lotIds)].sort();
    for (const id of sorted) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "EventTicketLot" WHERE id = ${id} FOR UPDATE`);
    }
  }
}
