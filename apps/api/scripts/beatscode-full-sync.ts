/**
 * Sincronização completa Beatscode → banco local (limpa, exporta tudo, importa).
 *
 * pnpm --filter api beatscode:full-sync
 * pnpm --filter api beatscode:full-sync -- --skip-clean
 * pnpm --filter api beatscode:full-sync -- --skip-photos
 * pnpm --filter api beatscode:full-sync -- --tenant boston-city-fc-brasil
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { BeatscodeImportService } from '../src/beatscode-import/beatscode-import.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { S3Service } from '../src/s3/s3.service';
import { MediaMetaService } from '../src/media/media-meta.service';
import { mediaKeyFromStoredUrl } from '../src/common/media-key.util';

const cwd = process.cwd();
dotenv.config({ path: resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) dotenv.config({ path: resolve(cwd, '../../.env') });

async function runCleanup(
  app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>,
  tenantSlug?: string,
) {
  const prisma = app.get(PrismaService);
  const s3 = app.get(S3Service);
  const mediaMeta = app.get(MediaMetaService);

  const tenant = tenantSlug
    ? await prisma.tenant.findFirst({
        where: { slug: { equals: tenantSlug, mode: 'insensitive' } },
        select: { id: true, slug: true },
      })
    : null;
  if (tenantSlug && !tenant) {
    throw new Error(`Tenant não encontrado: ${tenantSlug}`);
  }

  const playerWhere = {
    externalId: { startsWith: 'beatscode-' as const },
    ...(tenant ? { tenantId: tenant.id } : {}),
  };

  const players = await prisma.player.findMany({
    where: playerWhere,
    select: { photoUrl: true },
  });

  const photoKeys = new Set<string>();
  for (const p of players) {
    const key = mediaKeyFromStoredUrl(p.photoUrl);
    if (key) photoKeys.add(key);
  }
  const s3BeatscodePhotos = tenant ? [] : await s3.listMedia('players_beatscode');
  for (const x of s3BeatscodePhotos) photoKeys.add(x.key);

  const deleted = await prisma.player.deleteMany({
    where: playerWhere,
  });
  await prisma.integrationConfig.deleteMany({ where: { key: 'beatscode_import_last' } });

  let s3Deleted = 0;
  for (const key of photoKeys) {
    try {
      await s3.deleteObject(key);
      s3Deleted++;
    } catch {
      /* ignore */
    }
    try {
      await mediaMeta.removeByKey(key);
    } catch {
      /* ignore */
    }
  }

  console.log(`Limpeza${tenant ? ` (${tenant.slug})` : ''}: ${deleted.count} jogador(es), ${s3Deleted} foto(s) S3`);
}

async function main() {
  const skipClean = process.argv.includes('--skip-clean');
  const skipPhotos = process.argv.includes('--skip-photos');
  const tenantIdx = process.argv.indexOf('--tenant');
  const tenantSlug = tenantIdx >= 0 ? process.argv[tenantIdx + 1] : undefined;

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const svc = app.get(BeatscodeImportService);

    if (!skipClean) {
      console.log('=== 1/3 Limpeza importação Beatscode anterior ===');
      await runCleanup(app, tenantSlug ?? 'boston-city-fc-brasil');
    } else {
      console.log('=== Limpeza ignorada (--skip-clean) ===');
    }

    console.log('=== 2/3 Export completo da API Beatscode (pode demorar vários minutos) ===');
    const { filePath, export: data } = await svc.exportToFile({
      tenantSlug,
      categoryKeys: 'all',
      downloadPhotos: !skipPhotos,
    });
    console.log(`Export: ${data.athletes.length} atleta(s) → ${filePath}`);
    if (data.errors.length) {
      console.warn(`${data.errors.length} aviso(s) no export (primeiros 5):`);
      data.errors.slice(0, 5).forEach((e) => console.warn(`  - ${e}`));
    }

    console.log('=== 3/3 Importação no banco ===');
    const result = await svc.importFromExport(data, { tenantSlug });
    console.log(
      JSON.stringify(
        {
          tenant: result.tenantSlug,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors.slice(0, 10),
        },
        null,
        2,
      ),
    );
    console.log('Full-sync concluído.');
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
