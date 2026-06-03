/**
 * Export + import agenda Beatscode (local, credenciais no .env).
 * Uso: pnpm --filter api beatscode:import-agenda
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
    const result = await svc.runImport();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
