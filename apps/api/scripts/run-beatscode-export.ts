/**
 * Exporta atletas Beatscode para JSON (uso local — credenciais no .env).
 *
 * Uso:
 *   pnpm --filter api beatscode:export
 *   pnpm --filter api beatscode:export -- --categories=sub13 --merge
 *   pnpm --filter api beatscode:export -- --categories=sub20,sub17,sub15,sub14,sub13
 *
 * Saída: apps/api/data/beatscode-athletes-export.json
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import {
  BeatscodeImportService,
  DEFAULT_BEATSCODE_EXPORT_PATH,
} from '../src/beatscode-import/beatscode-import.service';
import {
  mergeBeatscodeExportFiles,
  type BeatscodeExportFile,
} from '../src/beatscode-import/beatscode-export.types';

function parseArgs() {
  const args = process.argv.slice(2);
  let categories: string[] | undefined;
  let merge = false;
  let outputPath = DEFAULT_BEATSCODE_EXPORT_PATH;

  for (const arg of args) {
    if (arg === '--merge') merge = true;
    else if (arg.startsWith('--categories=')) {
      const raw = arg.slice('--categories='.length).trim();
      categories = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.slice('--output='.length).trim() || outputPath;
    }
  }

  return { categories, merge, outputPath };
}

async function main() {
  const { categories, merge, outputPath } = parseArgs();
  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const svc = app.get(BeatscodeImportService);
    let base: BeatscodeExportFile | null = null;

    if (merge) {
      try {
        base = await svc.readExportFile(outputPath);
      } catch {
        console.warn(`Merge: arquivo base não encontrado (${outputPath}) — criando novo.`);
      }
    }

    const patchPath = merge ? `${outputPath}.patch.tmp.json` : outputPath;
    const { export: patch } = await svc.exportToFile({
      categoryKeys: categories?.length ? categories : 'all',
      outputPath: patchPath,
    });

    let finalExport = patch;
    if (base) {
      finalExport = mergeBeatscodeExportFiles(base, patch);
      const { writeFile, mkdir, unlink } = await import('fs/promises');
      const { dirname, resolve } = await import('path');
      const abs = resolve(process.cwd(), outputPath);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, JSON.stringify(finalExport, null, 2), 'utf8');
      await unlink(resolve(process.cwd(), patchPath)).catch(() => undefined);
    }

    const sub13 = finalExport.athletes.filter((a) => a.category === 'sub13').length;
    console.log(
      `Export concluído: ${finalExport.athletes.length} atleta(s) (${sub13} sub13) → ${outputPath}`,
    );
    console.log(`Categorias: ${finalExport.categoriesProcessed.join(' | ')}`);
    if (finalExport.errors.length) {
      console.warn(`${finalExport.errors.length} aviso(s) durante o export:`);
      finalExport.errors.slice(0, 20).forEach((e) => console.warn(`  - ${e}`));
      if (finalExport.errors.length > 20) console.warn(`  ... +${finalExport.errors.length - 20} mais`);
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
