import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { FmfAgendaSyncService, type FmfAgendaSyncResult } from '../futebol-agenda/fmf-agenda-sync.service';
import {
  FmfPageSyncService,
  type FmfScraperSyncConfig,
} from './fmf-page-sync.service';
import { FmfScraperService } from './fmf-scraper.service';
import { FmfMatchReportService } from './fmf-match-report.service';
import {
  FmfTravelSyncService,
  type FmfTravelSyncResult,
} from './fmf-travel-sync.service';
import {
  FmfVisitingTeamsSyncService,
  type FmfVisitingTeamsSyncResult,
} from './fmf-visiting-teams-sync.service';

@Controller('api/fmf-scraper')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('fmf_scraper')
export class FmfScraperController {
  constructor(
    private readonly fmfScraper: FmfScraperService,
    private readonly fmfSync: FmfPageSyncService,
    private readonly fmfAgendaSync: FmfAgendaSyncService,
    private readonly visitingTeamsSync: FmfVisitingTeamsSyncService,
    private readonly travelSync: FmfTravelSyncService,
    private readonly matchReports: FmfMatchReportService,
  ) {}

  @Get('presets')
  getPresets() {
    return this.fmfScraper.getPresets();
  }

  @Get('status')
  getStatus() {
    return this.fmfScraper.getStatus();
  }

  @Post('run')
  async run(@Body() body: { preset?: string; all?: boolean }) {
    const store = await this.fmfScraper.runImport({
      preset: body?.preset,
      all: body?.all === true,
    });

    let visitingTeams: FmfVisitingTeamsSyncResult | null = null;
    try {
      visitingTeams = await this.visitingTeamsSync.syncFromStore(store);
    } catch {
      /* opcional */
    }

    let agendaSync: FmfAgendaSyncResult | null = null;
    try {
      agendaSync = await this.fmfAgendaSync.syncAll();
    } catch {
      /* agenda sync opcional após import */
    }

    let travelSync: FmfTravelSyncResult | null = null;
    try {
      travelSync = await this.travelSync.syncAll();
    } catch {
      /* viagens sync opcional após import */
    }

    const matchReportSync: Array<{
      tenantId: string;
      imported: number;
      failed: number;
      linked: number;
      unresolved: number;
    }> = [];
    try {
      const tenants = await this.fmfSync.getSyncCandidates();
      for (const tenant of tenants) {
        try {
          const result = await this.matchReports.importReports({
            tenantId: tenant.tenantId,
            all: true,
          });
          matchReportSync.push({
            tenantId: tenant.tenantId,
            imported: result.imported,
            failed: result.failed,
            linked: result.linked,
            unresolved: result.unresolved,
          });
        } catch {
          /* clube sem súmula publicada */
        }
      }
    } catch {
      /* súmulas opcionais após import */
    }

    return {
      ok: true,
      store,
      visitingTeams,
      agendaSync,
      travelSync,
      matchReportSync,
    };
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
}
