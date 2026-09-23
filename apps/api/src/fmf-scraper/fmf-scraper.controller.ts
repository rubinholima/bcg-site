import {
  Body,
  Controller,
  Get,
  Logger,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { FmfAgendaSyncService } from '../futebol-agenda/fmf-agenda-sync.service';
import {
  FmfPageSyncService,
  type FmfScraperSyncConfig,
} from './fmf-page-sync.service';
import { FmfScraperService } from './fmf-scraper.service';
import { FmfFullSyncService } from './fmf-full-sync.service';
import { FmfMatchReportService } from './fmf-match-report.service';
import { FmfTravelSyncService } from './fmf-travel-sync.service';
import { FmfVisitingTeamsSyncService } from './fmf-visiting-teams-sync.service';

@Controller('api/fmf-scraper')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('fmf_scraper')
export class FmfScraperController {
  private readonly log = new Logger(FmfScraperController.name);

  constructor(
    private readonly fmfScraper: FmfScraperService,
    private readonly fullSync: FmfFullSyncService,
    private readonly fmfSync: FmfPageSyncService,
    private readonly fmfAgendaSync: FmfAgendaSyncService,
    private readonly visitingTeamsSync: FmfVisitingTeamsSyncService,
    private readonly travelSync: FmfTravelSyncService,
    private readonly matchReports: FmfMatchReportService,
  ) {}

  @Get('presets')
  async getPresets() {
    return this.fmfScraper.getPresets();
  }

  @Get('status')
  async getStatus() {
    const store = await this.fmfScraper.getStatus();
    const fullSync = this.fullSync.getPublicState();
    return {
      ...store,
      fullSyncRunning: fullSync.running,
      fullSyncOk: fullSync.ok,
      fullSyncError: fullSync.error,
      fullSyncStage: fullSync.stage,
      fullSyncFinishedAt: fullSync.finishedAt,
    };
  }

  @Post('run')
  async run(@Body() body: { preset?: string; all?: boolean }) {
    if (body?.all === true) {
      if (this.fullSync.isRunning()) {
        return { ok: false, error: 'Sincronização FMF completa já em andamento.' };
      }
      const live = await this.fmfScraper.getStatus();
      if (live.busy) {
        return {
          ok: false,
          error: 'Importação FMF já em andamento. Aguarde a conclusão.',
        };
      }

      void this.fullSync.runFullSync().catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(`FMF full sync (background): ${msg}`);
      });

      return {
        ok: true,
        async: true,
        message:
          'Sincronização completa iniciada em segundo plano. O status atualiza automaticamente.',
      };
    }

    const store = await this.fmfScraper.runImport({
      preset: body?.preset,
      all: false,
    });

    return { ok: true, store };
  }

  @Get('sync/candidates')
  getSyncCandidates() {
    return this.fmfSync.getSyncCandidates();
  }

  @Get('sync/config')
  getSyncConfig() {
    return this.fmfSync.getSyncConfig();
  }

  @Patch('sync/config')
  updateSyncConfig(@Body() body: FmfScraperSyncConfig) {
    return this.fmfSync.updateSyncConfig(body);
  }

  @Post('sync/pages')
  async syncPages(
    @Body()
    body: {
      tenantId?: string;
      all?: boolean;
      fmfTeamNames?: string[];
    },
  ) {
    const result = await this.fmfSync.syncPages({
      tenantId: body?.tenantId,
      all: body?.all === true,
      fmfTeamNames: body?.fmfTeamNames,
    });
    return { ok: true, ...result };
  }

  @Post('sync/agenda')
  async syncAgenda(@Body() body: { tenantId?: string; all?: boolean }) {
    const result = await this.fmfAgendaSync.syncAll(
      body?.tenantId ? { tenantId: body.tenantId } : body?.all ? {} : {},
    );
    return { ok: true, ...result };
  }

  @Post('sync/visiting-teams')
  async syncVisitingTeams() {
    const result = await this.visitingTeamsSync.syncFromStore();
    return { ok: true, ...result };
  }

  @Post('sync/travels')
  async syncTravels(@Body() body: { tenantId?: string; all?: boolean }) {
    const result = await this.travelSync.syncAll(
      body?.tenantId ? { tenantId: body.tenantId } : {},
    );
    return { ok: true, ...result };
  }

  @Get('match-reports/candidates')
  listMatchReportCandidates(
    @Query('tenantId') tenantId: string,
    @Query('refresh') refresh?: string,
  ) {
    const allowRefresh = refresh === '1' || refresh === 'true';
    return this.matchReports.listCandidates(tenantId, { allowRefresh });
  }

  @Post('match-reports/import')
  importMatchReports(
    @Body()
    body: {
      tenantId: string;
      externalMatchId?: string;
      preset?: string;
      all?: boolean;
    },
  ) {
    return this.matchReports.importReports(body);
  }

  @Post('match-reports/reconcile')
  reconcileMatchReports(@Body() body: { tenantId: string }) {
    return this.matchReports.reconcile(body.tenantId);
  }

  @Get('match-reports/reconciliation')
  getMatchReconciliation(
    @Query('tenantId') tenantId: string,
    @Query('matchId') matchId: string,
  ) {
    return this.matchReports.getMatchReconciliation(tenantId, matchId);
  }
}
