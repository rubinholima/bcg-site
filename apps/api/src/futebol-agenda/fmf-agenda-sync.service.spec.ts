import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FmfScraperService } from '../fmf-scraper/fmf-scraper.service';
import { FootballActivitySpacesService } from './football-activity-spaces.service';
import { FmfAgendaSyncService } from './fmf-agenda-sync.service';

const BOSTON_ID = 'tenant-boston';
const VILLA_ID = 'tenant-villa';

describe('FmfAgendaSyncService', () => {
  let service: FmfAgendaSyncService;

  const prisma = {
    tenant: { findMany: jest.fn() },
    integrationConfig: { findUnique: jest.fn() },
    footballAgendaEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const fmfScraper = { getStatus: jest.fn() };
  const spaces = {
    ensureDefaults: jest.fn(),
    resolveByName: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma.tenant.findMany.mockResolvedValue([
      {
        id: BOSTON_ID,
        name: 'BOSTON CITY FC - BRASIL',
        slug: 'boston-city-fc-brasil',
        categories: JSON.stringify(['sub13', 'sub15', 'sub17', 'sub20']),
        kind: { name: 'Clube de Futebol' },
      },
      {
        id: VILLA_ID,
        name: 'Villa Nova SAF',
        slug: 'villa-nova-saf',
        categories: JSON.stringify(['modulo_ii', 'sub15_2div', 'sub20_2div', 'sub13_2div']),
        kind: { name: 'Clube de Futebol' },
      },
    ]);

    prisma.integrationConfig.findUnique.mockResolvedValue({
      config: {
        sub20_2div: {
          key: 'sub20_2div',
          fmfD: 31,
          slug: 'mineiro-sub20-2div-2026',
          name: 'Mineiro Sub-20 2ª divisão 2026',
          fixtureCategory: 'sub20_2div',
          competitionLabelTemplate: 'SUB 20 - 2ª DIVISÃO - {year}',
        },
      },
    });

    fmfScraper.getStatus.mockResolvedValue({
      updatedAt: '2026-09-11T12:00:00.000Z',
      categories: {
        sub20: {
          preset: 'sub20',
          fmfD: 44,
          slug: 'mineiro-sub20-1-2026',
          name: 'Mineiro Sub-20 1ª divisão 2026',
          fixtureCategory: 'sub20',
          matches: [
            {
              status: 'scheduled',
              matchDate: '2026-12-01',
              kickoffTime: '15:00:00',
              homeName: 'BOSTON CITY',
              awayName: 'ADVERSÁRIO',
              venueText: 'CT ATHLETICSAO JOAO DEL REI',
              fmfJogoNumber: 99,
            },
          ],
        },
        sub20_2div: {
          preset: 'sub20_2div',
          fmfD: 31,
          slug: 'mineiro-sub20-2div-2026',
          name: 'Mineiro Sub-20 2ª divisão 2026',
          fixtureCategory: 'sub20_2div',
          matches: [
            {
              status: 'scheduled',
              matchDate: '2026-12-02',
              kickoffTime: '15:00:00',
              homeName: 'VILLA NOVA',
              awayName: 'ADVERSÁRIO',
              venueText: 'Castor Cifuentes',
              fmfJogoNumber: 51,
            },
          ],
        },
      },
    });

    spaces.ensureDefaults.mockResolvedValue(undefined);
    spaces.resolveByName.mockResolvedValue('space-resolved');
    prisma.footballAgendaEntry.findFirst.mockResolvedValue(null);
    prisma.footballAgendaEntry.create.mockResolvedValue({ id: 'agenda-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FmfAgendaSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: FmfScraperService, useValue: fmfScraper },
        { provide: FootballActivitySpacesService, useValue: spaces },
      ],
    }).compile();

    service = module.get(FmfAgendaSyncService);
  });

  it('Boston agenda sync completa reutilizando espaço via resolveByName', async () => {
    const result = await service.syncAll();

    expect(result.tenants.some((t) => t.tenantSlug === 'boston-city-fc-brasil')).toBe(true);
    expect(spaces.resolveByName).toHaveBeenCalledWith(
      BOSTON_ID,
      'CT ATHLETICSAO JOAO DEL REI',
    );
    expect(prisma.footballAgendaEntry.create).toHaveBeenCalled();
  });

  it('Villa continua sincronizando agenda com resolveByName', async () => {
    const result = await service.syncAll({ tenantId: VILLA_ID });

    expect(result.tenants).toHaveLength(1);
    expect(result.tenants[0]?.tenantSlug).toBe('villa-nova-saf');
    expect(spaces.resolveByName).toHaveBeenCalledWith(VILLA_ID, 'Castor Cifuentes');
    expect(prisma.footballAgendaEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'sub20',
          externalId: 'fmf-d31-j51',
        }),
      }),
    );
  });
});
