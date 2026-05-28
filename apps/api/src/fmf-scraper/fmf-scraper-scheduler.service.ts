import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FmfPageSyncService } from './fmf-page-sync.service';
import { FmfScraperService } from './fmf-scraper.service';

/** Atualiza dados FMF a cada 2 horas. Desative com FMF_SCRAPER_DISABLED=1. */
@Injectable()
export class FmfScraperSchedulerService {
  private readonly log = new Logger(FmfScraperSchedulerService.name);

  constructor(
    private readonly fmfScraper: FmfScraperService,
    private readonly fmfPageSync: FmfPageSyncService,
  ) {}

  @Cron('0 */2 * * *')
  async syncFmfData(): Promise<void> {
    if (process.env.FMF_SCRAPER_DISABLED?.trim() === '1') return;
    this.log.log('Iniciando sync FMF agendado (2h)...');
    await this.fmfScraper.runAllScheduled();
    if (process.env.FMF_SYNC_PAGES_DISABLED?.trim() === '1') return;
    try {
      await this.fmfPageSync.syncPages({ all: true });
      this.log.log('FMF sync páginas concluído.');
    } catch (e) {
      this.log.warn(
        `FMF sync páginas: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
