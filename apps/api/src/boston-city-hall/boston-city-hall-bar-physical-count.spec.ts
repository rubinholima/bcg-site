import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BostonCityHallBarPhysicalCountService } from './boston-city-hall-bar-physical-count.service';
import { BostonCityHallBarStockService } from './boston-city-hall-bar-stock.service';
import { PrismaService } from '../prisma/prisma.service';
import { bchBarPhysicalCountItemSourceKey } from './boston-city-hall-bar-physical-count.constants';

describe('BostonCityHallBarPhysicalCountService', () => {
  let service: BostonCityHallBarPhysicalCountService;
  let stock: { applyMovementInTransaction: jest.Mock };

  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  const userId = 'u1';
  const locCentral = 'loc-central';
  const countId = 'count-1';
  const itemId = 'item-1';
  const productId = 'prod-1';

  let counts: Array<Record<string, unknown>>;
  let items: Array<Record<string, unknown>>;
  let balances: Array<Record<string, unknown>>;
  let movements: Array<Record<string, unknown>>;
  let locations: Array<Record<string, unknown>>;
  let products: Array<Record<string, unknown>>;
  let openContainers: Array<Record<string, unknown>>;

  beforeEach(async () => {
    counts = [
      {
        id: countId,
        tenantId: tenantA,
        locationId: locCentral,
        eventId: null,
        status: 'in_progress',
        startedAt: new Date(),
        completedAt: null,
        notes: null,
        startedByUserId: userId,
        completedByUserId: null,
        location: { code: 'central', name: 'Central', kind: 'central', eventId: null },
        event: null,
        startedBy: { name: 'Op' },
        completedBy: null,
      },
    ];
    items = [
      {
        id: itemId,
        countId,
        productId,
        expectedQuantity: new Prisma.Decimal(20),
        countedQuantity: null,
        divergenceQuantity: null,
        unitBasis: 'bottle',
        reason: null,
        notes: null,
        adjustedMovementId: null,
        countedAt: null,
        product: { sku: 'SKU1', name: 'Cerveja' },
      },
    ];
    balances = [
      {
        tenantId: tenantA,
        productId,
        locationId: locCentral,
        quantityOnHand: new Prisma.Decimal(20),
        product: { active: true, physicalUnit: { unitType: 'bottle' } },
      },
    ];
    movements = [];
    locations = [
      { id: locCentral, tenantId: tenantA, kind: 'central', eventId: null, active: true, code: 'central', name: 'Central' },
    ];
    products = [
      { id: productId, tenantId: tenantA, active: true, sku: 'SKU1', name: 'Cerveja', physicalUnit: { unitType: 'bottle' } },
    ];
    openContainers = [];

    stock = {
      applyMovementInTransaction: jest.fn(async (_tx, _t, _u, input) => {
        const row = {
          id: `mov-${movements.length + 1}`,
          ...input,
        };
        movements.push(row);
        return row;
      }),
    };

    const attachItems = (count: Record<string, unknown>) => ({
      ...count,
      items: items.filter((i) => i.countId === count.id),
    });

    const prisma = {
      bchBarInventoryLocation: {
        findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
          locations.find((l) => l.id === where.id && l.tenantId === where.tenantId) ?? null,
        ),
      },
      bchBarPhysicalCount: {
        findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          const row = counts.find((c) => c.id === where.id && c.tenantId === where.tenantId);
          return row ? attachItems(row) : null;
        }),
        findMany: jest.fn(async () => counts.filter((c) => c.tenantId === tenantA).map(attachItems)),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: countId, ...data, location: locations[0], event: null, startedBy: null, completedBy: null };
          counts.push(row);
          return attachItems(row);
        }),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = counts.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return attachItems(row!);
        }),
      },
      bchBarPhysicalCountItem: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: `item-${items.length + 1}`, ...data, product: products[0] };
          items.push(row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = items.find((i) => i.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
      },
      bchBarStockBalance: {
        findMany: jest.fn(async () => balances),
        findUnique: jest.fn(async ({ where }: { where: { productId_locationId: { productId: string; locationId: string } } }) =>
          balances.find(
            (b) =>
              b.productId === where.productId_locationId.productId &&
              b.locationId === where.productId_locationId.locationId,
          ) ?? null,
        ),
        upsert: jest.fn(async ({ update }: { update: { quantityOnHand: Prisma.Decimal } }) => ({
          quantityOnHand: update.quantityOnHand,
        })),
      },
      bchBarStockMovement: {
        findFirst: jest.fn(async ({ where }: { where: { tenantId: string; sourceKey: string } }) =>
          movements.find((m) => m.tenantId === where.tenantId && m.sourceKey === where.sourceKey) ?? null,
        ),
      },
      bchBarProduct: {
        findFirst: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
          products.find((p) => p.id === where.id && p.tenantId === where.tenantId) ?? null,
        ),
      },
      bchBarOpenContainer: {
        findMany: jest.fn(async () => openContainers),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BostonCityHallBarPhysicalCountService,
        { provide: PrismaService, useValue: prisma },
        { provide: BostonCityHallBarStockService, useValue: stock },
      ],
    }).compile();

    service = module.get(BostonCityHallBarPhysicalCountService);
  });

  it('1 — start snapshots expected from stock balance', async () => {
    counts[0].status = 'draft';
    items.length = 0;
    await service.startPhysicalCount(tenantA, userId, countId);
    expect(items).toHaveLength(1);
    expect((items[0].expectedQuantity as Prisma.Decimal).toString()).toBe('20');
    expect(counts[0].status).toBe('in_progress');
  });

  it('2 — zero count is distinct from not counted', async () => {
    await service.updateCountItem(tenantA, userId, countId, itemId, { countedQuantity: 0 });
    expect(items[0].countedQuantity).not.toBeNull();
    expect((items[0].countedQuantity as Prisma.Decimal).toString()).toBe('0');
    expect(items[0].divergenceQuantity).toBeDefined();
  });

  it('3 — server computes divergence', async () => {
    await service.updateCountItem(tenantA, userId, countId, itemId, { countedQuantity: 18, reason: 'breakage' });
    expect((items[0].divergenceQuantity as Prisma.Decimal).toString()).toBe('-2');
  });

  it('4 — positive divergence creates IN adjustment', async () => {
    items[0].expectedQuantity = new Prisma.Decimal(10);
    await service.updateCountItem(tenantA, userId, countId, itemId, { countedQuantity: 11, reason: 'found_stock' });
    await service.completePhysicalCount(tenantA, userId, countId);
    expect(stock.applyMovementInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      tenantA,
      userId,
      expect.objectContaining({
        movementType: 'physical_count_adjustment',
        direction: 'in',
        quantity: expect.any(Prisma.Decimal),
      }),
    );
  });

  it('5 — negative divergence creates OUT adjustment', async () => {
    await service.updateCountItem(tenantA, userId, countId, itemId, { countedQuantity: 18, reason: 'breakage' });
    await service.completePhysicalCount(tenantA, userId, countId);
    expect(stock.applyMovementInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      tenantA,
      userId,
      expect.objectContaining({
        direction: 'out',
      }),
    );
  });

  it('8 — repeated completion does not duplicate movements', async () => {
    await service.updateCountItem(tenantA, userId, countId, itemId, { countedQuantity: 18, reason: 'breakage' });
    await service.completePhysicalCount(tenantA, userId, countId);
    counts[0].status = 'completed';
    items[0].adjustedMovementId = 'mov-1';
    movements.push({
      id: 'mov-1',
      tenantId: tenantA,
      sourceKey: bchBarPhysicalCountItemSourceKey(countId, itemId),
    });
    await service.completePhysicalCount(tenantA, userId, countId);
    expect(stock.applyMovementInTransaction).toHaveBeenCalledTimes(1);
  });

  it('9 — cancelled count creates no movement', async () => {
    counts[0].status = 'draft';
    await service.cancelPhysicalCount(tenantA, userId, countId);
    expect(stock.applyMovementInTransaction).not.toHaveBeenCalled();
    expect(counts[0].status).toBe('cancelled');
  });

  it('10 — completed count rejects item update', async () => {
    counts[0].status = 'completed';
    await expect(
      service.updateCountItem(tenantA, userId, countId, itemId, { countedQuantity: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('11 — open containers returned separately (not in count items)', async () => {
    openContainers.push({
      id: 'oc1',
      productId,
      status: 'open',
      remainingContent: new Prisma.Decimal(500),
      contentUnit: 'ml',
      product: { name: 'Whisky' },
    });
    const dto = await service.getPhysicalCount(tenantA, countId);
    expect(dto.openContainers).toHaveLength(1);
    expect(dto.items.every((i) => i.productId !== 'open-container')).toBe(true);
  });

  it('12 — tenant isolation', async () => {
    await expect(service.getPhysicalCount(tenantB, countId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('13 — add product with expected zero', async () => {
    const extraId = 'prod-2';
    products.push({
      id: extraId,
      tenantId: tenantA,
      active: true,
      sku: 'SKU2',
      name: 'Água',
      physicalUnit: { unitType: 'bottle' },
    });
    await service.addCountItem(tenantA, userId, countId, { productId: extraId });
    const added = items.find((i) => i.productId === extraId);
    expect(added).toBeDefined();
    expect((added!.expectedQuantity as Prisma.Decimal).toString()).toBe('0');
  });
});
