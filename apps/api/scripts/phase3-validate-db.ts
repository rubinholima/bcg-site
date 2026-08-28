/**
 * Validação Fase 3 — banco de desenvolvimento local (docker compose db).
 * Uso: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/phase3-validate-db.ts
 */
import { PrismaClient } from '@prisma/client';
import { parseFmfMatchReportText } from '../src/fmf-scraper/fmf-match-report.parser';
import { syncMatchOfficialEvents, buildOfficialEventDrafts } from '../src/fmf-scraper/match-official-events.sync';
import { buildPlayerLinkPool } from '../src/fmf-scraper/match-official-event.identity';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function assertSchema() {
  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'MatchOfficialEvent'
    ORDER BY column_name`;
  const names = cols.map((c) => c.column_name);
  for (const required of [
    'sourceClock',
    'sourceSequence',
    'relatedResolutionStatus',
    'externalKey',
    'fmfMatchReportId',
  ]) {
    if (!names.includes(required)) throw new Error(`Coluna ausente: ${required}`);
  }
  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes WHERE tablename = 'MatchOfficialEvent'`;
  const indexNames = indexes.map((i) => i.indexname);
  if (!indexNames.some((n) => n.includes('externalKey'))) {
    throw new Error('Índice unique externalKey ausente');
  }
  return { columns: names.length, indexes: indexNames.length };
}

async function seedMinimalMatch(suffix: string) {
  const kind = await prisma.tenantKind.findFirst({ select: { id: true } });
  if (!kind) throw new Error('TenantKind ausente — rode seed antes');
  const tenant = await prisma.tenant.create({
    data: {
      name: `Phase3 Test ${suffix}`,
      slug: `phase3-test-${suffix}-${Date.now()}`,
      kindId: kind.id,
    },
  });
  const report = await prisma.fmfMatchReport.create({
    data: {
      tenantId: tenant.id,
      externalMatchId: `p3-${suffix}-${Date.now()}`,
      sourceUrl: 'https://local/test',
      competition: 'TEST',
      category: 'sub20',
      season: 2026,
      matchDate: new Date('2026-08-01'),
      homeTeam: 'HOME',
      awayTeam: 'BOSTON CITY FUTEBOL CLUBE SAF',
      homeScore: 0,
      awayScore: 0,
      rawParsed: {},
    },
  });
  return { tenant, report };
}

async function main() {
  const results: Record<string, unknown> = { database: 'postgresql://bcg:***@localhost:5432/bcg_platform' };

  results.schema = await assertSchema();

  const { tenant, report } = await seedMinimalMatch('constraints');
  const key = 'fmf:PLAYER_YELLOW_CARD:away:2T:32:00:10:0';

  await prisma.matchOfficialEvent.create({
    data: {
      tenantId: tenant.id,
      fmfMatchReportId: report.id,
      factType: 'PLAYER_YELLOW_CARD',
      resolutionStatus: 'unresolved',
      externalKey: key,
      sourceTeamSide: 'away',
      sourceJerseyNumber: 10,
      sourceClock: '32:00',
      period: '2T',
      minute: 32,
    },
  });

  let duplicateBlocked = false;
  try {
    await prisma.matchOfficialEvent.create({
      data: {
        tenantId: tenant.id,
        fmfMatchReportId: report.id,
        factType: 'PLAYER_YELLOW_CARD',
        resolutionStatus: 'unresolved',
        externalKey: key,
      },
    });
  } catch {
    duplicateBlocked = true;
  }
  results.duplicateSameMatchBlocked = duplicateBlocked;

  const { tenant: tenant2, report: report2 } = await seedMinimalMatch('cross');
  await prisma.matchOfficialEvent.create({
    data: {
      tenantId: tenant2.id,
      fmfMatchReportId: report2.id,
      factType: 'PLAYER_YELLOW_CARD',
      resolutionStatus: 'unresolved',
      externalKey: key,
      sourceClock: '32:00',
    },
  });
  results.crossMatchSameKeyAllowed = true;

  const player = await prisma.player.create({
    data: {
      tenantId: tenant.id,
      name: 'Atleta Teste',
      category: 'sub20',
      cbfRegistration: '999001',
    },
  });
  await prisma.matchOfficialEvent.create({
    data: {
      tenantId: tenant.id,
      fmfMatchReportId: report.id,
      factType: 'PLAYER_GOAL',
      resolutionStatus: 'resolved',
      externalKey: 'fmf:PLAYER_GOAL:away:1T:03:00:9:0',
      playerId: player.id,
      technicalStaffId: null,
      sourceJerseyNumber: 9,
      sourceClock: '03:00',
    },
  });
  results.resolvedPlayerFk = true;

  const sourcePath = path.join(
    __dirname,
    '../src/fmf-scraper/fixtures/golden-match-45789.source.txt',
  );
  const parsed = parseFmfMatchReportText(fs.readFileSync(sourcePath, 'utf8'));
  const { tenant: goldenTenant, report: goldenReport } = await seedMinimalMatch('golden');
  await prisma.fmfMatchReport.update({
    where: { id: goldenReport.id },
    data: { rawParsed: parsed as object, externalMatchId: '45789-p3-test' },
  });

  const pool = buildPlayerLinkPool([
    { id: player.id, name: player.name, cbfRegistration: '738626' },
  ]);

  const sync1 = await syncMatchOfficialEvents(prisma as never, {
    tenantId: goldenTenant.id,
    matchId: goldenReport.id,
    parsed,
    ourTeamSide: 'away',
    players: pool.players,
    staff: [],
    parseSucceeded: true,
  });

  const ids1 = await prisma.matchOfficialEvent.findMany({
    where: { fmfMatchReportId: goldenReport.id },
    select: { id: true, externalKey: true },
    orderBy: { sourceSequence: 'asc' },
  });

  const sync2 = await syncMatchOfficialEvents(prisma as never, {
    tenantId: goldenTenant.id,
    matchId: goldenReport.id,
    parsed,
    ourTeamSide: 'away',
    players: pool.players,
    staff: [],
    parseSucceeded: true,
  });

  const ids2 = await prisma.matchOfficialEvent.findMany({
    where: { fmfMatchReportId: goldenReport.id },
    select: { id: true, externalKey: true },
    orderBy: { sourceSequence: 'asc' },
  });

  results.reimportIdempotent =
    ids1.length === ids2.length &&
    ids1.every((e, i) => e.externalKey === ids2[i]?.externalKey && e.id === ids2[i]?.id);
  results.goldenSync = { first: sync1, second: sync2, eventCount: ids2.length };

  const parseFail = await syncMatchOfficialEvents(prisma as never, {
    tenantId: goldenTenant.id,
    matchId: goldenReport.id,
    parsed,
    ourTeamSide: 'away',
    players: pool.players,
    staff: [],
    parseSucceeded: false,
  });
  const afterFail = await prisma.matchOfficialEvent.count({
    where: { fmfMatchReportId: goldenReport.id },
  });
  results.parserFailureProtection = parseFail.created === 0 && afterFail === ids2.length;

  await prisma.$disconnect();
  console.log(JSON.stringify(results, null, 2));
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
