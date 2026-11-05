/**
 * Validação local Villa Nova multi-competição — sem subir API/Web.
 * Uso: pnpm exec ts-node --transpile-only -r tsconfig-paths/register scripts/run-villa-local-validation.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfScraperService } from '../src/fmf-scraper/fmf-scraper.service';
import { FmfAgendaSyncService } from '../src/futebol-agenda/fmf-agenda-sync.service';
import { FmfMatchReportService } from '../src/fmf-scraper/fmf-match-report.service';
import { discoverFmfPresetKeysForClub } from '../src/fmf-scraper/fmf-club-preset-discovery.util';
import { loadFmfPresetExtensionMap, mergeFmfPresetMaps } from '../src/fmf-scraper/fmf-preset-registry.util';
import { resolveFmfPresetKeys } from '../src/fmf-scraper/fmf-fixture.util';
import { isFmfTeamMatch } from '../src/fmf-scraper/fmf-team-match.util';
import { parseTenantCategoryKeys } from '../src/fmf-scraper/fmf-sync-tenants.config';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const skipScrape = process.argv.includes('--skip-scrape');
const VILLA_SLUG = 'villa-nova-saf';
const BOSTON_SLUG = 'boston-city-fc-brasil';
const VILLA_ALIASES = ['VILLA NOVA', 'VILLA NOVA SAF'];

const p = new PrismaClient();

async function snapshotTenant(slug: string) {
  const t = await p.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, categories: true },
  });
  if (!t) return null;
  const reports = await p.fmfMatchReport.groupBy({
    by: ['category', 'competition'],
    where: { tenantId: t.id, season: 2026 },
    _count: { _all: true },
  });
  const agenda = await p.footballAgendaEntry.groupBy({
    by: ['category'],
    where: { tenantId: t.id, externalId: { startsWith: 'fmf-' } },
    _count: { _all: true },
  });
  const reportTotal = await p.fmfMatchReport.count({
    where: { tenantId: t.id, season: 2026 },
  });
  return { tenant: t, reports, agenda, reportTotal };
}

function villaMatchesInStore(
  store: Awaited<ReturnType<FmfScraperService['getStatus']>>,
  presetKey: string,
) {
  const snap = store.categories?.[presetKey];
  if (!snap?.matches) return { total: 0, villa2026: 0, withReport: 0, villaReal: 0 };
  const villa2026 = snap.matches.filter(
    (m) =>
      (m.matchDate ?? '').startsWith('2026') &&
      (isFmfTeamMatch(m.homeName, 'VILLA NOVA SAF', VILLA_ALIASES) ||
        isFmfTeamMatch(m.awayName, 'VILLA NOVA SAF', VILLA_ALIASES)),
  );
  const villaReal = snap.matches.filter(
    (m) =>
      (m.matchDate ?? '').startsWith('2026') &&
      /villa\s*real/i.test(`${m.homeName} ${m.awayName}`) &&
      !/villa\s*nova/i.test(`${m.homeName} ${m.awayName}`),
  );
  const withReport = villa2026.filter((m) => m.reportUrl && m.externalMatchId);
  return {
    total: snap.matches.length,
    villa2026: villa2026.length,
    withReport: withReport.length,
    villaReal: villaReal.length,
  };
}

async function main() {
  const beforeBoston = await snapshotTenant(BOSTON_SLUG);
  const beforeVilla = await snapshotTenant(VILLA_SLUG);

  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const fmfScraper = app.get(FmfScraperService);
    const fmfAgendaSync = app.get(FmfAgendaSyncService);
    const matchReports = app.get(FmfMatchReportService);

    if (!skipScrape) {
      console.log('SCRAPING all presets (built-in + extensions)...');
      await fmfScraper.runImport({ all: true });
    }

    const store = await fmfScraper.getStatus();
    const extensions = await loadFmfPresetExtensionMap(p as never);
    const presetMap = mergeFmfPresetMaps(extensions);
    const villa = await p.tenant.findUnique({ where: { slug: VILLA_SLUG } });
    if (!villa) throw new Error('Villa Nova tenant not found');

    const discovered = discoverFmfPresetKeysForClub(store, {
      tenantName: villa.name,
      aliases: VILLA_ALIASES,
      season: 2026,
    });
    const categoryKeys = parseTenantCategoryKeys(villa.categories);
    const resolved = resolveFmfPresetKeys(store, categoryKeys, {
      presetMap,
      club: { tenantName: villa.name, aliases: VILLA_ALIASES, season: 2026 },
    });

    console.log('DISCOVERED', discovered);
    console.log('RESOLVED', resolved);

    const keys = [
      'modulo_ii',
      'sub15_2div',
      'sub20_2div',
      'sub13_2div',
      ...discovered,
    ];
    const storeStats: Record<string, ReturnType<typeof villaMatchesInStore>> = {};
    for (const key of [...new Set(keys)]) {
      storeStats[key] = villaMatchesInStore(store, key);
    }
    console.log('STORE_VILLA', JSON.stringify(storeStats, null, 2));

    const candidatesBefore = await matchReports.listCandidates(villa.id);
    console.log(
      'CANDIDATES_BEFORE',
      candidatesBefore.filter((c) => !c.imported).length,
      'pending of',
      candidatesBefore.length,
    );

    console.log('AGENDA_SYNC villa...');
    await fmfAgendaSync.syncAll({ tenantId: villa.id });

    console.log('IMPORT súmulas villa (1st pass)...');
    const import1 = await matchReports.importReports({ tenantId: villa.id, all: true });
    console.log('IMPORT1', JSON.stringify(import1));

    console.log('IMPORT súmulas villa (2nd pass idempotency)...');
    const import2 = await matchReports.importReports({ tenantId: villa.id, all: true });
    console.log('IMPORT2', JSON.stringify(import2));

    const afterVilla = await snapshotTenant(VILLA_SLUG);
    const afterBoston = await snapshotTenant(BOSTON_SLUG);
    const candidatesAfter = await matchReports.listCandidates(villa.id);

    const dupReports = await p.$queryRaw<Array<{ externalMatchId: string; c: number }>>`
      SELECT "externalMatchId", COUNT(*)::int AS c
      FROM "FmfMatchReport"
      WHERE "tenantId" = ${villa.id}
      GROUP BY "externalMatchId"
      HAVING COUNT(*) > 1
    `;

    console.log('AFTER_VILLA', JSON.stringify(afterVilla, null, 2));
    console.log('BOSTON_BEFORE', beforeBoston?.reportTotal, 'AFTER', afterBoston?.reportTotal);
    console.log(
      'BOSTON_REPORTS',
      JSON.stringify(beforeBoston?.reports),
      '->',
      JSON.stringify(afterBoston?.reports),
    );
    console.log('CANDIDATES_AFTER pending', candidatesAfter.filter((c) => !c.imported).length);
    console.log('DUPLICATES', dupReports);
  } finally {
    await app.close();
    await p.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
