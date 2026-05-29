/**
 * Remove jogadores importados do Beatscode (externalId beatscode-*) e fotos em media/players_beatscode/.
 * Uso local — NÃO usa migrate reset.
 *
 * pnpm --filter api beatscode:cleanup
 * pnpm --filter api beatscode:cleanup -- --dry-run
 * pnpm --filter api beatscode:cleanup -- --tenant boston-city-fc-brasil
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { BeatscodeImportScriptModule } from '../src/beatscode-import/beatscode-import-script.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { S3Service } from '../src/s3/s3.service';
import { MediaMetaService } from '../src/media/media-meta.service';
import { mediaKeyFromStoredUrl } from '../src/common/media-key.util';

const cwd = process.cwd();
dotenv.config({ path: resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: resolve(cwd, '../../.env') });
}

const MEDIA_PREFIX = 'media/';
const BEATSCODE_PHOTO_PREFIX = `${MEDIA_PREFIX}players_beatscode/`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const tenantArg = process.argv.find((a) => a.startsWith('--tenant='))?.split('=')[1]
    ?? (process.argv.includes('--tenant')
      ? process.argv[process.argv.indexOf('--tenant') + 1]
      : undefined);

  const app = await NestFactory.createApplicationContext(BeatscodeImportScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const s3 = app.get(S3Service);
    const mediaMeta = app.get(MediaMetaService);

    const tenant = tenantArg
      ? await prisma.tenant.findFirst({
          where: { slug: { equals: tenantArg, mode: 'insensitive' } },
          select: { id: true, slug: true, name: true },
        })
      : null;
    if (tenantArg && !tenant) {
      throw new Error(`Tenant não encontrado: ${tenantArg}`);
    }

    const playerWhere = {
      externalId: { startsWith: 'beatscode-' as const },
      ...(tenant ? { tenantId: tenant.id } : {}),
    };

    const players = await prisma.player.findMany({
      where: playerWhere,
      select: {
        id: true,
        name: true,
        externalId: true,
        photoUrl: true,
        tenant: { select: { slug: true, name: true } },
      },
    });

    const photoKeysFromPlayers = new Set<string>();
    for (const p of players) {
      const key = mediaKeyFromStoredUrl(p.photoUrl);
      if (key) photoKeysFromPlayers.add(key);
    }

    const s3BeatscodePhotos = tenant ? [] : await s3.listMedia('players_beatscode');
    const allPhotoKeys = new Set<string>([
      ...photoKeysFromPlayers,
      ...s3BeatscodePhotos.map((x) => x.key),
    ]);

    console.log(
      JSON.stringify(
        {
          dryRun,
          tenant: tenant?.slug ?? 'todos',
          playersToDelete: players.length,
          tenants: [...new Set(players.map((p) => p.tenant.slug))],
          s3PlayersBeatscodeObjects: s3BeatscodePhotos.length,
          mediaMetaKeysToRemove: allPhotoKeys.size,
        },
        null,
        2,
      ),
    );

    if (players.length === 0 && s3BeatscodePhotos.length === 0) {
      console.log('Nada para limpar.');
      return;
    }

    if (dryRun) {
      console.log('Dry-run — nenhuma alteração feita.');
      players.slice(0, 5).forEach((p) =>
        console.log(`  jogador: ${p.externalId} · ${p.name} · ${p.tenant.slug}`),
      );
      return;
    }

    const deletedPlayers = await prisma.player.deleteMany({
      where: playerWhere,
    });

    await prisma.integrationConfig.deleteMany({
      where: { key: 'beatscode_import_last' },
    });

    let s3Deleted = 0;
    let s3Errors = 0;
    for (const key of allPhotoKeys) {
      try {
        await s3.deleteObject(key);
        s3Deleted++;
      } catch (e) {
        s3Errors++;
        console.warn(`S3 falhou ${key}: ${e instanceof Error ? e.message : e}`);
      }
      try {
        await mediaMeta.removeByKey(key);
      } catch {
        /* ignore */
      }
    }

    console.log(
      `Limpeza concluída: ${deletedPlayers.count} jogador(es) removido(s), ${s3Deleted} arquivo(s) S3 apagado(s)` +
        (s3Errors ? `, ${s3Errors} erro(s) S3` : '') +
        '.',
    );
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
