import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BostonCityHallBarCostService } from './boston-city-hall-bar-cost.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BostonCityHallBarCostService', () => {
  let service: BostonCityHallBarCostService;
  const tenantA = 'tenant-a';
  const productId = 'p1';
  const sellingWhole = 'su-whole';
  const sellingDose = 'su-dose';

  const costs = [
    {
      id: 'c-old',
      tenantId: tenantA,
      productId,
      amount: new Prisma.Decimal(80),
      currency: 'BRL',
      validFrom: new Date('2025-01-01'),
      validTo: new Date('2025-06-01'),
    },
    {
      id: 'c-new',
      tenantId: tenantA,
      productId,
      amount: new Prisma.Decimal(90),
      currency: 'BRL',
      validFrom: new Date('2025-06-01'),
      validTo: null,
    },
  ];

  beforeEach(async () => {
    const prisma = {
      bchBarProductCost: {
        findMany: jest.fn(async ({ where }: { where: { validFrom?: { lte: Date } } }) => {
          const at = where.validFrom?.lte ?? new Date();
          const valid = costs.filter(
            (c) =>
              c.validFrom <= at && (c.validTo == null || c.validTo >= at),
          );
          valid.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
          return valid.slice(0, 1);
        }),
      },
      bchBarSellingUnit: {
        findFirst: jest.fn(async ({ where }: { where: { id: string } }) => {
          if (where.id === sellingWhole) {
            return {
              id: sellingWhole,
              productId,
              physicalUnitsConsumedPerSale: new Prisma.Decimal(1),
              expectedPortionsPerPhysical: null,
              portionAmount: null,
              portionUnit: null,
            };
          }
          if (where.id === sellingDose) {
            return {
              id: sellingDose,
              productId,
              physicalUnitsConsumedPerSale: new Prisma.Decimal(0.1),
              expectedPortionsPerPhysical: new Prisma.Decimal(10),
              portionAmount: new Prisma.Decimal(75),
              portionUnit: 'ml',
            };
          }
          return null;
        }),
      },
      bchBarProduct: {
        findFirst: jest.fn(async () => ({
          id: productId,
          physicalUnit: {
            volumeMl: 750,
            quantityBasis: new Prisma.Decimal(1),
          },
        })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BostonCityHallBarCostService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BostonCityHallBarCostService);
  });

  it('1 — resolves latest valid cost deterministically', async () => {
    const r = await service.resolveProductCost(tenantA, productId, new Date('2025-07-01'));
    expect(r?.amount.toString()).toBe('90');
    expect(r?.id).toBe('c-new');
  });

  it('2 — partial selling-unit cost from bottle cost / portions', async () => {
    const r = await service.computeExpectedUnitCost(tenantA, productId, sellingDose, new Date('2025-07-01'));
    expect(r?.unitCost.toString()).toBe('9');
  });

  it('5 — whole-unit cost = physical cost × units consumed', async () => {
    const r = await service.computeExpectedUnitCost(tenantA, productId, sellingWhole, new Date('2025-07-01'));
    expect(r?.unitCost.toString()).toBe('90');
  });

  it('3 — line snapshot uses quantity', async () => {
    const snap = await service.computeLineCostSnapshot(
      tenantA,
      productId,
      sellingDose,
      new Prisma.Decimal(2),
      new Date('2025-07-01'),
    );
    expect(snap?.unitCostSnapshot.toString()).toBe('9');
    expect(snap?.lineCostSnapshot.toString()).toBe('18');
  });
});
