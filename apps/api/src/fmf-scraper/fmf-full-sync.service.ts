import { Injectable, Logger } from '@nestjs/common';
import {
  FmfAgendaSyncService,
  type FmfAgendaSyncResult,
} from '../futebol-agenda/fmf-agenda-sync.service';
import { FmfPageSyncService } from './fmf-page-sync.service';
import { FmfMatchReportService } from './fmf-match-report.service';
import { FmfScraperService, type FmfScraperStore } from './fmf-scraper.service';
import {
  FmfTravelSyncService,
  type FmfTravelSyncResult,
} from './fmf-travel-sync.service';
import {
  FmfVisitingTeamsSyncService,
  type FmfVisitingTeamsSyncResult,
} from './fmf-visiting-teams-sync.service';

export type FmfFullSyncStageStatus<T = unknown> = {
  ok: boolean;
  error?: string;
  result?: T;
};

export type FmfFullSyncMatchReportTenantResult = {
  tenantId: string;
  imported: number;
  failed: number;
  linked: number;
  unresolved: number;
};

export type FmfFullSyncResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  store: FmfScraperStore;
  failedStages: string[];
  stages: {
    discoveryImport: FmfFullSyncStageStatus<FmfScraperStore>;
    visitingTeams?: FmfFullSyncStageStatus<FmfVisitingTeamsSyncResult>;
    travel: FmfFullSyncStageStatus<FmfTravelSyncResult>;
    agenda: FmfFullSyncStageStatus<FmfAgendaSyncResult>;
    pages?: FmfFullSyncStageStatus<Awaited<ReturnType<FmfPageSyncService['syncPages']>>>;
    matchReports?: FmfFullSyncStageStatus<FmfFullSyncMatchReportTenantResult[]>;
  };
};

export class FmfFullSyncError extends Error {
  constructor(
    readonly stage: string,
    message: string,
    readonly partial: FmfFullSyncResult,
  ) {
    super(message);
    this.name = 'FmfFullSyncError';
  }
}

export type FmfFullSyncOptions = {
  tenantId?: string;
  skipVisitingTeams?: boolean;
  skipPages?: boolean;
  skipMatchReports?: boolean;
};

export type FmfFullSyncPublicState = {
  running: boolean;
  ok: boolean | null;
  error: string | null;
  stage: string | null;
  finishedAt: string | null;
};

@Injectable()
export class FmfFullSyncService {
  private readonly log = new Logger(FmfFullSyncService.name);
  private running = false;
  private lastPublic: Omit<FmfFullSyncPublicState, 'running'> = {
    ok: null,
    error: null,
    stage: null,
    finishedAt: null,
  };

  constructor(
    private readonly scraper: FmfScraperService,
    private readonly visitingTeamsSync: FmfVisitingTeamsSyncService,
    private readonly travelSync: FmfTravelSyncService,
    private readonly agendaSync: FmfAgendaSyncService,
    private readonly pageSync: FmfPageSyncService,
    private readonly matchReports: FmfMatchReportService,
  ) {}

  isRunning(): boolean {
    return this.running;
  }

  getPublicState(): FmfFullSyncPublicState {
    return { running: this.running, ...this.lastPublic };
  }

