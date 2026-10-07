import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BostonCityHallBarStockService } from './boston-city-hall-bar-stock.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BostonCityHallBarStockService', () => {
  let service: BostonCityHallBarStockService;

  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  const userId = 'user-1';

  type BalanceKey = string;
  const balances = new Map<BalanceKey, Prisma.Decimal>();
  const movements: Array<Record<string, unknown>> = [];

  const balanceKey = (productId: string, locationId: string) => `${productId}:${locationId}`;

  let prisma: Record<string, unknown>;

  beforeEach(async () => {
    balances.clear();
    movements.length = 0;

    const txClient = {
      bchBarStockBalance: {
        findMany: jest.fn(async () => {
          return [...balances.entries()].map(([k, quantityOnHand]) => {
            const [productId, locationId] = k.split(':');
            return {
              id: `bal-${k}`,
              tenantId: tenantA,
              productId,
              locationId,
              quantityOnHand,
              updatedAt: new Date(),
              product: {
                sku: 'SKU',
                name: 'Prod',
                physicalUnit: { unitType: 'bottle' },
              },
              location: { code: 'central', name: 'Central' },
            };
          });
        }),
        findUnique: jest.fn(async ({ where }: { where: { productId_locationId: { productId: string; locationId: string } } }) => {
          const k = balanceKey(where.productId_locationId.productId, where.productId_locationId.locationId);
          const qty = balances.get(k);
          if (qty == null) return null;
          return {
            id: `bal-${k}`,
            tenantId: tenantA,
            productId: where.productId_locationId.productId,
            locationId: where.productId_locationId.locationId,
            quantityOnHand: qty,
            updatedAt: new Date(),
          };
        }),
        upsert: jest.fn(
          async ({
            where,
            create,
            update,
          }: {
            where: { productId_locationId: { productId: string; locationId: string } };
            create: { quantityOnHand: Prisma.Decimal };
            update: { quantityOnHand: Prisma.Decimal };
          }) => {
            const k = balanceKey(where.productId_locationId.productId, where.productId_locationId.locationId);
            const next = update?.quantityOnHand ?? create.quantityOnHand;
            balances.set(k, next);
            return {
              id: `bal-${k}`,
              tenantId: tenantA,
              productId: where.productId_locationId.productId,
              locationId: where.productId_locationId.locationId,
              quantityOnHand: next,
              updatedAt: new Date(),
            };
          },
        ),
      },
      bchBarStockMovement: {
        create: jest.fn(async ({ data, include: _inc }: { data: Record<string, unknown> }) => {
          const row = {
            id: `mov-${movements.length + 1}`,
            ...data,
            createdAt: new Date(),
            product: { sku: 'SKU', name: 'Prod' },
            location: { code: 'central', name: 'Central' },
            createdBy: { name: 'Op', username: 'op' },
          };
          movements.push(row);
          return row;
        }),
        count: jest.fn(async () => movements.length),
        findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (where.tenantId === tenantB) return null;
          if (where.sourceKey) {
            return movements.find((m) => m.sourceKey === where.sourceKey) ?? null;
          }
          if (where.reversesMovementId) {
            return movements.find((m) => m.reversesMovementId === where.reversesMovementId) ?? null;
          }
          if (where.id) {
            return movements.find((m) => m.id === where.id) ?? null;
          }
          return null;
        }),
        findMany: jest.fn(async () => [...movements].reverse()),
        groupBy: jest.fn(async () => []),
      },
    };

    prisma = {
      bchBarProduct: {
        findFirst: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) => {
          if (where.tenantId !== tenantA) return null;
          return {
            id: where.id,
            tenantId: tenantA,
            physicalUnit: { unitType: 'bottle' },
          };
        }),
      },
      bchBarInventoryLocation: {
        findFirst: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) => {
          if (where.tenantId !== tenantA) return null;
          return { id: where.id, tenantId: tenantA, active: true, code: 'central', name: 'Central' };
        }),
      },
      event: {
        findFirst: jest.fn(async () => null),
      },
      bchBarStockBalance: txClient.bchBarStockBalance,
      bchBarStockMovement: {
        ...txClient.bchBarStockMovement,
        count: txClient.bchBarStockMovement.count,
      },
      $transaction: jest.fn(async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BostonCityHallBarStockService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BostonCityHallBarStockService);
  });

  it('1 — IN movement increases balance', async () => {
    const mov = await service.createManualMovement(tenantA, userId, {
      productId: 'p1',
      locationId: 'loc1',
      movementType: 'purchase_receipt',
      direction: 'in',
      quantity: 5,
    });
    expect(mov.direction).toBe('in');
    expect(balances.get(balanceKey('p1', 'loc1'))?.toString()).toBe('5');
  });

  it('2 — OUT movement decreases balance', async () => {
    balances.set(balanceKey('p1', 'loc1'), new Prisma.Decimal(10));
    await service.createManualMovement(tenantA, userId, {
      productId: 'p1',
      locationId: 'loc1',
      movementType: 'spill_waste',
      direction: 'out',
      quantity: 3,
    });
    expect(balances.get(balanceKey('p1', 'loc1'))?.toString()).toBe('7');
  });

  it('3 — insufficient stock rejects OUT', async () => {
    balances.set(balanceKey('p1', 'loc1'), new Prisma.Decimal(1));
    await expect(
      service.createManualMovement(tenantA, userId, {
        productId: 'p1',
        locationId: 'loc1',
        movementType: 'sale',
        direction: 'out',
        quantity: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(balances.get(balanceKey('p1', 'loc1'))?.toString()).toBe('1');
    expect(movements.length).toBe(0);
  });

  it('4 — failed movement does not change balance', async () => {
    const before = new Prisma.Decimal(4);
    balances.set(balanceKey('p1', 'loc1'), before);
    await expect(
      service.createManualMovement(tenantA, userId, {
        productId: 'p1',
        locationId: 'loc1',
        movementType: 'breakage',
        direction: 'out',
        quantity: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(balances.get(balanceKey('p1', 'loc1'))?.equals(before)).toBe(true);
  });

  it('5 — transfer atomically decreases origin and increases destination', async () => {
    balances.set(balanceKey('p1', 'loc-from'), new Prisma.Decimal(10));
    const result = await service.transferStock(tenantA, userId, {
      productId: 'p1',
      fromLocationId: 'loc-from',
      toLocationId: 'loc-to',
      quantity: 5,
    });
    expect(result.outMovement.movementType).toBe('transfer_out');
    expect(result.inMovement.movementType).toBe('transfer_in');
    expect(balances.get(balanceKey('p1', 'loc-from'))?.toString()).toBe('5');
    expect(balances.get(balanceKey('p1', 'loc-to'))?.toString()).toBe('5');
    expect(movements.length).toBe(2);
  });

  it('6 — transfer cannot leave origin negative', async () => {
    balances.set(balanceKey('p1', 'loc-from'), new Prisma.Decimal(2));
    await expect(
      service.transferStock(tenantA, userId, {
        productId: 'p1',
        fromLocationId: 'loc-from',
        toLocationId: 'loc-to',
        quantity: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(balances.get(balanceKey('p1', 'loc-to'))).toBeUndefined();
    expect(movements.length).toBe(0);
  });

  it('7 — adjustment creates ledger record instead of direct balance mutation', async () => {
    const result = await service.adjustStockToTarget(tenantA, userId, {
      productId: 'p1',
      locationId: 'loc1',
      targetQuantity: 12,
    });
    expect(result.movement?.movementType).toBe('initial_balance');
    expect(balances.get(balanceKey('p1', 'loc1'))?.toString()).toBe('12');
    expect(movements.length).toBe(1);
  });

  it('8 — tenant isolation', async () => {
    (prisma.bchBarProduct as { findFirst: jest.Mock }).findFirst.mockResolvedValueOnce(null);
    await expect(
      service.createManualMovement(tenantA, userId, {
        productId: 'p-other',
        locationId: 'loc1',
        movementType: 'other',
        direction: 'in',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('9 — movement history cannot be destructively deleted', async () => {
    expect(typeof (service as { deleteMovement?: unknown }).deleteMovement).toBe('undefined');
    expect(prisma.bchBarStockMovement).not.toHaveProperty('delete');
  });

  it('10 — reversal preserves original record', async () => {
    const original = await service.createManualMovement(tenantA, userId, {
      productId: 'p1',
      locationId: 'loc1',
      movementType: 'manual_adjustment',
      direction: 'in',
      quantity: 5,
    });
    const beforeCount = movements.length;
    const reversal = await service.reverseMovement(tenantA, userId, original.id, 'Correção');
    expect(reversal.reversesMovementId).toBe(original.id);
    expect(movements.length).toBe(beforeCount + 1);
    expect(balances.get(balanceKey('p1', 'loc1'))?.toString()).toBe('0');
    await expect(service.reverseMovement(tenantA, userId, original.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
