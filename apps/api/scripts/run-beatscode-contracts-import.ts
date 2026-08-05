/**
 * Export + import contratos Beatscode (local, credenciais no .env).
 * Uso: pnpm --filter api beatscode:import-contracts
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeContractImportService } from '../src/beatscode-import/beatscode-contract-import.service';

async function main() {
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const svc = app.get(BeatscodeContractImportService);
    const result = await svc.importFromApi({
      downloadAttachments:
        process.env.BEATSCODE_DOWNLOAD_CONTRACT_ATTACHMENTS?.trim() !== '0',
    });
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
