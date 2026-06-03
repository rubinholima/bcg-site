/**
 * Import agenda Beatscode a partir de JSON.
 * Uso: pnpm --filter api beatscode:import-agenda:file [caminho] [tenantSlug]
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import {
  BeatscodeAgendaImportService,
  DEFAULT_BEATSCODE_AGENDA_EXPORT_PATH,
} from '../src/beatscode-import/beatscode-agenda-import.service';
import { resolveBeatscodeTenantSlug } from '../src/beatscode-import/beatscode-import.service';

async function main() {
  const filePath = process.argv[2]?.trim() || DEFAULT_BEATSCODE_AGENDA_EXPORT_PATH;
  const tenantSlug = process.argv[3]?.trim() || resolveBeatscodeTenantSlug();

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const svc = app.get(BeatscodeAgendaImportService);
    const exportFile = await svc.readExportFile(filePath);
    const result = await svc.importFromExport(exportFile, { tenantSlug });
    console.log(JSON.stringify({ ok: true, filePath, ...result }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
