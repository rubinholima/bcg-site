import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FmfMatchReportService, type FmfMatchReportCandidate } from './fmf-match-report.service';
import { FmfScraperService } from './fmf-scraper.service';

const TENANT_ID = 'tenant-villa';
const CANDIDATE: FmfMatchReportCandidate = {
  externalMatchId: '46027',
  reportUrl: 'https://fmf.example/report.pdf',
  preset: 'sub15_2div',
  competition: 'Mineiro Sub-15 2ª divisão 2026',
  category: 'sub15_2div',
  phase: 'CLASSIFICATÓRIA',
  round: 1,
  matchDate: '2026-03-01',
  kickoffTime: '15:00',
  homeTeam: 'VILLA NOVA ATLÉTICO CLUBE',
  awayTeam: 'ADVERSÁRIO',
  homeScore: 2,
  awayScore: 1,
  imported: false,
  importedAt: null,
  linkedPlayers: 0,
  unresolvedPlayers: [],
};

describe('FmfMatchReportService.importReports', () => {
  let service: FmfMatchReportService;

  const prisma = {
    tenant: {
      findUnique: jest.fn(),
    },
    fmfMatchReport: {
      findMany: jest.fn(),
    },
    player: {
      findMany: jest.fn(),
    },
    fmfPlayerMatchStat: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn(),
  };

  const scraper = {
    getStatus: jest.fn(),
    runImport: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      name: 'Villa Nova SAF',
      slug: 'villa-nova-saf',
      tradeName: null,
    });
    prisma.fmfMatchReport.findMany.mockResolvedValue([]);
    prisma.player.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FmfMatchReportService,
        { provide: PrismaService, useValue: prisma },
        { provide: FmfScraperService, useValue: scraper },
      ],
    }).compile();

    service = module.get(FmfMatchReportService);
  });

  it('importa candidatos pendentes quando existem', async () => {
    jest.spyOn(service, 'listCandidates').mockResolvedValue([CANDIDATE]);
    const importCandidate = jest
      .spyOn(service as unknown as { importCandidate: () => Promise<{ linked: number; unresolved: number }> }, 'importCandidate')
      .mockResolvedValue({ linked: 3, unresolved: 1 });

    const result = await service.importReports({ tenantId: TENANT_ID, all: true });

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.pending).toBe(0);
    expect(result.results).toHaveLength(1);
    expect(importCandidate).toHaveBeenCalledTimes(1);
  });

  it('retorna no-op idempotente quando não há candidatos pendentes', async () => {
    jest.spyOn(service, 'listCandidates').mockResolvedValue([
      { ...CANDIDATE, imported: true, importedAt: '2026-03-02T12:00:00.000Z' },
    ]);

    const result = await service.importReports({ tenantId: TENANT_ID, all: true });

    expect(result).toEqual({
      tenantId: TENANT_ID,
      imported: 0,
      failed: 0,
      pending: 0,
      linked: 0,
      unresolved: 0,
      results: [],
    });
  });

  it('mantém 404 quando externalMatchId não existe', async () => {
    jest.spyOn(service, 'listCandidates').mockResolvedValue([]);

    await expect(
      service.importReports({ tenantId: TENANT_ID, externalMatchId: '99999' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propaga falha real de importação no resultado sem mascarar como no-op', async () => {
    jest.spyOn(service, 'listCandidates').mockResolvedValue([CANDIDATE]);
    jest
      .spyOn(service as unknown as { importCandidate: () => Promise<never> }, 'importCandidate')
      .mockRejectedValue(new Error('Falha ao baixar PDF'));

    const result = await service.importReports({ tenantId: TENANT_ID, all: true });

    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.results[0]).toMatchObject({
      externalMatchId: '46027',
      ok: false,
      error: 'Falha ao baixar PDF',
    });
  });
});
