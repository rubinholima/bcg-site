/**
 * Import contratos Beatscode a partir de JSON.
 * Uso: pnpm --filter api beatscode:import-contracts:file [caminho] [tenantSlug]
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeContractImportService } from '../src/beatscode-import/beatscode-contract-import.service';
import { DEFAULT_BEATSCODE_CONTRACTS_EXPORT_PATH } from '../src/beatscode-import/beatscode-contract-export.types';
import { resolveBeatscodeTenantSlug } from '../src/beatscode-import/beatscode-import.service';

async function main() {
  const filePath = process.argv[2]?.trim() || DEFAULT_BEATSCODE_CONTRACTS_EXPORT_PATH;
  const tenantSlug = process.argv[3]?.trim() || resolveBeatscodeTenantSlug();

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const svc = app.get(BeatscodeContractImportService);
    const exportFile = await svc.readExportFile(filePath);
    // Baixar/indexar anexos percorre milhares de anexos (1 login cada) e trava.
    // Por padrão importa só os dados dos contratos; use BEATSCODE_DOWNLOAD_CONTRACT_ATTACHMENTS=1 para baixar.
    const downloadAttachments =
      process.env.BEATSCODE_DOWNLOAD_CONTRACT_ATTACHMENTS?.trim() === '1';
    const result = await svc.importFromExport(exportFile, {
      tenantSlug,
      downloadAttachments,
    });
    console.log(JSON.stringify({ ok: true, filePath, ...result }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
