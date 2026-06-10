/**
 * Seed: 20 Smart TVs + telão — tenant Boston City FC Brasil (espaço multiuso / Hall).
 * Cria playlist "Hall — loop geral" e associa às telas.
 * Idempotente: não duplica telas/playlist com o mesmo nome no tenant.
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
const prisma = new PrismaClient();

const TENANT_SLUG = 'boston-city-fc-brasil';
const HALL_PLAYLIST_NAME = 'Hall — loop geral';

function newPlayerToken(): string {
  return randomBytes(24).toString('hex');
}

/** Planilha TVs — espaço multiuso (Boston City FC Brasil) */
const HALL_SCREENS: Array<{ name: string; locationHint: string }> = [
  { name: 'USA', locationHint: 'Canto bar direita · Samsung 65S62' },
  { name: 'Colômbia', locationHint: 'Diagonal bar direita · Samsung 55S62' },
  { name: 'Paraguai', locationHint: 'Direita palco · Samsung 65S62' },
  { name: 'Uruguai', locationHint: 'Direita tela palco · Samsung 65S62' },
  { name: 'Equador', locationHint: 'Esquerda tela palco · Samsung 65S62' },
  { name: 'Canadá', locationHint: 'Esquerda palco · Samsung 55S62' },
  { name: 'Alemanha', locationHint: 'Diagonal bar esquerda · Samsung 65S62' },
  { name: 'Áustria', locationHint: 'Canto bar esquerda · Samsung 55S62' },
  { name: 'Bélgica', locationHint: 'Meio bar esquerda · Samsung 65S62' },
  { name: 'Inglaterra', locationHint: 'Canto upper deck bar esquerda · Samsung UN65DU7700' },
  { name: 'Noruega', locationHint: 'Meio upper deck bar esquerda · Samsung 55S62' },
  { name: 'Portugal', locationHint: 'Banheiro upper deck bar esquerda · Samsung 55S62' },
  { name: 'Croácia', locationHint: 'Upper deck centro TV1 · Philips 7300' },
  { name: 'Escócia', locationHint: 'Upper deck centro TV2 · Philips 7300' },
  { name: 'Espanha', locationHint: 'Upper deck centro TV3 · Philips 7300' },
  { name: 'França', locationHint: 'Upper deck centro TV4 · Philips 7300' },
  { name: 'Holanda', locationHint: 'Centro upper deck · Samsung 55S62' },
  { name: 'Argentina', locationHint: 'Banheiro upper deck bar direita · Samsung 55S62' },
  { name: 'Suécia', locationHint: 'Meio upper deck bar direita · Samsung 55S62' },
  { name: 'Suíça', locationHint: 'Canto upper deck bar direita · Samsung 65S62' },
  {
    name: 'Telão Brasil',
    locationHint: 'Telão espaço multiuso · conectar stick/PC na entrada HDMI do processador de vídeo',
  },
];

const HALL_SCREEN_NAMES = HALL_SCREENS.map((s) => s.name);

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
    await prisma.bostonTvPlaylistItem.create({
      data: {
        playlistId: playlist.id,
        sortOrder: 0,
        contentType: 'image_url',
        url: tenantLogoUrl.trim(),
        durationSeconds: 15,
      },
    });
    console.log('  + item inicial: logo do clube (15s)');
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
      iptvChannelId: null,
    },
  });

  console.log(`  → ${linked.count} telas vinculadas à playlist "${HALL_PLAYLIST_NAME}"`);
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
  let skipped = 0;

  for (const row of HALL_SCREENS) {
    const existing = await prisma.bostonTvScreen.findFirst({
      where: { tenantId: tenant.id, name: row.name },
      select: { id: true, playerToken: true },
    });
    if (existing) {
      skipped += 1;
      console.log(`  · tela já existe: ${row.name}`);
      continue;
    }

    const screen = await prisma.bostonTvScreen.create({
      data: {
        tenantId: tenant.id,
        name: row.name,
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
  console.log(`  Telas criadas: ${created} | Já existiam: ${skipped} | Total: ${HALL_SCREENS.length}`);
  console.log(`  Edite "${HALL_PLAYLIST_NAME}" em Marketing → Boston TV → Playlists para adicionar conteúdo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
