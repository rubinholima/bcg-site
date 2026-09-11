import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FmfFullSyncError, FmfFullSyncService } from './fmf-full-sync.service';

/** Atualiza dados FMF a cada 2 horas. Desative com FMF_SCRAPER_DISABLED=1. */
@Injectable()
export class FmfScraperSchedulerService {
  private readonly log = new Logger(FmfScraperSchedulerService.name);

  constructor(private readonly fullSync: FmfFullSyncService) {}

  @Cron('0 */2 * * *')
  async syncFmfData(): Promise<void> {
    if (process.env.FMF_SCRAPER_DISABLED?.trim() === '1') return;
    this.log.log('Iniciando sync FMF agendado (2h)...');

    try {
      const result = await this.fullSync.runFullSync({
        skipPages: process.env.FMF_SYNC_PAGES_DISABLED?.trim() === '1',
        skipMatchReports: process.env.FMF_SYNC_MATCH_REPORTS_DISABLED?.trim() === '1',
        skipVisitingTeams: false,
      });

      if (!result.ok) {
        this.log.error(
          `FMF sync agendado incompleto: ${result.failedStages.join(', ') || 'etapas obrigatórias'}`,
        );
        return;
      }

      this.log.log('FMF sync agendado concluído.');
    } catch (e) {
      if (e instanceof FmfFullSyncError) {
        this.log.error(`FMF sync agendado falhou em ${e.stage}: ${e.message}`);
        return;
      }
      this.log.warn(`FMF sync agendado: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
