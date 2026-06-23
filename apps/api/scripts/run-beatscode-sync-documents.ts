/**
 * Baixa PDFs/anexos Beatscode → S3 → documentos do atleta + jurídico (contratos).
 * Uso: pnpm --filter api beatscode:sync-documents
 *
 * Requer no apps/api/.env:
 * - BEATSCODE_USERNAME / BEATSCODE_PASSWORD
 * - AWS/S3 (mesmo da produção)
 * - Opcional: BEATSCODE_BROWSER_PLAYER_LIMIT=5 (teste)
 * - Opcional: BEATSCODE_BROWSER_RETRY_ERRORS=1 (só segunda passagem — prioriza falhas de match)
 * - Opcional: BEATSCODE_BROWSER_SKIP_NOT_FOUND=0 (processa também os 308 já marcados como não encontrados)
 * - Opcional: BEATSCODE_BROWSER_PLAYER_TIMEOUT_MS=180000 (3 min por atleta; reinicia browser se estourar)
 * - Opcional: BEATSCODE_BROWSER_RECYCLE_EVERY=25 (reinicia Playwright a cada N atletas)
 * - Overnight: não usar RETRY_ERRORS; pendentes vêm primeiro e not-found é pulado
 *
 * Sem MySQL Beatscode usa Playwright automaticamente.
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeDocumentsImportService } from '../src/beatscode-import/beatscode-documents-import.service';

async function main() {
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const svc = app.get(BeatscodeDocumentsImportService);
    const result = await svc.syncTenantDocuments();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
