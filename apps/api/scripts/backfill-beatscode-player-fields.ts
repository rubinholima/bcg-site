/**
 * Preenche posição, pé dominante e limpa camisa 0 a partir do snapshot Beatscode no JSON do jogador.
 *
 * pnpm --filter api beatscode:backfill-fields
 * pnpm --filter api beatscode:backfill-fields -- --dry-run
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeImportService } from '../src/beatscode-import/beatscode-import.service';

const cwd = process.cwd();
dotenv.config({ path: resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) dotenv.config({ path: resolve(cwd, '../../.env') });

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const svc = app.get(BeatscodeImportService);
    const exportFile = await svc.readExportFile('data/beatscode-athletes-export.json');
    const result = await svc.importFromExport(exportFile, {
      tenantSlug: process.argv.includes('--tenant')
        ? process.argv[process.argv.indexOf('--tenant') + 1]
        : undefined,
    });

    if (dryRun) {
      console.log('Dry-run não suportado neste script — use import normal (upsert idempotente).');
      return;
    }

    console.log(
      JSON.stringify(
        {
          updated: result.updated,
          created: result.created,
          skipped: result.skipped,
          errors: result.errors.slice(0, 10),
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
