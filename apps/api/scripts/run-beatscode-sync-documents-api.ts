import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeDocumentsImportService } from '../src/beatscode-import/beatscode-documents-import.service';

async function main() {
  process.env.BEATSCODE_USE_BROWSER = '0';
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const svc = app.get(BeatscodeDocumentsImportService);
    const result = await svc.syncTenantDocuments({ useBrowser: false });
    console.log(
      JSON.stringify(
        {
          ok: true,
          filesDownloaded: result.filesDownloaded,
          playersProcessed: result.playersProcessed,
          documentsUpdated: result.documentsUpdated,
          skippedNoPath: result.skippedNoPath,
          errorCount: result.errors.length,
          sampleErrors: result.errors.slice(0, 8),
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
