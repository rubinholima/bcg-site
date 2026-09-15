/**
 * Validação local: dois ciclos canônicos FMF full sync + idempotência.
 */
import dotenv from 'dotenv';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { FmfFullSyncError, FmfFullSyncService } from '../src/fmf-scraper/fmf-full-sync.service';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import {
  readTenantCategoryKeys,
  tenantCategoriesUnchanged,
} from '../src/fmf-scraper/fmf-sync-tenants.config';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const VILLA_SLUG = 'villa-nova-saf';
const BOSTON_SLUG = 'boston-city-fc-brasil';

async function snapshot(p: PrismaClient, label: string) {
  const villa = await p.tenant.findUnique({
    where: { slug: VILLA_SLUG },
    select: { id: true, categories: true },
  });
  const boston = await p.tenant.findUnique({
    where: { slug: BOSTON_SLUG },
    select: { id: true, categories: true },
  });
  const now = new Date();

  const villaTravels = await p.travelLogistics.count({
    where: { tenantId: villa!.id, matchDate: { gte: now } },
  });
  const villaAgenda = await p.footballAgendaEntry.count({
    where: { tenantId: villa!.id, externalId: { startsWith: 'fmf-' }, startAt: { gte: now } },
  });
  const bostonAgenda = await p.footballAgendaEntry.count({
    where: { tenantId: boston!.id, externalId: { startsWith: 'fmf-' }, startAt: { gte: now } },
  });
  const dupTravel = await p.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM (
      SELECT "externalId" FROM "TravelLogistics"
      WHERE "tenantId" = ${villa!.id} AND "externalId" IS NOT NULL
      GROUP BY "externalId" HAVING COUNT(*) > 1
    ) d`;
  const dupSpace = await p.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM (
      SELECT "tenantId", lower("name") FROM "FootballActivitySpace"
      GROUP BY "tenantId", lower("name") HAVING COUNT(*) > 1
    ) d`;

  const wrongClub = await p.fmfMatchReport.count({
    where: {
      tenantId: villa!.id,
      season: 2026,
      OR: [
        { homeTeam: { contains: 'VILLA REAL', mode: 'insensitive' } },
        { awayTeam: { contains: 'VILLA REAL', mode: 'insensitive' } },
      ],
    },
  });

  return {
    label,
    villaCategories: readTenantCategoryKeys(villa!.categories),
    bostonCategories: readTenantCategoryKeys(boston!.categories),
    villaTravels,
    villaAgenda,
    bostonAgenda,
    dupTravel: dupTravel[0]?.c ?? 0,
    dupSpace: dupSpace[0]?.c ?? 0,
    wrongClub,
    bostonReports: await p.fmfMatchReport.count({
      where: { tenantId: boston!.id, season: 2026 },
    }),
  };
}

async function main() {
  const p = new PrismaClient();
  const villaBefore = await p.tenant.findUnique({
    where: { slug: VILLA_SLUG },
    select: { categories: true },
  });
  const bostonBefore = await p.tenant.findUnique({
    where: { slug: BOSTON_SLUG },
    select: { categories: true },
  });
  const before = await snapshot(p, 'before');

  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const fullSync = app.get(FmfFullSyncService);
    const sync1 = await fullSync.runFullSync();
    const after1 = await snapshot(p, 'after_sync_1');
    const sync2 = await fullSync.runFullSync();
    const after2 = await snapshot(p, 'after_sync_2');

    const villaAfter = await p.tenant.findUnique({
      where: { slug: VILLA_SLUG },
      select: { categories: true },
    });
    const bostonAfter = await p.tenant.findUnique({
      where: { slug: BOSTON_SLUG },
      select: { categories: true },
    });

    console.log(
      JSON.stringify(
        {
          tenantCategoriesInvariant: {
            villaUnchanged: tenantCategoriesUnchanged(villaBefore?.categories, villaAfter?.categories),
            bostonUnchanged: tenantCategoriesUnchanged(bostonBefore?.categories, bostonAfter?.categories),
            villaBefore: readTenantCategoryKeys(villaBefore?.categories),
            villaAfter: readTenantCategoryKeys(villaAfter?.categories),
            bostonBefore: readTenantCategoryKeys(bostonBefore?.categories),
            bostonAfter: readTenantCategoryKeys(bostonAfter?.categories),
          },
          before,
          sync1: {
            ok: sync1.ok,
            failedStages: sync1.failedStages,
            travelOk: sync1.stages.travel?.ok,
            agendaOk: sync1.stages.agenda?.ok,
            pagesOk: sync1.stages.pages?.ok,
            matchReportsOk: sync1.stages.matchReports?.ok,
          },
          after1,
          sync2: {
            ok: sync2.ok,
            failedStages: sync2.failedStages,
            travelOk: sync2.stages.travel?.ok,
            agendaOk: sync2.stages.agenda?.ok,
            pagesOk: sync2.stages.pages?.ok,
            matchReportsOk: sync2.stages.matchReports?.ok,
          },
          after2,
        },
        null,
        2,
      ),
    );

    if (!sync1.ok || !sync2.ok) process.exit(1);
  } catch (e) {
    if (e instanceof FmfFullSyncError) {
      console.error(JSON.stringify({ stage: e.stage, error: e.message, partial: e.partial }, null, 2));
      process.exit(1);
    }
    throw e;
  } finally {
    await app.close();
    await p.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
