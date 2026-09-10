/**
 * Importa conteúdo oficial CUP360 (manifest versionado) para Desenvolvimento V1.
 * Idempotente — pode ser reexecutado sem duplicar curso/módulos/lições/quiz.
 *
 * Uso:
 *   cd apps/api
 *   pnpm import:learning-content
 *   pnpm import:learning-content -- --manifest=cup360-english-start-v1
 *   pnpm import:learning-content -- --dry-run
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

const DRY_RUN = process.argv.includes('--dry-run');
const manifestArg = process.argv.find((a) => a.startsWith('--manifest='));
const MANIFEST_ID = manifestArg?.split('=')[1] ?? 'cup360-english-start-v1';

async function main() {
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  const { loadLearningContentManifest } = require('../src/desenvolvimento/content/learning-content.registry') as typeof import('../src/desenvolvimento/content/learning-content.registry');
  const { validateLearningContentManifest } = require('../src/desenvolvimento/content/learning-content.validate') as typeof import('../src/desenvolvimento/content/learning-content.validate');
  const { importLearningContentManifest } = require('../src/desenvolvimento/content/learning-content.importer') as typeof import('../src/desenvolvimento/content/learning-content.importer');

  const manifest = validateLearningContentManifest(loadLearningContentManifest(MANIFEST_ID));

  console.log(`Manifest: ${manifest.manifestId} v${manifest.manifestVersion}`);
  console.log(`Curso: ${manifest.course.title} (${manifest.course.status ?? 'draft'})`);
  console.log(`Módulos: ${manifest.modules.length}`);

  if (DRY_RUN) {
    console.log('Dry-run — nenhuma alteração no banco.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    const result = await importLearningContentManifest(prisma, manifest);
    console.log('Importação concluída:', JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
