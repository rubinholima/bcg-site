/**
 * Sobe PDFs locais de contratos → S3 e vincula cada atleta (LegalDocument + registrationProfile).
 *
 * Pré-requisito: pnpm beatscode:download-contracts (manifest + files/)
 *
 * Uso:
 *   pnpm --filter api beatscode:upload-contracts
 *   pnpm --filter api beatscode:upload-contracts -- --dry-run
 *   pnpm --filter api beatscode:upload-contracts -- --limit 10
 *   pnpm --filter api beatscode:upload-contracts -- --tenant boston-city-fc-brasil
 *   pnpm --filter api beatscode:upload-contracts -- --s3
 *   pnpm --filter api beatscode:upload-contracts -- --s3 --limit 40 --offset 0
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeContractImportService } from '../src/beatscode-import/beatscode-contract-import.service';
import { resolveBeatscodeTenantSlug } from '../src/beatscode-import/beatscode-import.service';
import { DEFAULT_CONTRACTS_MANIFEST_PATH } from '../src/beatscode-import/beatscode-contract-download.types';

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const limitRaw = readArg('--limit');
  const offsetRaw = readArg('--offset');
  const limit = limitRaw != null ? Number(limitRaw) : undefined;
  const offset = offsetRaw != null ? Number(offsetRaw) : 0;
  const dryRun = hasFlag('--dry-run');
  const fromS3 = hasFlag('--s3');
  const s3StagingPrefix = readArg('--s3-prefix');
  const manifestPath = readArg('--manifest') || DEFAULT_CONTRACTS_MANIFEST_PATH;
  const contractsExportPath = readArg('--contracts-export');
  const tenantSlug =
    readArg('--tenant')?.trim() || resolveBeatscodeTenantSlug();

  if (dryRun) {
    console.log('Modo dry-run — nenhum upload ou gravação no banco.');
  }

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const svc = app.get(BeatscodeContractImportService);
    const result = await svc.importFromDownloadManifest({
      tenantSlug,
      manifestPath: fromS3 ? undefined : manifestPath,
      contractsExportPath,
      filesSource: fromS3 ? 's3' : 'local',
      s3StagingPrefix,
      dryRun,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    console.log(JSON.stringify({ ok: true, dryRun, fromS3, manifestPath: fromS3 ? 's3' : manifestPath, ...result }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
