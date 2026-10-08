import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BostonCityHallBarCloseService } from './boston-city-hall-bar-close.service';
import { BostonCityHallBarEventInventoryService } from './boston-city-hall-bar-event-inventory.service';
import { BostonCityHallBarReportsService } from './boston-city-hall-bar-reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BostonCityHallBarCloseService', () => {
  let service: BostonCityHallBarCloseService;
  const tenantA = 'tenant-a';
  const closeId = 'close-1';
  const invId = 'inv-1';
  const locId = 'loc-1';

  let closes: Array<Record<string, unknown>>;
  let inventories: Array<Record<string, unknown>>;
  let physicalCountFindFirst: jest.Mock;

  beforeEach(async () => {
    physicalCountFindFirst = jest.fn(async (args: { where: Record<string, unknown> }) => {
      if (args.where.status && typeof args.where.status === 'object' && 'in' in args.where.status) return null;
      return null;
    });
    closes = [
      {
        id: closeId,
        tenantId: tenantA,
        eventId: 'ev1',
        eventInventoryId: invId,
        locationId: locId,
        status: 'draft',
        closedAt: null,
        warnings: [],
        notes: null,
        snapshot: null,
        event: { name: 'Show' },
        location: { name: 'Bar' },
        closedBy: null,
      },
    ];
    inventories = [{ id: invId, tenantId: tenantA, eventId: 'ev1', locationId: locId, status: 'closed' }];

    const prisma = {
      bchBarClose: {
        findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          return (
            closes.find((c) => {
              if (where.id && c.id !== where.id) return false;
              if (where.tenantId && c.tenantId !== where.tenantId) return false;
              if (where.eventInventoryId && c.eventInventoryId !== where.eventInventoryId) return false;
              return true;
            }) ?? null
          );
        }),
        findMany: jest.fn(async () => closes),
        create: jest.fn(),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = closes.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
      },
      bchBarEventInventory: {
        findFirst: jest.fn(async ({ where }: { where: { id?: string; tenantId: string } }) =>
          inventories.find((i) => i.id === where.id && i.tenantId === where.tenantId) ?? null,
        ),
      },
      bchBarOpenContainer: { findMany: jest.fn(async () => []) },
      bchBarPhysicalCount: {
        findFirst: physicalCountFindFirst,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BostonCityHallBarCloseService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: BostonCityHallBarEventInventoryService,
          useValue: { getSummary: jest.fn(async () => ({ lines: [] })) },
        },
        {
          provide: BostonCityHallBarReportsService,
          useValue: {
            getEventReport: jest.fn(async () => ({
              revenue: '0.00',
              estimatedCogs: '0.00',
              estimatedGrossMargin: '0.00',
              salesCount: 0,
            })),
          },
        },
      ],
    }).compile();

    service = module.get(BostonCityHallBarCloseService);
  });

  it('11 — finalize requires closed event inventory', async () => {
    inventories[0].status = 'active';
    await expect(service.finalizeClose(tenantA, 'u1', closeId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('12 — active physical count blocks finalize', async () => {
    physicalCountFindFirst.mockImplementation(async (args: { where: Record<string, unknown> }) => {
      if (args.where.status && typeof args.where.status === 'object' && 'in' in args.where.status) {
        return { id: 'pc1' };
      }
      return null;
    });
    await expect(service.finalizeClose(tenantA, 'u1', closeId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('10 — finalized close cannot refresh draft', async () => {
    closes[0].status = 'finalized';
    await expect(
      service.createOrRefreshDraft(tenantA, 'u1', { eventInventoryId: invId }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('13 — tenant isolation on get', async () => {
    await expect(service.getClose('other-tenant', closeId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
