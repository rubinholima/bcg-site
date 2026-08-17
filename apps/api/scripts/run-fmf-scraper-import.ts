/**
 * Importa dados FMF (ProxJogos + classificação) e sincroniza agenda/páginas/viagens.
 * Uso: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/run-fmf-scraper-import.ts
 */
import { NestFactory } from '@nestjs/core';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfAgendaSyncService } from '../src/futebol-agenda/fmf-agenda-sync.service';
import { FmfMatchReportService } from '../src/fmf-scraper/fmf-match-report.service';
import { FmfPageSyncService } from '../src/fmf-scraper/fmf-page-sync.service';
import { FmfScraperService } from '../src/fmf-scraper/fmf-scraper.service';
import { FmfTravelSyncService } from '../src/fmf-scraper/fmf-travel-sync.service';
import { FmfVisitingTeamsSyncService } from '../src/fmf-scraper/fmf-visiting-teams-sync.service';

async function main() {
  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const fmfScraper = app.get(FmfScraperService);
    const fmfPageSync = app.get(FmfPageSyncService);
    const visitingTeamsSync = app.get(FmfVisitingTeamsSyncService);
    const fmfAgendaSync = app.get(FmfAgendaSyncService);
    const travelSync = app.get(FmfTravelSyncService);
    const matchReports = app.get(FmfMatchReportService);

    console.log('FMF: importando todas as categorias...');
    const store = await fmfScraper.runImport({ all: true });
    console.log('FMF import ok:', store.updatedAt, Object.keys(store.categories));

    console.log('FMF: sync adversários...');
    const visitingTeams = await visitingTeamsSync.syncFromStore(store);
    console.log(JSON.stringify(visitingTeams, null, 2));

    console.log('FMF: sync agenda...');
    let agendaSync: unknown = null;
    try {
      agendaSync = await fmfAgendaSync.syncAll();
      console.log(JSON.stringify(agendaSync, null, 2));
    } catch (e) {
      console.warn('FMF sync agenda (continuando):', e instanceof Error ? e.message : String(e));
    }

    console.log('FMF: sync viagens...');
    let travelSyncResult: unknown = null;
    try {
      travelSyncResult = await travelSync.syncAll();
      console.log(JSON.stringify(travelSyncResult, null, 2));
    } catch (e) {
      console.warn('FMF sync viagens (continuando):', e instanceof Error ? e.message : String(e));
    }

    console.log('FMF: aplicar no site (páginas)...');
    const pagesSync = await fmfPageSync.syncPages({ all: true });
    console.log(JSON.stringify(pagesSync, null, 2));

    console.log('FMF: import súmulas...');
    const tenants = await fmfPageSync.getSyncCandidates();
    for (const tenant of tenants) {
      try {
        const result = await matchReports.importReports({
          tenantId: tenant.tenantId,
          all: true,
        });
        console.log(`Súmulas ${tenant.tenantSlug}:`, result);
      } catch (e) {
        console.warn(
          `Súmulas ${tenant.tenantSlug}:`,
          e instanceof Error ? e.message : String(e),
        );
      }
    }

    console.log('FMF sync completo.');
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
