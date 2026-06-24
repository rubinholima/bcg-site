/**
 * Baixa PDFs de contratos Beatscode a partir dos links no export de atletas (sem MySQL).
 * Gera manifest.json com IDs, nomes, tipos e caminhos locais para vincular aos atletas depois.
 *
 * Uso:
 *   pnpm --filter api beatscode:download-contracts
 *   pnpm --filter api beatscode:download-contracts -- --limit 10
 *   pnpm --filter api beatscode:download-contracts -- --offset 100 --limit 50
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeContractDownloadService } from '../src/beatscode-import/beatscode-contract-download.service';

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const limitRaw = readArg('--limit');
  const offsetRaw = readArg('--offset');
  const employeeLimit = limitRaw != null ? Number(limitRaw) : undefined;
  const employeeOffset = offsetRaw != null ? Number(offsetRaw) : 0;

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const svc = app.get(BeatscodeContractDownloadService);
    const result = await svc.downloadAll({
      limit: Number.isFinite(employeeLimit) ? employeeLimit : undefined,
      offset: Number.isFinite(employeeOffset) ? employeeOffset : 0,
    });
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
