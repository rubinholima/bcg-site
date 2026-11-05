/**
 * Validação focada pós-release FMF — sem subir API/Web.
 */
import dotenv from 'dotenv';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfScraperService } from '../src/fmf-scraper/fmf-scraper.service';
import { FmfMatchReportService } from '../src/fmf-scraper/fmf-match-report.service';
import { loadFmfPresetExtensionMap, mergeFmfPresetMaps } from '../src/fmf-scraper/fmf-preset-registry.util';
import { resolveFmfPresetKeys } from '../src/fmf-scraper/fmf-fixture.util';
import { parseTenantCategoryKeys } from '../src/fmf-scraper/fmf-sync-tenants.config';
import { FMF_SYNC_TENANT_SLUGS } from '../src/fmf-scraper/fmf-sync-tenants.config';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const VILLA_ALIASES = ['VILLA NOVA', 'VILLA NOVA SAF'];
const p = new PrismaClient();

async function resolveForSlug(slug: string, store: Awaited<ReturnType<FmfScraperService['getStatus']>>) {
  const tenant = await p.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, categories: true },
  });
  if (!tenant) throw new Error(`Tenant ${slug} not found`);
  const extensions = await loadFmfPresetExtensionMap(p as never);
  const presetMap = mergeFmfPresetMaps(extensions);
  const categoryKeys = parseTenantCategoryKeys(tenant.categories);
  const resolved = resolveFmfPresetKeys(store, categoryKeys, {
    presetMap,
    club: {
      tenantName: tenant.name,
      aliases: slug === 'villa-nova-saf' ? VILLA_ALIASES : undefined,
      season: 2026,
    },
  });
  return { tenant, categoryKeys, resolved };
}

async function main() {
  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, { logger: false });
  const scraper = app.get(FmfScraperService);
  const matchReports = app.get(FmfMatchReportService);
  const store = await scraper.getStatus();

  const villa = await resolveForSlug('villa-nova-saf', store);
  const boston = await resolveForSlug('boston-city-fc-brasil', store);

  const villaId = villa.tenant.id;
  const noop = await matchReports.importReports({ tenantId: villaId, all: true });
  const dup = await p.$queryRaw<Array<{ externalMatchId: string; c: number }>>`
    SELECT "externalMatchId", COUNT(*)::int AS c FROM "FmfMatchReport"
    WHERE "tenantId" = ${villaId} GROUP BY "externalMatchId" HAVING COUNT(*) > 1`;

  const bostonTotal = await p.fmfMatchReport.count({
    where: { tenantId: boston.tenant.id, season: 2026 },
  });

  const american = await p.tenant.findFirst({
    where: { slug: { contains: 'american' } },
    select: { slug: true, name: true },
  });

  console.log(
    JSON.stringify(
      {
        villaCategories: villa.categoryKeys,
        villaResolved: villa.resolved.sort(),
        bostonCategories: boston.categoryKeys.sort(),
        bostonResolved: boston.resolved.sort(),
        noop,
        duplicates: dup,
        bostonReportTotal2026: bostonTotal,
        fmfSyncSlugs: [...FMF_SYNC_TENANT_SLUGS],
        americanTenant: american,
      },
      null,
      2,
    ),
  );

  await app.close();
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
