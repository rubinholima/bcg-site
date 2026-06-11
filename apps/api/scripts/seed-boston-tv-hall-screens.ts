/**
 * Seed: 20 Smart TVs + telão — tenant Boston City FC Brasil (espaço multiuso / Hall).
 * Nomes no formato da planilha: "1 - USA", "2 - Colômbia", … "21 - Telão Brasil".
 * Idempotente: renomeia telas antigas (sem número) e não duplica.
 *
 * Rodar (monorepo):
 *   pnpm --filter api run seed:boston-tv-hall-screens
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { randomBytes } from 'crypto';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const { resolvePublicMediaUrl } = require('../src/common/public-media-url.util') as typeof import('../src/common/public-media-url.util');
const prisma = new PrismaClient();

const TENANT_SLUG = 'boston-city-fc-brasil';
const HALL_PLAYLIST_NAME = 'Hall — loop geral';

function newPlayerToken(): string {
  return randomBytes(24).toString('hex');
}

function screenDisplayName(num: number, label: string): string {
  return `${num} - ${label}`;
}

/** Planilha TVs — espaço multiuso (Boston City FC Brasil) */
const HALL_SCREENS: Array<{ num: number; label: string; legacyNames: string[]; locationHint: string }> = [
  { num: 1, label: 'USA', legacyNames: ['USA'], locationHint: 'Canto bar direita · Samsung 65S62' },
  { num: 2, label: 'Colômbia', legacyNames: ['Colômbia'], locationHint: 'Diagonal bar direita · Samsung 55S62' },
  { num: 3, label: 'Paraguai', legacyNames: ['Paraguai'], locationHint: 'Direita palco · Samsung 65S62' },
  { num: 4, label: 'Uruguai', legacyNames: ['Uruguai'], locationHint: 'Direita tela palco · Samsung 65S62' },
  { num: 5, label: 'Equador', legacyNames: ['Equador'], locationHint: 'Esquerda tela palco · Samsung 65S62' },
  { num: 6, label: 'Canadá', legacyNames: ['Canadá'], locationHint: 'Esquerda palco · Samsung 55S62' },
  { num: 7, label: 'Alemanha', legacyNames: ['Alemanha'], locationHint: 'Diagonal bar esquerda · Samsung 65S62' },
  { num: 8, label: 'Áustria', legacyNames: ['Áustria'], locationHint: 'Canto bar esquerda · Samsung 55S62' },
  { num: 9, label: 'Bélgica', legacyNames: ['Bélgica'], locationHint: 'Meio bar esquerda · Samsung 65S62' },
  { num: 10, label: 'Inglaterra', legacyNames: ['Inglaterra'], locationHint: 'Canto upper deck bar esquerda · Samsung UN65DU7700' },
  { num: 11, label: 'Noruega', legacyNames: ['Noruega'], locationHint: 'Meio upper deck bar esquerda · Samsung 55S62' },
  { num: 12, label: 'Portugal', legacyNames: ['Portugal'], locationHint: 'Banheiro upper deck bar esquerda · Samsung 55S62' },
  { num: 13, label: 'Croácia', legacyNames: ['Croácia'], locationHint: 'Upper deck centro TV1 · Philips 7300' },
  { num: 14, label: 'Escócia', legacyNames: ['Escócia'], locationHint: 'Upper deck centro TV2 · Philips 7300' },
  { num: 15, label: 'Espanha', legacyNames: ['Espanha'], locationHint: 'Upper deck centro TV3 · Philips 7300' },
  { num: 16, label: 'França', legacyNames: ['França'], locationHint: 'Upper deck centro TV4 · Philips 7300' },
  { num: 17, label: 'Holanda', legacyNames: ['Holanda'], locationHint: 'Centro upper deck · Samsung 55S62' },
  { num: 18, label: 'Argentina', legacyNames: ['Argentina'], locationHint: 'Banheiro upper deck bar direita · Samsung 55S62' },
  { num: 19, label: 'Suécia', legacyNames: ['Suécia'], locationHint: 'Meio upper deck bar direita · Samsung 55S62' },
  { num: 20, label: 'Suíça', legacyNames: ['Suíça'], locationHint: 'Canto upper deck bar direita · Samsung 65S62' },
  {
    num: 21,
    label: 'Telão Brasil',
    legacyNames: ['Telão Brasil', 'Brasil'],
    locationHint: 'Telão espaço multiuso · conectar stick/PC na entrada HDMI do processador de vídeo',
  },
];

const HALL_SCREEN_NAMES = HALL_SCREENS.map((s) => screenDisplayName(s.num, s.label));

