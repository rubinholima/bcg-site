/**
 * Sincronização FMF canônica completa (import + viagens + agenda + downstream).
 * Uso: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/run-fmf-scraper-import.ts
 */
import { NestFactory } from '@nestjs/core';
import { FmfFullSyncError } from '../src/fmf-scraper/fmf-full-sync.service';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfFullSyncService } from '../src/fmf-scraper/fmf-full-sync.service';

async function main() {
  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const fullSync = app.get(FmfFullSyncService);
    console.log('FMF: sincronização completa canônica...');
    const result = await fullSync.runFullSync();
    console.log(JSON.stringify(result, null, 2));

    if (!result.ok) {
      console.error('FMF sync incompleto:', result.failedStages.join(', '));
      process.exit(1);
    }

    console.log('FMF sync completo.');
  } catch (e) {
    if (e instanceof FmfFullSyncError) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            stage: e.stage,
            error: e.message,
            fullSync: e.partial,
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
    throw e;
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
