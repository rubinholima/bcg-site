import { Test, TestingModule } from '@nestjs/testing';
import { FmfAgendaSyncService } from '../futebol-agenda/fmf-agenda-sync.service';
import { FmfFullSyncError, FmfFullSyncService } from './fmf-full-sync.service';
import { FmfMatchReportService } from './fmf-match-report.service';
import { FmfPageSyncService } from './fmf-page-sync.service';
import { FmfScraperService } from './fmf-scraper.service';
import { FmfTravelSyncService } from './fmf-travel-sync.service';
import { FmfVisitingTeamsSyncService } from './fmf-visiting-teams-sync.service';

const STORE = {
  updatedAt: '2026-09-11T12:00:00.000Z',
  lastRunOk: true,
  categories: { modulo_ii: { preset: 'modulo_ii' } },
};

describe('FmfFullSyncService', () => {
  let service: FmfFullSyncService;

  const scraper = { runImport: jest.fn() };
  const visitingTeamsSync = { syncFromStore: jest.fn() };
  const travelSync = { syncAll: jest.fn() };
  const agendaSync = { syncAll: jest.fn() };
  const pageSync = { syncPages: jest.fn(), getSyncCandidates: jest.fn() };
  const matchReports = { importReports: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    scraper.runImport.mockResolvedValue(STORE);
    visitingTeamsSync.syncFromStore.mockResolvedValue({ created: 0, updated: 0 });
    travelSync.syncAll.mockResolvedValue({ syncedAt: '2026-09-11T12:00:00.000Z', tenants: [] });
    agendaSync.syncAll.mockResolvedValue({ syncedAt: '2026-09-11T12:00:00.000Z', tenants: [] });
    pageSync.syncPages.mockResolvedValue({ synced: 1 });
    pageSync.getSyncCandidates.mockResolvedValue([
      { tenantId: 'tenant-a', tenantSlug: 'villa-nova-saf' },
    ]);
    matchReports.importReports.mockResolvedValue({
      imported: 1,
      failed: 0,
      linked: 1,
      unresolved: 0,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FmfFullSyncService,
        { provide: FmfScraperService, useValue: scraper },
        { provide: FmfVisitingTeamsSyncService, useValue: visitingTeamsSync },
        { provide: FmfTravelSyncService, useValue: travelSync },
        { provide: FmfAgendaSyncService, useValue: agendaSync },
        { provide: FmfPageSyncService, useValue: pageSync },
        { provide: FmfMatchReportService, useValue: matchReports },
      ],
    }).compile();

    service = module.get(FmfFullSyncService);
  });

  it('full sync invoca travel sync exatamente uma vez', async () => {
    await service.runFullSync({ skipPages: true, skipMatchReports: true });

    expect(travelSync.syncAll).toHaveBeenCalledTimes(1);
  });

  it('full sync invoca agenda sync exatamente uma vez', async () => {
    await service.runFullSync({ skipPages: true, skipMatchReports: true });

    expect(agendaSync.syncAll).toHaveBeenCalledTimes(1);
  });

  it('executa travel antes de agenda', async () => {
    const order: string[] = [];
    travelSync.syncAll.mockImplementation(async () => {
      order.push('travel');
      return { syncedAt: '2026-09-11T12:00:00.000Z', tenants: [] };
    });
    agendaSync.syncAll.mockImplementation(async () => {
      order.push('agenda');
      return { syncedAt: '2026-09-11T12:00:00.000Z', tenants: [] };
    });

    await service.runFullSync({ skipPages: true, skipMatchReports: true });

    expect(order).toEqual(['travel', 'agenda']);
  });

  it('falha de travel não retorna sucesso silencioso', async () => {
    travelSync.syncAll.mockRejectedValue(new Error('viagens indisponível'));

    let caught: FmfFullSyncError | undefined;
    try {
      await service.runFullSync({ skipPages: true, skipMatchReports: true });
    } catch (e) {
      caught = e as FmfFullSyncError;
    }

    expect(caught?.name).toBe('FmfFullSyncError');
    expect(caught?.stage).toBe('travel');
    expect(caught?.partial).toMatchObject({
      ok: false,
      failedStages: ['travel'],
      stages: {
        travel: { ok: false, error: 'viagens indisponível' },
      },
    });
    expect(agendaSync.syncAll).not.toHaveBeenCalled();
  });

  it('não duplica chamadas dentro de um ciclo completo', async () => {
    await service.runFullSync();

    expect(scraper.runImport).toHaveBeenCalledTimes(1);
    expect(travelSync.syncAll).toHaveBeenCalledTimes(1);
    expect(agendaSync.syncAll).toHaveBeenCalledTimes(1);
    expect(pageSync.syncPages).toHaveBeenCalledTimes(1);
    expect(matchReports.importReports).toHaveBeenCalledTimes(1);
  });

  it('runImport isolado não aciona travel nem agenda', async () => {
    await scraper.runImport({ preset: 'modulo_ii' });

    expect(travelSync.syncAll).not.toHaveBeenCalled();
    expect(agendaSync.syncAll).not.toHaveBeenCalled();
  });

  it('permite pular etapas opcionais sem invocar travel/agenda duplicados', async () => {
    await service.runFullSync({
      skipVisitingTeams: true,
      skipPages: true,
      skipMatchReports: true,
      tenantId: 'tenant-a',
    });

    expect(visitingTeamsSync.syncFromStore).not.toHaveBeenCalled();
    expect(pageSync.syncPages).not.toHaveBeenCalled();
    expect(matchReports.importReports).not.toHaveBeenCalled();
    expect(travelSync.syncAll).toHaveBeenCalledWith({ tenantId: 'tenant-a' });
    expect(agendaSync.syncAll).toHaveBeenCalledWith({ tenantId: 'tenant-a' });
  });
});
