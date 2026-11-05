/**
 * Validação local: viagens FMF → Futebol Jogos Futuro (Villa Nova).
 */
import dotenv from 'dotenv';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfTravelSyncService } from '../src/fmf-scraper/fmf-travel-sync.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const VILLA = '9c039a02-6ade-40ba-8ed6-a4b330ef21e5';

async function main() {
  const p = new PrismaClient();
  const travelsBefore = await p.travelLogistics.count({
    where: { tenantId: VILLA, matchDate: { gte: new Date('2026-09-11') } },
  });

  const fmfApp = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const travelSync = fmfApp.get(FmfTravelSyncService);
    const travelResult = await travelSync.syncAll({ tenantId: VILLA });
    console.log('TRAVEL_SYNC', JSON.stringify(travelResult, null, 2));
  } finally {
    await fmfApp.close();
  }

  const travelsAfter = await p.travelLogistics.findMany({
    where: { tenantId: VILLA, matchDate: { gte: new Date('2026-09-11') } },
    orderBy: { matchDate: 'asc' },
    select: {
      matchDate: true,
      opponentName: true,
      category: true,
      externalId: true,
      championshipName: true,
    },
  });

  const now = new Date();
  const travelsAll = await p.travelLogistics.findMany({
    where: { tenantId: VILLA, status: { not: 'cancelado' } },
    orderBy: { matchDate: 'asc' },
  });
  const upcoming = travelsAll
    .filter((t) => t.matchDate >= now && t.matchDate.getFullYear() === 2026)
    .map((t) => ({
      matchDate: t.matchDate.toISOString(),
      opponentName: t.opponentName,
      category: t.category,
      competition: t.championshipName,
      externalId: t.externalId,
    }));

  const match1209Travel = travelsAfter.find(
    (t) =>
      t.matchDate.toISOString().startsWith('2026-09-12') &&
      /uberlandia/i.test(t.opponentName ?? ''),
  );
  const match1209Jogos = upcoming.find(
    (g) =>
      g.matchDate.startsWith('2026-09-12') &&
      /uberlandia/i.test(g.opponentName ?? ''),
  );

  console.log(
    JSON.stringify(
      {
        travelsBefore,
        travelsAfter: travelsAfter.length,
        upcomingCount: upcoming.length,
        match1209Travel,
        match1209Jogos,
        upcomingSample: upcoming.slice(0, 8).map((g) => ({
          date: g.matchDate,
          opponent: g.opponentName,
          category: g.category,
          competition: g.competition,
        })),
      },
      null,
      2,
    ),
  );

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
