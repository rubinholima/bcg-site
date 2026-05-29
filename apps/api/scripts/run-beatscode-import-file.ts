/**
 * Importa atletas a partir do JSON exportado (produção — sem credenciais Beatscode).
 * Uso: pnpm --filter api beatscode:import:file [caminho/do/arquivo.json] [tenant-slug]
 */
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import {
  BeatscodeImportService,
  DEFAULT_BEATSCODE_EXPORT_PATH,
  DEFAULT_BEATSCODE_TENANT_SLUG,
} from '../src/beatscode-import/beatscode-import.service';

async function main() {
  const filePath = process.argv[2]?.trim() || DEFAULT_BEATSCODE_EXPORT_PATH;
  const tenantSlug = process.argv[3]?.trim() || process.env.BEATSCODE_TENANT_SLUG?.trim() || DEFAULT_BEATSCODE_TENANT_SLUG;

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const svc = app.get(BeatscodeImportService);
    const result = await svc.importFromFilePath(filePath, { tenantSlug });
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