async function findScreenByLegacyNames(
  tenantId: string,
  row: (typeof HALL_SCREENS)[number],
) {
  const displayName = screenDisplayName(row.num, row.label);
  const namesToTry = [displayName, ...row.legacyNames];
  for (const name of namesToTry) {
    const found = await prisma.bostonTvScreen.findFirst({
      where: { tenantId, name },
      select: { id: true, name: true, playerToken: true },
    });
    if (found) return found;
  }
  return null;
}

async function ensureHallPlaylist(tenantId: string, tenantLogoUrl: string | null) {
  let playlist = await prisma.bostonTvPlaylist.findFirst({
    where: { tenantId, name: HALL_PLAYLIST_NAME },
    select: { id: true, name: true },
  });

  if (!playlist) {
    playlist = await prisma.bostonTvPlaylist.create({
      data: { tenantId, name: HALL_PLAYLIST_NAME },
      select: { id: true, name: true },
    });
    console.log(`  + playlist: ${playlist.name}`);
  } else {
    console.log(`  · playlist já existe: ${playlist.name}`);
  }

  const itemCount = await prisma.bostonTvPlaylistItem.count({
    where: { playlistId: playlist.id },
  });

  if (itemCount === 0 && tenantLogoUrl?.trim()) {
    const logoUrl = resolvePublicMediaUrl(tenantLogoUrl) || tenantLogoUrl.trim();
    await prisma.bostonTvPlaylistItem.create({
      data: {
        playlistId: playlist.id,
        sortOrder: 0,
        contentType: 'image_url',
        url: logoUrl,
        durationSeconds: 15,
      },
    });
    console.log('  + item inicial: logo do clube (15s)');
  } else if (itemCount > 0 && tenantLogoUrl?.trim()) {
    const logoItem = await prisma.bostonTvPlaylistItem.findFirst({
      where: { playlistId: playlist.id, contentType: 'image_url' },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, url: true },
    });
    const fixed = resolvePublicMediaUrl(tenantLogoUrl) || tenantLogoUrl.trim();
    if (logoItem && /amazonaws\.com/i.test(logoItem.url) && fixed !== logoItem.url) {
      await prisma.bostonTvPlaylistItem.update({
        where: { id: logoItem.id },
        data: { url: fixed },
      });
      console.log('  ↻ logo atualizada para URL pública (CDN)');
    }
  } else if (itemCount === 0) {
    console.log('  · playlist vazia (sem logo no tenant — adicione itens no dashboard)');
  }

  const linked = await prisma.bostonTvScreen.updateMany({
    where: {
      tenantId,
      name: { in: HALL_SCREEN_NAMES },
    },
    data: {
      displayMode: 'playlist',
      playlistId: playlist.id,
    },
  });

  console.log(`  → ${linked.count} telas vinculadas à playlist "${HALL_PLAYLIST_NAME}"`);

  await prisma.bostonTvHallChannel.upsert({
    where: { tenantId },
    create: { tenantId, playlistId: playlist.id },
    update: { playlistId: playlist.id },
  });
  console.log('  + Canal Hall sincronizado (relógio mestre)');

  return playlist;
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: TENANT_SLUG },
    select: { id: true, name: true, logoUrl: true },
  });
  if (!tenant) {
    throw new Error(
      `Tenant "${TENANT_SLUG}" não encontrado. Verifique o slug do clube no banco.`,
    );
  }

  let created = 0;
  let renamed = 0;
  let skipped = 0;

  for (const row of HALL_SCREENS) {
    const displayName = screenDisplayName(row.num, row.label);
    const existing = await findScreenByLegacyNames(tenant.id, row);

    if (existing) {
      if (existing.name !== displayName) {
        await prisma.bostonTvScreen.update({
          where: { id: existing.id },
          data: {
            name: displayName,
            locationHint: row.locationHint,
          },
        });
        renamed += 1;
        console.log(`  ↻ renomeada: ${existing.name} → ${displayName}`);
      } else {
        skipped += 1;
        console.log(`  · tela já existe: ${displayName}`);
      }
      continue;
    }

    const screen = await prisma.bostonTvScreen.create({
      data: {
        tenantId: tenant.id,
        name: displayName,
        locationHint: row.locationHint,
        playerToken: newPlayerToken(),
        displayMode: 'playlist',
        scheduleTimezone: 'America/Sao_Paulo',
      },
      select: { id: true, name: true, playerToken: true },
    });
    created += 1;
    console.log(`  + tela: ${screen.name} → token ${screen.playerToken.slice(0, 12)}…`);
  }

  console.log('');
  console.log('Playlist Hall:');
  await ensureHallPlaylist(tenant.id, tenant.logoUrl);

  console.log('');
  console.log(`Boston TV — ${tenant.name}`);
  console.log(
    `  Criadas: ${created} | Renomeadas: ${renamed} | Já ok: ${skipped} | Total: ${HALL_SCREENS.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