  async runFullSync(options: FmfFullSyncOptions = {}): Promise<FmfFullSyncResult> {
    if (this.running) {
      throw new Error('Sincronização FMF completa já em andamento.');
    }

    this.running = true;
    this.lastPublic = { ok: null, error: null, stage: null, finishedAt: null };
    const startedAt = new Date().toISOString();
    const failedStages: string[] = [];
    const tenantScope = options.tenantId?.trim()
      ? { tenantId: options.tenantId.trim() }
      : {};

    let store!: FmfScraperStore;
    const stages: FmfFullSyncResult['stages'] = {
      discoveryImport: { ok: false },
      travel: { ok: false },
      agenda: { ok: false },
    };

    try {
      store = await this.scraper.runImport({ all: true });
      stages.discoveryImport = { ok: true, result: store };

      if (!options.skipVisitingTeams) {
        try {
          const visiting = await this.visitingTeamsSync.syncFromStore(store);
          stages.visitingTeams = { ok: true, result: visiting };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          stages.visitingTeams = { ok: false, error: msg };
          this.log.warn(`FMF full sync — adversários: ${msg}`);
        }
      }

      try {
        const travel = await this.travelSync.syncAll(tenantScope);
        stages.travel = { ok: true, result: travel };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        stages.travel = { ok: false, error: msg };
        failedStages.push('travel');
        throw new FmfFullSyncError('travel', msg, this.buildResult(startedAt, store, stages, failedStages));
      }

      try {
        const agenda = await this.agendaSync.syncAll(tenantScope);
        stages.agenda = { ok: true, result: agenda };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        stages.agenda = { ok: false, error: msg };
        failedStages.push('agenda');
        throw new FmfFullSyncError('agenda', msg, this.buildResult(startedAt, store, stages, failedStages));
      }

      if (!options.skipPages) {
        try {
          const pages = await this.pageSync.syncPages({ all: true });
          stages.pages = { ok: true, result: pages };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          stages.pages = { ok: false, error: msg };
          this.log.warn(`FMF full sync — páginas: ${msg}`);
        }
      }

      if (!options.skipMatchReports) {
        try {
          const tenants = await this.pageSync.getSyncCandidates();
          const scoped = options.tenantId?.trim()
            ? tenants.filter((t) => t.tenantId === options.tenantId!.trim())
            : tenants;
          const reportResults: FmfFullSyncMatchReportTenantResult[] = [];
          for (const tenant of scoped) {
            try {
              const result = await this.matchReports.importReports({
                tenantId: tenant.tenantId,
                all: true,
              });
              reportResults.push({
                tenantId: tenant.tenantId,
                imported: result.imported,
                failed: result.failed,
                linked: result.linked,
                unresolved: result.unresolved,
              });
            } catch (e) {
              this.log.warn(
                `FMF full sync — súmulas ${tenant.tenantSlug}: ${
                  e instanceof Error ? e.message : String(e)
                }`,
              );
            }
          }
          stages.matchReports = { ok: true, result: reportResults };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          stages.matchReports = { ok: false, error: msg };
          this.log.warn(`FMF full sync — súmulas: ${msg}`);
        }
      }

      const result = this.buildResult(startedAt, store, stages, failedStages);
      this.lastPublic = {
        ok: result.ok,
        error: result.failedStages.length ? result.failedStages.join(', ') : null,
        stage: result.failedStages[0] ?? null,
        finishedAt: result.finishedAt,
      };
      return result;
    } catch (e) {
      if (e instanceof FmfFullSyncError) {
        this.lastPublic = {
          ok: false,
          error: e.message,
          stage: e.stage,
          finishedAt: new Date().toISOString(),
        };
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      stages.discoveryImport = { ok: false, error: msg };
      failedStages.push('discoveryImport');
      const err = new FmfFullSyncError(
        'discoveryImport',
        msg,
        this.buildResult(startedAt, store, stages, failedStages),
      );
      this.lastPublic = {
        ok: false,
        error: err.message,
        stage: err.stage,
        finishedAt: new Date().toISOString(),
      };
      throw err;
    } finally {
      this.running = false;
    }
  }

  private buildResult(
    startedAt: string,
    store: FmfScraperStore | undefined,
    stages: FmfFullSyncResult['stages'],
    failedStages: string[],
  ): FmfFullSyncResult {
    return {
      ok: failedStages.length === 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      store: store ?? stages.discoveryImport.result ?? {
        updatedAt: startedAt,
        lastRunOk: false,
        categories: {},
      },
      failedStages,
      stages,
    };
  }
}
