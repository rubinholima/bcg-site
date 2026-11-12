/**
 * Importação FMF única (produção/manutenção) — sem subir API HTTP.
 * Uso no servidor: cd apps/api && pnpm exec ts-node --transpile-only -r tsconfig-paths/register scripts/run-fmf-import-once.mts
 */
import { NestFactory } from '@nestjs/core';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfScraperService } from '../src/fmf-scraper/fmf-scraper.service';
import { FmfPageSyncService } from '../src/fmf-scraper/fmf-page-sync.service';

async function main() {
  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const scraper = app.get(FmfScraperService);
    const pages = app.get(FmfPageSyncService);
    console.log('FMF runImport all=true...');
    const store = await scraper.runImport({ all: true });
    const keys = Object.keys(store.categories ?? {}).filter((k) =>
      k.includes('inconfidencia'),
    );
    const sub15 = store.categories?.sub15_inconfidencia;
    const semi =
      sub15?.matches?.filter((m) =>
        /america|boston/i.test(`${m.homeName} ${m.awayName}`),
      ) ?? [];
    console.log(
      JSON.stringify({
        ok: store.lastRunOk,
        inconfidenciaPresets: keys,
        sub15_inconfidencia: sub15
          ? { parsed: sub15.parsed, scheduled: sub15.scheduled, fmfD: sub15.fmfD }
          : null,
        bostonAmericaMatches: semi.map((m) => ({
          date: m.matchDate,
          home: m.homeName,
          away: m.awayName,
          phase: m.phaseLabel,
        })),
      }),
    );
    console.log('FMF syncPages...');
    await pages.syncPages({});
    console.log('FMF page sync concluído.');
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
