import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FmfAgendaSyncService } from '../futebol-agenda/fmf-agenda-sync.service';
import { FmfPageSyncService } from './fmf-page-sync.service';
import { FmfScraperService } from './fmf-scraper.service';
import { FmfTravelSyncService } from './fmf-travel-sync.service';
import { FmfVisitingTeamsSyncService } from './fmf-visiting-teams-sync.service';
import { FmfMatchReportService } from './fmf-match-report.service';

/** Atualiza dados FMF a cada 2 horas. Desative com FMF_SCRAPER_DISABLED=1. */
@Injectable()
export class FmfScraperSchedulerService {
  private readonly log = new Logger(FmfScraperSchedulerService.name);

  constructor(
    private readonly fmfScraper: FmfScraperService,
    private readonly fmfPageSync: FmfPageSyncService,
    private readonly fmfAgendaSync: FmfAgendaSyncService,
    private readonly visitingTeamsSync: FmfVisitingTeamsSyncService,
    private readonly travelSync: FmfTravelSyncService,
    private readonly matchReports: FmfMatchReportService,
  ) {}

  @Cron('0 */2 * * *')
  async syncFmfData(): Promise<void> {
    if (process.env.FMF_SCRAPER_DISABLED?.trim() === '1') return;
    this.log.log('Iniciando sync FMF agendado (2h)...');
    await this.fmfScraper.runAllScheduled();

    try {
      await this.visitingTeamsSync.syncFromStore();
      this.log.log('FMF sync adversários/logos concluído.');
    } catch (e) {
      this.log.warn(
        `FMF sync adversários: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    if (process.env.FMF_SYNC_PAGES_DISABLED?.trim() !== '1') {
      try {
        await this.fmfPageSync.syncPages({ all: true });
        this.log.log('FMF sync páginas concluído.');
      } catch (e) {
        this.log.warn(
          `FMF sync páginas: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (process.env.FMF_SYNC_AGENDA_DISABLED?.trim() !== '1') {
      try {
        await this.fmfAgendaSync.syncAll();
        this.log.log('FMF sync agenda concluído.');
      } catch (e) {
        this.log.warn(
          `FMF sync agenda: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (process.env.FMF_SYNC_TRAVELS_DISABLED?.trim() !== '1') {
      try {
        await this.travelSync.syncAll();
        this.log.log('FMF sync viagens concluído.');
      } catch (e) {
        this.log.warn(
          `FMF sync viagens: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (process.env.FMF_SYNC_MATCH_REPORTS_DISABLED?.trim() !== '1') {
      try {
        const tenants = await this.fmfPageSync.getSyncCandidates();
        for (const tenant of tenants) {
          try {
            await this.matchReports.importReports({
              tenantId: tenant.tenantId,
              all: true,
            });
          } catch {
            /* clube sem súmula publicada */
          }
        }
        this.log.log('FMF sync de súmulas concluído.');
      } catch (e) {
        this.log.warn(
          `FMF sync de súmulas: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
}
