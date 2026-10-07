import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BostonCityHallBarOpenContainerService } from './boston-city-hall-bar-open-container.service';
import { BostonCityHallBarStockService } from './boston-city-hall-bar-stock.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BostonCityHallBarOpenContainerService', () => {
  let service: BostonCityHallBarOpenContainerService;
  let stock: { applyMovementInTransaction: jest.Mock; createManualMovement: jest.Mock };

  const tenantA = 'tenant-a';
  const userId = 'u1';
  const physical = {
    id: 'phys1',
    unitType: 'bottle',
    volumeMl: 750,
    quantityBasis: new Prisma.Decimal(1),
  };

  let balances: Prisma.Decimal;
  let containers: Array<Record<string, unknown>>;
  let ledgers: Array<Record<string, unknown>>;
  let movements: number;

  beforeEach(async () => {
    balances = new Prisma.Decimal(10);
    containers = [];
    ledgers = [];
    movements = 0;

    stock = {
      applyMovementInTransaction: jest.fn(async (_tx, _t, _u, input) => {
        if (input.direction === 'out') {
          balances = balances.minus(input.quantity);
          if (balances.lt(0)) throw new BadRequestException('Estoque insuficiente');
        }
        movements += 1;
        return { id: `mov-${movements}` };
      }),
      createManualMovement: jest.fn(async () => ({ id: 'mov-whole' })),
    };

    const prisma = {
      bchBarProduct: {
        findFirst: jest.fn(async () => ({
          id: 'p1',
          tenantId: tenantA,
          active: true,
          physicalUnit: physical,
        })),
      },
      bchBarInventoryLocation: {
        findFirst: jest.fn(async () => ({ id: 'loc1', tenantId: tenantA, active: true })),
      },
      bchBarStockBalance: {
        findUnique: jest.fn(async () => ({ quantityOnHand: balances })),
      },
      bchBarSellingUnit: {
        findFirst: jest.fn(async () => ({
          id: 'su-dose',
          tenantId: tenantA,
          productId: 'p1',
          active: true,
          name: 'Dose',
          portionAmount: new Prisma.Decimal(75),
          portionUnit: 'ml',
          physicalUnitsConsumedPerSale: new Prisma.Decimal(0.1),
          expectedPortionsPerPhysical: new Prisma.Decimal(10),
          product: { id: 'p1', active: true, physicalUnit: physical },
        })),
      },
      bchBarOpenContainer: {
        findMany: jest.fn(
          async ({
            where,
            orderBy,
            take,
          }: {
            where: Record<string, unknown> & { remainingContent?: { gte: Prisma.Decimal } };
            orderBy?: { openedAt: 'asc' | 'desc' };
            take?: number;
          }) => {
            let list = containers.filter((c) => {
              if (where.productId && c.productId !== where.productId) return false;
              if (where.locationId && c.locationId !== where.locationId) return false;
              if (where.status && c.status !== where.status) return false;
              if (where.tenantId && c.tenantId !== where.tenantId) return false;
              if (where.remainingContent?.gte) {
                const rem = c.remainingContent as Prisma.Decimal;
                if (rem.lt(where.remainingContent.gte)) return false;
              }
              return true;
            });
            if (orderBy?.openedAt === 'asc') {
              list = [...list].sort(
                (a, b) =>
                  (a.openedAt as Date).getTime() - (b.openedAt as Date).getTime(),
              );
            }
            return take ? list.slice(0, take) : list;
          },
        ),
        findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (where.id) return containers.find((c) => c.id === where.id) ?? null;
          return null;
        }),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = {
            id: `oc-${containers.length + 1}`,
            ...data,
            openedAt: new Date(),
            product: { sku: 'W1', name: 'Whisky' },
            location: { code: 'central', name: 'Central' },
            openedBy: { name: 'Op', username: 'op' },
          };
          containers.push(row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const idx = containers.findIndex((c) => c.id === where.id);
          containers[idx] = { ...containers[idx], ...data };
          return containers[idx];
        }),
      },
      bchBarOpenContainerLedger: {
        findFirst: jest.fn(async ({ where }: { where: { sourceKey?: string } }) =>
          where.sourceKey ? ledgers.find((l) => l.sourceKey === where.sourceKey) ?? null : null,
        ),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: `lg-${ledgers.length + 1}`, ...data, createdAt: new Date() };
          ledgers.push(row);
          return row;
        }),
      },
      bchBarStockMovement: { findFirst: jest.fn(async () => null) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          bchBarStockBalance: {
            findUnique: jest.fn(async () => ({ quantityOnHand: balances })),
          },
          bchBarOpenContainer: prisma.bchBarOpenContainer,
          bchBarOpenContainerLedger: prisma.bchBarOpenContainerLedger,
        };
        return fn(tx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BostonCityHallBarOpenContainerService,
        { provide: PrismaService, useValue: prisma },
        { provide: BostonCityHallBarStockService, useValue: stock },
      ],
    }).compile();

    service = module.get(BostonCityHallBarOpenContainerService);
  });

  it('1 — opening removes exactly 1 closed physical unit', async () => {
    await service.openContainer(tenantA, userId, { productId: 'p1', locationId: 'loc1' });
    expect(balances.toString()).toBe('9');
    expect(stock.applyMovementInTransaction).toHaveBeenCalledTimes(1);
    expect(containers.length).toBe(1);
  });

  it('2 — opening fails if no closed stock', async () => {
    balances = new Prisma.Decimal(0);
    await expect(
      service.openContainer(tenantA, userId, { productId: 'p1', locationId: 'loc1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(containers.length).toBe(0);
  });

  it('3 — consuming dose reduces only open-container content', async () => {
    await service.openContainer(tenantA, userId, { productId: 'p1', locationId: 'loc1' });
    const beforeBal = balances.toString();
    await service.consumeSellingUnit(tenantA, userId, {
      sellingUnitId: 'su-dose',
      locationId: 'loc1',
    });
    expect(balances.toString()).toBe(beforeBal);
    expect(Number(containers[0].remainingContent)).toBe(675);
  });

  it('4 — partial consumption does not create another full stock OUT', async () => {
    containers.push({
      id: 'oc-1',
      tenantId: tenantA,
      productId: 'p1',
      locationId: 'loc1',
      status: 'open',
      remainingContent: new Prisma.Decimal(750),
      originalContent: new Prisma.Decimal(750),
      openedAt: new Date(Date.now() - 1000),
    });
    const callsBefore = stock.applyMovementInTransaction.mock.calls.length;
    await service.consumeSellingUnit(tenantA, userId, {
      sellingUnitId: 'su-dose',
      locationId: 'loc1',
    });
    expect(stock.applyMovementInTransaction.mock.calls.length).toBe(callsBefore);
  });

  it('5 — auto-opens closed unit when needed', async () => {
    balances = new Prisma.Decimal(2);
    await service.consumeSellingUnit(tenantA, userId, {
      sellingUnitId: 'su-dose',
      locationId: 'loc1',
    });
    expect(balances.toString()).toBe('1');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('6 — FIFO chooses oldest suitable container', async () => {
    containers.push(
      {
        id: 'old',
        tenantId: tenantA,
        productId: 'p1',
        locationId: 'loc1',
        status: 'open',
        remainingContent: new Prisma.Decimal(100),
        openedAt: new Date('2020-01-01'),
      },
      {
        id: 'new',
        tenantId: tenantA,
        productId: 'p1',
        locationId: 'loc1',
        status: 'open',
        remainingContent: new Prisma.Decimal(500),
        openedAt: new Date('2024-01-01'),
      },
    );
    await service.consumeSellingUnit(tenantA, userId, {
      sellingUnitId: 'su-dose',
      locationId: 'loc1',
    });
    expect(Number(containers[0].remainingContent)).toBe(25);
  });

  it('7 — insufficient total inventory rejects', async () => {
    balances = new Prisma.Decimal(0);
    await expect(
      service.consumeSellingUnit(tenantA, userId, {
        sellingUnitId: 'su-dose',
        locationId: 'loc1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('8 — full-bottle selling unit uses stock ledger directly', async () => {
    const prisma = (service as unknown as { prisma: { bchBarSellingUnit: { findFirst: jest.Mock } } }).prisma;
    prisma.bchBarSellingUnit.findFirst.mockResolvedValueOnce({
      id: 'su-bottle',
      tenantId: tenantA,
      productId: 'p1',
      active: true,
      name: 'Garrafa',
      portionAmount: null,
      portionUnit: null,
      physicalUnitsConsumedPerSale: new Prisma.Decimal(1),
      expectedPortionsPerPhysical: new Prisma.Decimal(1),
      product: { id: 'p1', active: true, physicalUnit: physical },
    });
    const result = await service.consumeSellingUnit(tenantA, userId, {
      sellingUnitId: 'su-bottle',
      locationId: 'loc1',
    });
    expect(result.mode).toBe('whole_unit_stock');
    expect(stock.createManualMovement).toHaveBeenCalled();
  });

  it('9 — discard records waste and empties container', async () => {
    containers.push({
      id: 'oc1',
      tenantId: tenantA,
      productId: 'p1',
      locationId: 'loc1',
      status: 'open',
      remainingContent: new Prisma.Decimal(150),
      originalContent: new Prisma.Decimal(750),
      openedAt: new Date(),
      product: { sku: 'W', name: 'W' },
      location: { code: 'c', name: 'C' },
    });
    await service.discardRemaining(tenantA, userId, 'oc1');
    expect(containers[0].status).toBe('discarded');
    expect(ledgers.length).toBe(1);
  });

  it('10 — manual adjustment is auditable', async () => {
    containers.push({
      id: 'oc1',
      tenantId: tenantA,
      productId: 'p1',
      locationId: 'loc1',
      status: 'open',
      remainingContent: new Prisma.Decimal(300),
      originalContent: new Prisma.Decimal(750),
      openedAt: new Date(),
      product: { sku: 'W', name: 'W' },
      location: { code: 'c', name: 'C' },
    });
    await service.adjustContainerContent(tenantA, userId, 'oc1', {
      newRemaining: 225,
      reason: 'Estimativa física',
    });
    expect(Number(containers[0].remainingContent)).toBe(225);
    expect(ledgers.some((l) => l.recordType === 'manual_adjustment')).toBe(true);
  });

  it('11 — same sourceKey cannot consume twice', async () => {
    containers.push({
      id: 'oc1',
      tenantId: tenantA,
      productId: 'p1',
      locationId: 'loc1',
      status: 'open',
      remainingContent: new Prisma.Decimal(750),
      originalContent: new Prisma.Decimal(750),
    });
    ledgers.push({
      id: 'dup',
      sourceKey: 'pos-1',
      openContainerId: 'oc1',
    });
    const r = await service.consumeSellingUnit(tenantA, userId, {
      sellingUnitId: 'su-dose',
      locationId: 'loc1',
      sourceKey: 'pos-1',
    });
    expect(r.openContainerLedgerId).toBe('dup');
    expect(ledgers.length).toBe(1);
  });

  it('12 — availability combines open content and closed stock', async () => {
    balances = new Prisma.Decimal(2);
    containers.push({
      id: 'oc1',
      tenantId: tenantA,
      productId: 'p1',
      locationId: 'loc1',
      status: 'open',
      remainingContent: new Prisma.Decimal(300),
    });
    const av = await service.getSellingUnitAvailability(tenantA, 'su-dose', 'loc1');
    expect(av.mode).toBe('portion');
    expect(Number(av.fulfillableUnits)).toBe(24);
  });

  it('13 — tenant isolation on open', async () => {
    const prisma = (service as unknown as { prisma: { bchBarProduct: { findFirst: jest.Mock } } }).prisma;
    prisma.bchBarProduct.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.openContainer(tenantA, userId, { productId: 'x', locationId: 'loc1' }),
    ).rejects.toThrow();
  });
});
