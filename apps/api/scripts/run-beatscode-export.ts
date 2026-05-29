/**
 * Exporta atletas Beatscode para JSON (uso local — credenciais no .env).
 * Uso: pnpm --filter api beatscode:export
 * Saída: apps/api/data/beatscode-athletes-export.json
 */
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeImportService } from '../src/beatscode-import/beatscode-import.service';

async function main() {
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const svc = app.get(BeatscodeImportService);
    const { filePath, export: data } = await svc.exportToFile();
    console.log(`Export concluído: ${data.athletes.length} atleta(s) → ${filePath}`);
    if (data.errors.length) {
      console.warn(`${data.errors.length} aviso(s) durante o export:`);
      data.errors.slice(0, 20).forEach((e) => console.warn(`  - ${e}`));
      if (data.errors.length > 20) console.warn(`  ... +${data.errors.length - 20} mais`);
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
