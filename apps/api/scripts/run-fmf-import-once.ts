/**
 * Importação FMF + publicação de páginas (manutenção).
 * Uso: cd apps/api && pnpm exec ts-node --transpile-only -r tsconfig-paths/register scripts/run-fmf-import-once.ts
 */
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfScraperService } from '../src/fmf-scraper/fmf-scraper.service';
import { FmfPageSyncService } from '../src/fmf-scraper/fmf-page-sync.service';
import { FmfAgendaSyncService } from '../src/futebol-agenda/fmf-agenda-sync.service';

async function main() {
  const prisma = new PrismaClient();
  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const scraper = app.get(FmfScraperService);
    const pages = app.get(FmfPageSyncService);
    const agenda = app.get(FmfAgendaSyncService);
    const skipImport = process.argv.includes('--pages-only');
    let store;
    if (skipImport) {
      store = await scraper.getStatus();
    } else {
      console.log('FMF runImport all=true...');
      store = await scraper.runImport({ all: true });
    }
    const sub15 = store.categories?.sub15_inconfidencia;
    const semi =
      sub15?.matches?.filter((m) =>
        /america|boston/i.test(`${m.homeName} ${m.awayName}`),
      ) ?? [];
    console.log(
      JSON.stringify({
        ok: store.lastRunOk,
        sub15_inconfidencia: sub15
          ? { fmfD: sub15.fmfD, parsed: sub15.parsed, scheduled: sub15.scheduled }
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
    await pages.syncPages({ all: true });
    const boston = await prisma.tenant.findUnique({
      where: { slug: 'boston-city-fc-brasil' },
      select: { id: true },
    });
    if (boston?.id) {
      console.log('FMF agenda Boston...');
      await agenda.syncAll({ tenantId: boston.id });
    }
    console.log('Concluído.');
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
