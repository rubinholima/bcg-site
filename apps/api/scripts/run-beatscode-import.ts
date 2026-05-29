/**
 * Importa atletas do Beatscode para o banco local.
 * Uso: BEATSCODE_USERNAME=... BEATSCODE_PASSWORD=... pnpm --filter api beatscode:import
 */
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeImportService } from '../src/beatscode-import/beatscode-import.service';

async function main() {
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const svc = app.get(BeatscodeImportService);
    const result = await svc.runImport();
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
