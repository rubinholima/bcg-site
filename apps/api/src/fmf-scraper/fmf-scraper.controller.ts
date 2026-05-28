import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
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
}
