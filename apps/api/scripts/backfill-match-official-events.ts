/**
 * Backfill idempotente de MatchOfficialEvent — DRY RUN por padrão.
 *
 * Uso:
 *   pnpm --filter api exec ts-node scripts/backfill-match-official-events.ts --tenantId=XXX
 *   pnpm --filter api exec ts-node scripts/backfill-match-official-events.ts --tenantId=XXX --apply
 */
import { NestFactory } from '@nestjs/core';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { FmfMatchReportService } from '../src/fmf-scraper/fmf-match-report.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { normalizeParsedFmfReport } from '../src/fmf-scraper/fmf-parsed-normalize.util';

async function main() {
  const args = process.argv.slice(2);
  const tenantId = args.find((a) => a.startsWith('--tenantId='))?.split('=')[1];
  const apply = args.includes('--apply');
  if (!tenantId) {
    console.error('Informe --tenantId=');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const matchReports = app.get(FmfMatchReportService);

  const reports = await prisma.fmfMatchReport.findMany({
    where: { tenantId },
    select: { id: true, externalMatchId: true, rawParsed: true },
    orderBy: { matchDate: 'desc' },
  });

  let parseable = 0;
  let withStaffRoster = 0;
  let limitations = 0;

  for (const report of reports) {
    const parsed = normalizeParsedFmfReport(report.rawParsed);
    if (!parsed) {
      limitations += 1;
      continue;
    }
    parseable += 1;
    if (parsed.staffRoster.length > 0) withStaffRoster += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun: !apply,
        tenantId,
        matchesInspected: reports.length,
        matchesParseable: parseable,
        withStaffRoster,
        limitations,
        hint: apply
          ? 'Reconcile executado por partida via FmfMatchReportService.reconcile'
          : 'Use --apply para executar reconcile (reimporta PDFs disponíveis)',
      },
      null,
      2,
    ),
  );

  if (apply) {
    const result = await matchReports.reconcile(tenantId);
    console.log(JSON.stringify({ reconcile: result }, null, 2));
  }

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
