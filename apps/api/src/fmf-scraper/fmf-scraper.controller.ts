import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
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

@Controller('api/fmf-scraper')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('fmf_scraper')
export class FmfScraperController {
  constructor(
    private readonly fmfScraper: FmfScraperService,
    private readonly fmfSync: FmfPageSyncService,
    private readonly fmfAgendaSync: FmfAgendaSyncService,
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
    let agendaSync: FmfAgendaSyncResult | null = null;
    try {
      agendaSync = await this.fmfAgendaSync.syncAll();
    } catch {
      /* agenda sync opcional após import */
    }
    return { ok: true, store, agendaSync };
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
}
