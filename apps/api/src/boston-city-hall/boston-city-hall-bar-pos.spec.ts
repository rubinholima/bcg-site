import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BostonCityHallBarPosService } from './boston-city-hall-bar-pos.service';
import { BostonCityHallBarOpenContainerService } from './boston-city-hall-bar-open-container.service';
import { BostonCityHallBarEventInventoryService } from './boston-city-hall-bar-event-inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { saleItemInventorySourceKey } from './boston-city-hall-bar-pos.constants';

describe('BostonCityHallBarPosService', () => {
  let service: BostonCityHallBarPosService;
  let openContainer: {
    getSellingUnitAvailability: jest.Mock;
    consumeSellingUnitInTransaction: jest.Mock;
  };

  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  const userId = 'u1';
  const locationId = 'loc1';
  const saleId = 'sale1';
  const itemId = 'item1';
  const sellingUnitId = 'su1';

  let sales: Array<Record<string, unknown>>;
  let items: Array<Record<string, unknown>>;
  let payments: Array<Record<string, unknown>>;
  let prices: Array<Record<string, unknown>>;

  const baseSale = () => ({
    id: saleId,
    tenantId: tenantA,
    saleNumber: 'BCH-BAR-2026-000001',
    locationId,
    eventId: null,
    status: 'open',
    currency: 'BRL',
    subtotal: new Prisma.Decimal(10),
    discountTotal: new Prisma.Decimal(0),
    total: new Prisma.Decimal(10),
    paymentStatus: 'unpaid',
    terminalLabel: null,
    openedByUserId: userId,
    closedByUserId: null,
    openedAt: new Date(),
    closedAt: null,
    notes: null,
    location: { code: 'central', name: 'Central' },
    openedBy: { name: 'Operador' },
    closedBy: null,
  });

  beforeEach(async () => {
    sales = [{ ...baseSale() }];
    items = [
      {
        id: itemId,
        tenantId: tenantA,
        saleId,
        productId: 'p1',
        sellingUnitId,
        productName: 'Cerveja',
        sellingUnitName: 'Lata',
        quantity: new Prisma.Decimal(1),
        unitPrice: new Prisma.Decimal(10),
        lineSubtotal: new Prisma.Decimal(10),
        lineDiscount: new Prisma.Decimal(0),
        lineTotal: new Prisma.Decimal(10),
        currency: 'BRL',
        priceId: 'price1',
        inventorySourceKey: saleItemInventorySourceKey(saleId, itemId),
        inventoryConsumedAt: null,
        sortOrder: 0,
      },
    ];
    payments = [];
    prices = [
      {
        id: 'price1',
        tenantId: tenantA,
        sellingUnitId,
        price: new Prisma.Decimal(10),
        currency: 'BRL',
        active: true,
        validFrom: null,
        validTo: null,
        createdAt: new Date(),
      },
    ];

    openContainer = {
      getSellingUnitAvailability: jest.fn(async () => ({
        fulfillableUnits: '10',
        mode: 'whole_unit',
      })),
      consumeSellingUnitInTransaction: jest.fn(async () => ({
        mode: 'whole_unit_stock',
        stockMovementId: 'mov1',
      })),
    };

    const prisma = {
      bchBarInventoryLocation: {
        findFirst: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
          where.tenantId === tenantA && where.id === locationId
            ? { id: locationId, tenantId: tenantA, active: true }
            : null,
        ),
      },
      event: { findFirst: jest.fn(async () => null) },
      bchBarSale: {
        findFirst: jest.fn(async (args: { where: Record<string, unknown>; include?: unknown }) => {
          const w = args.where as { id?: string; tenantId?: string; status?: string };
          const row = sales.find(
            (s) =>
              s.id === w.id &&
              s.tenantId === w.tenantId &&
              (w.status == null || s.status === w.status),
          );
          if (!row) return null;
          return {
            ...row,
            items: items.filter((i) => i.saleId === row.id),
            payments: payments.filter((p) => p.saleId === row.id),
          };
        }),
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: saleId,
          openedAt: new Date(),
          closedAt: null,
          location: { code: 'central', name: 'Central' },
          items: [],
          payments: [],
          openedBy: { name: 'Operador' },
          closedBy: null,
        })),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const s = sales.find((x) => x.id === where.id);
          if (s) Object.assign(s, data);
          return s;
        }),
      },
      bchBarSaleItem: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: itemId, ...data };
          items.push(row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = items.find((i) => i.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
        findMany: jest.fn(async () => items),
        delete: jest.fn(async ({ where }: { where: { id: string } }) => {
          items = items.filter((i) => i.id !== where.id);
        }),
      },
      bchBarSalePayment: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: 'pay1', createdAt: new Date(), receivedBy: { name: 'Op' }, ...data };
          payments.push(row);
          return row;
        }),
        delete: jest.fn(async ({ where }: { where: { id: string } }) => {
          payments = payments.filter((p) => p.id !== where.id);
        }),
      },
      bchBarSellingUnitPrice: {
        findMany: jest.fn(async () => prices.filter((p) => p.tenantId === tenantA)),
      },
      bchBarSellingUnit: {
        findFirst: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
          where.tenantId === tenantA && where.id === sellingUnitId
            ? {
                id: sellingUnitId,
                tenantId: tenantA,
                productId: 'p1',
                active: true,
                name: 'Lata',
                product: { id: 'p1', name: 'Cerveja', active: true },
              }
            : null,
        ),
      },
      bchBarProduct: { findMany: jest.fn(async () => []) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BostonCityHallBarPosService,
        { provide: PrismaService, useValue: prisma },
        { provide: BostonCityHallBarOpenContainerService, useValue: openContainer },
        {
          provide: BostonCityHallBarEventInventoryService,
          useValue: { assertPosSaleLocation: jest.fn(async () => undefined) },
        },
      ],
    }).compile();

    service = module.get(BostonCityHallBarPosService);
  });

  it('uses server-side active price for sale item', async () => {
    await service.addSaleItem(tenantA, saleId, { sellingUnitId, quantity: 2 });
    const item = items[items.length - 1];
    expect(item.unitPrice).toEqual(new Prisma.Decimal(10));
    expect(item.lineTotal).toEqual(new Prisma.Decimal(20));
  });

  it('rejects client-submitted price', async () => {
    await expect(
      service.addSaleItem(tenantA, saleId, { sellingUnitId, quantity: 1, unitPrice: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not consume inventory when adding to open cart', async () => {
    await service.addSaleItem(tenantA, saleId, { sellingUnitId, quantity: 1 });
    expect(openContainer.consumeSellingUnitInTransaction).not.toHaveBeenCalled();
  });

  it('requires paid total before completion', async () => {
    await expect(service.completeSale(tenantA, saleId, userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('completes sale and consumes inventory once per item', async () => {
    payments.push({
      id: 'pay1',
      saleId,
      tenantId: tenantA,
      amount: new Prisma.Decimal(10),
      method: 'cash',
      createdAt: new Date(),
      receivedBy: { name: 'Op' },
    });
    sales[0].paymentStatus = 'paid';

    await service.completeSale(tenantA, saleId, userId);

    expect(openContainer.consumeSellingUnitInTransaction).toHaveBeenCalledTimes(1);
    expect(openContainer.consumeSellingUnitInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      tenantA,
      userId,
      expect.objectContaining({
        sourceKey: saleItemInventorySourceKey(saleId, itemId),
        consumptionType: 'sale',
      }),
    );
    expect(sales[0].status).toBe('completed');
  });

  it('completion is idempotent', async () => {
    payments.push({
      id: 'pay1',
      saleId,
      tenantId: tenantA,
      amount: new Prisma.Decimal(10),
      method: 'cash',
      createdAt: new Date(),
      receivedBy: { name: 'Op' },
    });
    items[0].inventoryConsumedAt = new Date();
    sales[0].status = 'completed';

    const result = await service.completeSale(tenantA, saleId, userId);
    expect(result.status).toBe('completed');
    expect(openContainer.consumeSellingUnitInTransaction).not.toHaveBeenCalled();
  });

  it('blocks completion when inventory insufficient', async () => {
    payments.push({
      id: 'pay1',
      saleId,
      tenantId: tenantA,
      amount: new Prisma.Decimal(10),
      method: 'cash',
      createdAt: new Date(),
      receivedBy: { name: 'Op' },
    });
    openContainer.getSellingUnitAvailability.mockResolvedValueOnce({ fulfillableUnits: '0' });

    await expect(service.completeSale(tenantA, saleId, userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sales[0].status).toBe('open');
  });

  it('cancelled open sale does not consume inventory', async () => {
    await service.cancelOpenSale(tenantA, saleId, userId);
    expect(sales[0].status).toBe('cancelled');
    expect(openContainer.consumeSellingUnitInTransaction).not.toHaveBeenCalled();
  });

  it('blocks destructive cancellation of completed sale', async () => {
    sales[0].status = 'completed';
    await expect(service.cancelOpenSale(tenantA, saleId, userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('isolates tenant on getSale', async () => {
    await expect(service.getSale(tenantB, saleId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
