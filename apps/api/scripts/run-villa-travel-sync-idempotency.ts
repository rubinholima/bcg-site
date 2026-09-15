/**
 * Dois ciclos de travel sync Villa — idempotência sem subir API/Web.
 */
import dotenv from 'dotenv';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfTravelSyncService } from '../src/fmf-scraper/fmf-travel-sync.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function patrocinenseCount(p: PrismaClient, tenantId: string) {
  return p.travelLogistics.count({
    where: {
      tenantId,
      matchDate: { gte: new Date('2026-09-27T00:00:00-03:00'), lt: new Date('2026-09-28T00:00:00-03:00') },
      opponentName: { contains: 'PATROCINENSE', mode: 'insensitive' },
    },
  });
}

async function main() {
  const p = new PrismaClient();
  const villa = await p.tenant.findUnique({ where: { slug: 'villa-nova-saf' }, select: { id: true } });
  if (!villa) throw new Error('Villa not found');

  const before = await patrocinenseCount(p, villa.id);
  const totalBefore = await p.travelLogistics.count({ where: { tenantId: villa.id, matchDate: { gte: new Date() } } });

  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn'],
  });
  const travel = app.get(FmfTravelSyncService);

  const sync1 = await travel.syncAll({ tenantId: villa.id });
  const mid = await patrocinenseCount(p, villa.id);
  const totalMid = await p.travelLogistics.count({ where: { tenantId: villa.id, matchDate: { gte: new Date() } } });

  const sync2 = await travel.syncAll({ tenantId: villa.id });
  const after = await patrocinenseCount(p, villa.id);
  const totalAfter = await p.travelLogistics.count({ where: { tenantId: villa.id, matchDate: { gte: new Date() } } });

  const patTravel = await p.travelLogistics.findFirst({
    where: {
      tenantId: villa.id,
      opponentName: { contains: 'PATROCINENSE', mode: 'insensitive' },
      matchDate: { gte: new Date('2026-09-27T00:00:00-03:00'), lt: new Date('2026-09-28T00:00:00-03:00') },
    },
    select: { externalId: true, category: true, championshipName: true },
  });

  await app.close();
  await p.$disconnect();

  console.log(JSON.stringify({ before, mid, after, totalBefore, totalMid, totalAfter, sync1, sync2, patTravel }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
