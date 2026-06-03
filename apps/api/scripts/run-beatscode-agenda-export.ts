/**
 * Export Beatscode → JSON (agenda + competições).
 * Uso: pnpm --filter api beatscode:export-agenda
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeAgendaImportService } from '../src/beatscode-import/beatscode-agenda-import.service';

async function main() {
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const svc = app.get(BeatscodeAgendaImportService);
    const { filePath, export: data } = await svc.exportToFile();
    console.log(
      JSON.stringify(
        {
          ok: true,
          filePath,
          scheduleItems: data.scheduleItems.length,
          competitions: data.competitions.length,
          categories: data.categoriesProcessed,
          errors: data.errors,
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
  console.error(e);
  process.exit(1);
});
