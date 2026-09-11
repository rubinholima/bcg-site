/**
 * Reparo cirúrgico de disciplina FMF — allowlist explícita, dry-run por padrão.
 *
 * Uso:
 *   pnpm --filter api exec ts-node scripts/repair-fmf-discipline-scope.ts \
 *     "--tenantId=XXX" "--matchIds=id1,id2" [--competition=Sub-14] [--apply]
 */
import { NestFactory } from '@nestjs/core';
import { PDFParse } from 'pdf-parse';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { parseFmfMatchReportText } from '../src/fmf-scraper/fmf-match-report.parser';
import {
  applyValidatedMatchRepair,
  planFmfDisciplineScopeRepair,
  PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST,
} from '../src/fmf-scraper/fmf-discipline-scope-repair.util';

async function downloadAndParse(url: string) {
  const parser = new PDFParse({ url });
  try {
    const result = await parser.getText();
    return parseFmfMatchReportText(result.text);
  } finally {
    await parser.destroy();
  }
}

function parseArgs(argv: string[]) {
  const tenantId = argv.find((a) => a.startsWith('--tenantId='))?.split('=')[1]?.trim();
  const matchIdsRaw = argv.find((a) => a.startsWith('--matchIds='))?.split('=')[1]?.trim();
  const competition = argv.find((a) => a.startsWith('--competition='))?.split('=')[1]?.trim();
  const apply = argv.includes('--apply');
  const matchIds = matchIdsRaw ? matchIdsRaw.split(',').map((id) => id.trim()).filter(Boolean) : [];
  return { tenantId, matchIds, competition, apply };
}

async function main() {
  const { tenantId, matchIds, competition, apply } = parseArgs(process.argv.slice(2));
  if (!tenantId || matchIds.length === 0) {
    console.error(
      'Uso: ts-node scripts/repair-fmf-discipline-scope.ts --tenantId=XXX --matchIds=id1,id2 [--competition=Sub-14] [--apply]',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  const plan = await planFmfDisciplineScopeRepair(prisma, {
    tenantId,
    matchIds,
    competitionContains: competition,
    downloadAndParse,
    enforceProductionAllowlist: false,
  });

  console.log(
    JSON.stringify(
      {
        ...plan,
        dryRun: !apply,
        productionAllowlist: PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST,
        hint: apply
          ? 'Apply usa exatamente o plano validado (fingerprint + diffs)'
          : 'Dry-run — use --apply para mutar',
      },
      null,
      2,
    ),
  );

  if (!apply) {
    await app.close();
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, tradeName: true, slug: true },
  });
  if (!tenant) throw new Error('Tenant não encontrado');

  const applyResults: Array<{ matchId: string; ok: boolean; error?: string; result?: unknown }> = [];

  for (const validatedMatch of plan.matches) {
    if (!validatedMatch.safe) {
      applyResults.push({
        matchId: validatedMatch.matchId,
        ok: false,
        error: validatedMatch.blockReasons.join('; '),
      });
      continue;
    }
    try {
      const result = await applyValidatedMatchRepair(prisma, {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          tradeName: tenant.tradeName,
          slug: tenant.slug,
          aliases: [tenant.slug, 'boston city', 'boston'].filter(Boolean) as string[],
        },
        validatedMatch,
        downloadAndParse,
      });
      applyResults.push({ matchId: validatedMatch.matchId, ok: true, result });
    } catch (err) {
      applyResults.push({
        matchId: validatedMatch.matchId,
        ok: false,
        error: (err as Error).message,
      });
    }
  }

  console.log(JSON.stringify({ planFingerprint: plan.planFingerprint, applyResults }, null, 2));
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
