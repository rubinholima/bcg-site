import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BostonCityHallBarService', () => {
  let service: BostonCityHallBarService;
  let prisma: {
    tenant: { findUnique: jest.Mock };
    bchBarProduct: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    bchBarProductPhysicalUnit: { create: jest.Mock; upsert: jest.Mock };
    bchBarSellingUnit: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    bchBarSellingUnitPrice: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    bchBarInventoryLocation: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    bchBarStockBalance: { findMany: jest.Mock; upsert: jest.Mock };
    $transaction: jest.Mock;
  };

  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';

  beforeEach(async () => {
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: tenantA }) },
      bchBarProduct: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      bchBarProductPhysicalUnit: { create: jest.fn(), upsert: jest.fn() },
      bchBarSellingUnit: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      bchBarSellingUnitPrice: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      bchBarInventoryLocation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      bchBarStockBalance: { findMany: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BostonCityHallBarService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BostonCityHallBarService);
  });

  it('1 — resolveBchTenantId isola tenant BCH', async () => {
    const id = await service.resolveBchTenantId();
    expect(id).toBe(tenantA);
    prisma.bchBarProduct.findFirst.mockResolvedValue({ id: 'p1', tenantId: tenantB });
    await expect(service.getProduct(tenantA, 'p1')).rejects.toThrow(); // not found first
    prisma.bchBarProduct.findFirst.mockResolvedValue(null);
    await expect(service.getProduct(tenantA, 'p1')).rejects.toThrow();
  });

  it('2 — cria produto com unidade física', async () => {
    prisma.bchBarProduct.create.mockResolvedValue({
      id: 'prod-1',
      tenantId: tenantA,
      sku: 'WHISKY-1',
      name: 'Whisky',
      category: 'spirits',
      description: null,
      imageUrl: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.bchBarProductPhysicalUnit.create.mockResolvedValue({});
    prisma.bchBarProduct.findFirst.mockResolvedValue({
      id: 'prod-1',
      sku: 'WHISKY-1',
      name: 'Whisky',
      category: 'spirits',
      description: null,
      imageUrl: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      physicalUnit: {
        id: 'pu-1',
        unitType: 'bottle',
        label: '750ml',
        volumeMl: 750,
        quantityBasis: new Prisma.Decimal(1),
      },
    });

    const dto = await service.createProduct(tenantA, {
      sku: 'WHISKY-1',
      name: 'Whisky',
      category: 'spirits',
      physicalUnit: { unitType: 'bottle', volumeMl: 750 },
    });
    expect(dto.physicalUnit?.unitType).toBe('bottle');
    expect(dto.sku).toBe('WHISKY-1');
  });

  it('3 — múltiplas unidades de venda por produto', async () => {
    prisma.bchBarProduct.findFirst.mockResolvedValue({ id: 'prod-1', active: true });
    prisma.bchBarSellingUnit.create
      .mockResolvedValueOnce({
        id: 'su-dose',
        tenantId: tenantA,
        productId: 'prod-1',
        name: 'Dose 75ml',
        active: true,
        sortOrder: 0,
        portionAmount: new Prisma.Decimal(75),
        portionUnit: 'ml',
        physicalUnitsConsumedPerSale: new Prisma.Decimal(0.1),
        expectedPortionsPerPhysical: new Prisma.Decimal(10),
        createdAt: new Date(),
        updatedAt: new Date(),
        product: { name: 'Whisky', active: true },
      })
      .mockResolvedValueOnce({
        id: 'su-bottle',
        tenantId: tenantA,
        productId: 'prod-1',
        name: 'Garrafa',
        active: true,
        sortOrder: 1,
        portionAmount: null,
        portionUnit: null,
        physicalUnitsConsumedPerSale: new Prisma.Decimal(1),
        expectedPortionsPerPhysical: new Prisma.Decimal(1),
        createdAt: new Date(),
        updatedAt: new Date(),
        product: { name: 'Whisky', active: true },
      });

    const dose = await service.createSellingUnit(tenantA, 'prod-1', {
      name: 'Dose 75ml',
      portionAmount: 75,
      portionUnit: 'ml',
      physicalUnitsConsumedPerSale: 0.1,
    });
    const bottle = await service.createSellingUnit(tenantA, 'prod-1', {
      name: 'Garrafa',
      physicalUnitsConsumedPerSale: 1,
    });
    expect(dose.expectedPortionsPerPhysical).toBe('10');
    expect(bottle.physicalUnitsConsumedPerSale).toBe('1');
  });

  it('4 — rendimento/conversão representados', async () => {
    prisma.bchBarProduct.findFirst.mockResolvedValue({ id: 'p1', active: true });
    prisma.bchBarSellingUnit.create.mockResolvedValue({
      id: 'su1',
      tenantId: tenantA,
      productId: 'p1',
      name: 'Dose',
      active: true,
      sortOrder: 0,
      portionAmount: new Prisma.Decimal(75),
      portionUnit: 'ml',
      physicalUnitsConsumedPerSale: new Prisma.Decimal(0.1),
      expectedPortionsPerPhysical: new Prisma.Decimal(10),
      createdAt: new Date(),
      updatedAt: new Date(),
      product: { name: 'W', active: true },
    });
    const su = await service.createSellingUnit(tenantA, 'p1', {
      name: 'Dose',
      physicalUnitsConsumedPerSale: '0.1',
      expectedPortionsPerPhysical: 10,
    });
    expect(su.physicalUnitsConsumedPerSale).toBe('0.1');
    expect(su.expectedPortionsPerPhysical).toBe('10');
  });

  it('5 — preço independente por unidade de venda', async () => {
    prisma.bchBarSellingUnit.findFirst.mockResolvedValue({
      id: 'su1',
      tenantId: tenantA,
      active: true,
      product: { active: true },
    });
    prisma.bchBarSellingUnitPrice.create.mockResolvedValue({
      id: 'pr1',
      tenantId: tenantA,
      sellingUnitId: 'su1',
      price: new Prisma.Decimal(25),
      currency: 'BRL',
      active: true,
      validFrom: null,
      validTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sellingUnit: { name: 'Dose' },
    });
    const price = await service.createPrice(tenantA, 'su1', { price: 25, currency: 'BRL' });
    expect(price.price).toBe('25.00');
    expect(price.currency).toBe('BRL');
  });

  it('6 — saldo por local', async () => {
    prisma.bchBarProduct.findFirst.mockResolvedValue({ id: 'p1', tenantId: tenantA });
    prisma.bchBarInventoryLocation.findFirst.mockResolvedValue({
      id: 'loc1',
      tenantId: tenantA,
      active: true,
    });
    prisma.bchBarStockBalance.upsert.mockResolvedValue({
      id: 'bal1',
      tenantId: tenantA,
      productId: 'p1',
      locationId: 'loc1',
      quantityOnHand: new Prisma.Decimal(12),
      updatedAt: new Date(),
      product: { sku: 'B1', name: 'Beer' },
      location: { code: 'central', name: 'Central' },
    });
    const bal = await service.upsertStockBalance(tenantA, {
      productId: 'p1',
      locationId: 'loc1',
      quantityOnHand: 12,
    });
    expect(bal.locationCode).toBe('central');
    expect(bal.quantityOnHand).toBe('12');
  });

  it('7 — produto inativo bloqueia nova unidade de venda', async () => {
    prisma.bchBarProduct.findFirst.mockResolvedValue({ id: 'p1', active: false });
    await expect(
      service.createSellingUnit(tenantA, 'p1', {
        name: 'Dose',
        physicalUnitsConsumedPerSale: 0.1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('7b — preço bloqueado para unidade inativa', async () => {
    prisma.bchBarSellingUnit.findFirst.mockResolvedValue({
      id: 'su1',
      active: false,
      product: { active: true },
    });
    await expect(
      service.createPrice(tenantA, 'su1', { price: 10, currency: 'BRL' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
