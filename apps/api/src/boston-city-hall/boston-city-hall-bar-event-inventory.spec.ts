import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BostonCityHallBarEventInventoryService } from './boston-city-hall-bar-event-inventory.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';
import { BostonCityHallBarStockService } from './boston-city-hall-bar-stock.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_BAR_EVENT_INVENTORY_OPERATION,
  BCH_BAR_EVENT_INVENTORY_REF_TYPE,
} from './boston-city-hall-bar-event-inventory.constants';

describe('BostonCityHallBarEventInventoryService', () => {
  let service: BostonCityHallBarEventInventoryService;
  let stock: { transferStockBatch: jest.Mock };
  let bar: { ensureCentralLocation: jest.Mock };

  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  const userId = 'u1';
  const eventId = 'ev1';
  const invId = 'inv1';
  const centralId = 'loc-central';
  const eventLocId = 'loc-event';

  let inventories: Array<Record<string, unknown>>;
  let locations: Array<Record<string, unknown>>;
  let openContainers: Array<Record<string, unknown>>;
  let prismaMock: {
    bchBarProduct: { findMany: jest.Mock };
    bchBarStockMovement: { findMany: jest.Mock };
    bchBarStockBalance: { findMany: jest.Mock };
    bchBarOpenContainer: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    inventories = [
      {
        id: invId,
        tenantId: tenantA,
        eventId,
        locationId: eventLocId,
        status: 'active',
        openedAt: new Date(),
        closedAt: null,
        notes: null,
        openedByUserId: userId,
        closedByUserId: null,
        event: { name: 'Show Test' },
        location: { code: 'event-bar-x', name: 'Bar Event', kind: 'event_bar', eventId },
        openedBy: { name: 'Op' },
        closedBy: null,
      },
    ];
    locations = [
      { id: centralId, tenantId: tenantA, code: 'central', kind: 'central', eventId: null, active: true },
      { id: eventLocId, tenantId: tenantA, code: 'event-bar-x', kind: 'event_bar', eventId, active: true },
    ];
    openContainers = [];

    stock = {
      transferStockBatch: jest.fn(async () => ({ transferGroupId: 'tg1', lines: 1 })),
    };
    bar = {
      ensureCentralLocation: jest.fn(async () => ({ id: centralId, code: 'central', name: 'Central' })),
    };

    const prisma = {
      event: {
        findFirst: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
          where.tenantId === tenantA && where.id === eventId ? { id: eventId, name: 'Show Test' } : null,
        ),
      },
      bchBarInventoryLocation: {
        findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          return (
            locations.find((l) => {
              if (where.id && l.id !== where.id) return false;
              if (where.tenantId && l.tenantId !== where.tenantId) return false;
              if (where.eventId && l.eventId !== where.eventId) return false;
              if (where.kind && l.kind !== where.kind) return false;
              return true;
            }) ?? null
          );
        }),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: eventLocId, ...data };
          locations.push(row);
          return row;
        }),
      },
      bchBarEventInventory: {
        findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          return (
            inventories.find((i) => {
              if (where.id && i.id !== where.id) return false;
              if (where.tenantId && i.tenantId !== where.tenantId) return false;
              if (where.eventId && i.eventId !== where.eventId) return false;
              if (where.locationId && i.locationId !== where.locationId) return false;
              if (where.status && i.status !== where.status) return false;
              if (where.status && typeof where.status === 'object' && 'in' in where.status) {
                const arr = (where.status as { in: string[] }).in;
                if (!arr.includes(i.status as string)) return false;
              }
              return true;
            }) ?? null
          );
        }),
        findMany: jest.fn(async () => inventories.filter((i) => i.tenantId === tenantA)),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = {
            id: invId,
            ...data,
            event: { name: 'Show Test' },
            location: locations.find((l) => l.id === data.locationId),
            openedBy: { name: 'Op' },
            closedBy: null,
          };
          inventories.push(row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = inventories.find((i) => i.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
      },
      bchBarOpenContainer: {
        findMany: jest.fn(async () => openContainers),
      },
      bchBarPhysicalCount: {
        findFirst: jest.fn(async () => null),
      },
      bchBarProduct: { findMany: jest.fn(async () => []) },
      bchBarStockMovement: { findMany: jest.fn(async () => []) },
      bchBarStockBalance: { findMany: jest.fn(async () => []) },
    };
    prismaMock = {
      bchBarProduct: prisma.bchBarProduct,
      bchBarStockMovement: prisma.bchBarStockMovement,
      bchBarStockBalance: prisma.bchBarStockBalance,
      bchBarOpenContainer: prisma.bchBarOpenContainer,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BostonCityHallBarEventInventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: BostonCityHallBarService, useValue: bar },
        { provide: BostonCityHallBarStockService, useValue: stock },
      ],
    }).compile();

    service = module.get(BostonCityHallBarEventInventoryService);
  });

  it('1 — opens event inventory with event_bar location', async () => {
    inventories.length = 0;
    const dto = await service.openEventInventory(tenantA, userId, { eventId });
    expect(dto.status).toBe('active');
    expect(dto.locationId).toBe(eventLocId);
  });

  it('3 — insufficient central stock rejects allocation (no partial batch)', async () => {
    stock.transferStockBatch.mockRejectedValueOnce(new BadRequestException('Estoque central insuficiente.'));
    await expect(
      service.allocateInitial(tenantA, userId, invId, {
        lines: [{ productId: 'p1', quantity: 999 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stock.transferStockBatch).toHaveBeenCalledTimes(1);
  });

  it('2 — initial allocation uses central → event transfer batch', async () => {
    await service.allocateInitial(tenantA, userId, invId, {
      lines: [{ productId: 'p1', quantity: 10 }],
      batchSourceKey: 'batch-1',
    });
    expect(stock.transferStockBatch).toHaveBeenCalledWith(
      tenantA,
      userId,
      expect.objectContaining({
        fromLocationId: centralId,
        toLocationId: eventLocId,
        eventId,
        reason: BCH_BAR_EVENT_INVENTORY_OPERATION.initial_allocation,
        referenceType: BCH_BAR_EVENT_INVENTORY_REF_TYPE,
        referenceId: invId,
      }),
    );
  });

  it('4 — replenishment creates canonical transfer batch', async () => {
    await service.replenish(tenantA, userId, invId, {
      lines: [{ productId: 'p1', quantity: 5 }],
      batchSourceKey: 'rep-batch',
    });
    expect(stock.transferStockBatch).toHaveBeenCalledWith(
      tenantA,
      userId,
      expect.objectContaining({
        reason: BCH_BAR_EVENT_INVENTORY_OPERATION.replenishment,
        referenceType: BCH_BAR_EVENT_INVENTORY_REF_TYPE,
      }),
    );
  });

  it('5 — repeated batchSourceKey delegates idempotency to stock layer', async () => {
    await service.replenish(tenantA, userId, invId, {
      lines: [{ productId: 'p1', quantity: 2 }],
      batchSourceKey: 'rep-1',
    });
    await service.replenish(tenantA, userId, invId, {
      lines: [{ productId: 'p1', quantity: 2 }],
      batchSourceKey: 'rep-1',
    });
    expect(stock.transferStockBatch).toHaveBeenCalledTimes(2);
  });

  it('6 — POS blocks central when eventId is set', async () => {
    await expect(
      service.assertPosSaleLocation(tenantA, centralId, eventId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('6b — POS allows event_bar with active inventory', async () => {
    await expect(
      service.assertPosSaleLocation(tenantA, eventLocId, eventId),
    ).resolves.toBeUndefined();
  });

  it('7 — return uses event → central direction', async () => {
    await service.returnClosedStock(tenantA, userId, invId, {
      lines: [{ productId: 'p1', quantity: 1 }],
    });
    expect(stock.transferStockBatch).toHaveBeenCalledWith(
      tenantA,
      userId,
      expect.objectContaining({
        fromLocationId: eventLocId,
        toLocationId: centralId,
        reason: BCH_BAR_EVENT_INVENTORY_OPERATION.event_return,
      }),
    );
  });

  it('8 — unresolved open containers block close', async () => {
    openContainers.push({
      remainingContent: new Prisma.Decimal(100),
      status: 'open',
    });
    await expect(service.closeEventInventory(tenantA, userId, invId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('9 — closed inventory rejects allocation', async () => {
    inventories[0].status = 'closed';
    await expect(
      service.allocateInitial(tenantA, userId, invId, { lines: [{ productId: 'p1', quantity: 1 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('10 — tenant isolation on get', async () => {
    await expect(service.getEventInventory(tenantB, invId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('11 — summary counts POS sale separately from allocation transfer_in', async () => {
    const productId = 'p-summary';
    prismaMock.bchBarProduct.findMany.mockResolvedValueOnce([
      { id: productId, sku: 'SKU', name: 'Cerveja' },
    ]);
    prismaMock.bchBarStockMovement.findMany.mockResolvedValueOnce([
      {
        productId,
        locationId: eventLocId,
        eventId,
        referenceId: invId,
        reason: BCH_BAR_EVENT_INVENTORY_OPERATION.initial_allocation,
        movementType: 'transfer_in',
        direction: 'in',
        quantity: new Prisma.Decimal(10),
      },
      {
        productId,
        locationId: eventLocId,
        eventId,
        referenceId: null,
        reason: null,
        movementType: 'sale',
        direction: 'out',
        quantity: new Prisma.Decimal(3),
      },
    ]);
    prismaMock.bchBarStockBalance.findMany.mockResolvedValueOnce([
      { productId, quantityOnHand: new Prisma.Decimal(7) },
    ]);
    prismaMock.bchBarOpenContainer.findMany.mockResolvedValueOnce([]);

    const summary = await service.getSummary(tenantA, invId);
    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0].initiallyAllocated).toBe('10');
    expect(summary.lines[0].posSold).toBe('3');
    expect(summary.lines[0].currentClosedBalance).toBe('7');
  });
});
