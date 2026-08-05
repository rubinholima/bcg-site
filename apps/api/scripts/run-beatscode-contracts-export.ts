/**
 * Export Beatscode → JSON (contratos).
 * Uso: pnpm --filter api beatscode:export-contracts
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
    // O índice de anexos percorre TODOS os anexos (1000+ contratos), 1 login por anexo — muito lento.
    // Só monta quando BEATSCODE_CONTRACT_ATTACHMENT_INDEX=1; por padrão exporta só os dados dos contratos.
    const includeAttachmentIndex =
      process.env.BEATSCODE_CONTRACT_ATTACHMENT_INDEX?.trim() === '1';
    const { filePath, export: data } = await svc.exportToFile({
      includeAttachmentIndex,
    });
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const c of data.contracts) {
      byCategory[c.menuCategory] = (byCategory[c.menuCategory] ?? 0) + 1;
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          filePath,
          contracts: data.contracts.length,
          contractTypes: data.contractTypes.length,
          byCategory,
          byStatus,
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
