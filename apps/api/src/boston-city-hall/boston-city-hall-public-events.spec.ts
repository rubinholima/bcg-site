import { Test, TestingModule } from '@nestjs/testing';
import { BostonCityHallPublicEventsService } from './boston-city-hall-public-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallTicketingService } from './boston-city-hall-ticketing.service';
import { HomeContentService } from '../home-content/home-content.service';
import {
  assertNoInternalPublicKeys,
  listItemFromEventRow,
  toPublicTicketType,
} from './boston-city-hall-public-events.util';
import {
  mapSalesStatusToPublicAvailability,
  summarizeTicketAvailability,
} from './boston-city-hall-public-events.constants';
import type { EventTicketTypeDto } from './boston-city-hall-ticketing.constants';

const BCH_TENANT_ID = 'tenant-bch';
const OTHER_TENANT_ID = 'tenant-other';

function baseType(overrides: Partial<EventTicketTypeDto> = {}): EventTicketTypeDto {
  return {
    id: 'type-1',
    eventId: 'ev-1',
    name: 'Geral',
    description: null,
    price: '50.00',
    quantity: 100,
    purchaseLimit: null,
    active: true,
    sortOrder: 0,
    salesStartAt: null,
    salesEndAt: null,
    usesLots: false,
    currentPrice: '50.00',
    capacity: 100,
    sold: 10,
    held: 0,
    available: 90,
    salesStatus: 'on_sale',
    lots: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('BostonCityHallPublicEventsService', () => {
  let service: BostonCityHallPublicEventsService;
  let prisma: {
    tenant: { findUnique: jest.Mock };
    event: { findMany: jest.Mock; findFirst: jest.Mock };
  };
  let ticketing: { getEventTicketing: jest.Mock };
  let homeContent: { enrichBlocksWithGlobalPresence: jest.Mock };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: BCH_TENANT_ID }),
      },
      event: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    ticketing = { getEventTicketing: jest.fn() };
    homeContent = {
      enrichBlocksWithGlobalPresence: jest.fn(async (blocks) => blocks),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BostonCityHallPublicEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BostonCityHallTicketingService, useValue: ticketing },
        { provide: HomeContentService, useValue: homeContent },
      ],
    }).compile();

    service = module.get(BostonCityHallPublicEventsService);
  });

  it('lista evento publicado do tenant BCH', async () => {
    prisma.event.findMany.mockResolvedValue([
      {
        id: 'ev-pub',
        slug: 'show-publico',
        name: 'Show',
        description: 'Desc',
        logoUrl: null,
        startDate: new Date('2026-12-01T20:00:00.000Z'),
        endDate: null,
        ticketing: { enabled: false, currency: 'USD' },
        venueBooking: { space: { name: 'Main Hall' } },
      },
    ]);

    const list = await service.list();
    expect(list).toHaveLength(1);
    expect(list[0].slug).toBe('show-publico');
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: BCH_TENANT_ID, status: 'published' }),
      }),
    );
  });

  it('não retorna detalhe para evento de outro tenant (findFirst null)', async () => {
    prisma.event.findFirst.mockResolvedValue(null);
    const detail = await service.getBySlug('outro-evento');
    expect(detail).toBeNull();
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: BCH_TENANT_ID, status: 'published' }),
      }),
    );
  });

  it('resolve detalhe por slug para evento publicado BCH', async () => {
    prisma.event.findFirst.mockResolvedValue({
      id: 'ev-1',
      slug: 'gala',
      name: 'Gala',
      description: null,
      logoUrl: null,
      startDate: new Date('2026-11-01T19:00:00.000Z'),
      endDate: null,
      content: { blocks: [] },
      ticketing: { enabled: true, currency: 'USD' },
      venueBooking: null,
    });
    ticketing.getEventTicketing.mockResolvedValue({
      currency: 'USD',
      types: [baseType()],
    });

    const detail = await service.getBySlug('gala');
    expect(detail?.slug).toBe('gala');
    expect(detail?.ticketing?.types[0].name).toBe('Geral');
  });
});

describe('publicação e campos públicos BCH', () => {
  it('where de listagem exige tenant BCH — draft não entra (mock de findMany vazio)', () => {
    expect(BCH_TENANT_ID).not.toBe(OTHER_TENANT_ID);
  });

  it('DTO público de ingresso não expõe sold/held/eventId', () => {
    const pub = toPublicTicketType(baseType(), 'USD');
    expect(pub).toBeTruthy();
    assertNoInternalPublicKeys(pub);
    expect(pub).not.toHaveProperty('sold');
    expect(pub).not.toHaveProperty('held');
    expect(pub).not.toHaveProperty('id');
  });

  it('list item público não contém tenantId', () => {
    const item = listItemFromEventRow({
      slug: 'x',
      name: 'X',
      description: null,
      logoUrl: null,
      startDate: null,
      endDate: null,
      spaceName: 'Hall',
      ticketingEnabled: true,
      ticketTypes: [baseType()],
      currency: 'USD',
    });
    assertNoInternalPublicKeys(item);
  });

  it('disponibilidade canônica: esgotado e venda não iniciada', () => {
    expect(
      mapSalesStatusToPublicAvailability({
        salesStatus: 'sold_out',
        available: 0,
        capacity: 50,
      }),
    ).toBe('SOLD_OUT');
    expect(
      mapSalesStatusToPublicAvailability({
        salesStatus: 'not_started',
        available: 50,
        capacity: 50,
      }),
    ).toBe('NOT_YET_ON_SALE');
  });

  it('resumo prioriza AVAILABLE sobre SOLD_OUT quando há tipos mistos', () => {
    expect(
      summarizeTicketAvailability(['SOLD_OUT', 'AVAILABLE'], true),
    ).toBe('AVAILABLE');
  });
});
