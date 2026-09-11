/**
 * Reparo cirúrgico de disciplina FMF — allowlist de produção enforced, dry-run por padrão.
 *
 * Uso:
 *   pnpm --filter api exec ts-node scripts/repair-fmf-discipline-scope.ts \
 *     "--tenantId=XXX" "--matchIds=cmsgaqgl3009ep894q6k2jcb4"
 *
 * Apply (exige fingerprint revisado):
 *   ... --apply --planFingerprint=<hash do dry-run>
 */
import { NestFactory } from '@nestjs/core';
import { PDFParse } from 'pdf-parse';
import { FmfScraperScriptModule } from '../src/fmf-scraper/fmf-scraper-script.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { parseFmfMatchReportText } from '../src/fmf-scraper/fmf-match-report.parser';
import {
  parseRepairCliArgs,
  runRepairDisciplineCli,
} from './repair-fmf-discipline-scope.cli';

async function downloadAndParse(url: string) {
  const parser = new PDFParse({ url });
  try {
    const result = await parser.getText();
    return parseFmfMatchReportText(result.text);
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const args = parseRepairCliArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(FmfScraperScriptModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  const result = await runRepairDisciplineCli(prisma, args, downloadAndParse);
  console.log(JSON.stringify(result.payload, null, 2));
  await app.close();
  process.exit(result.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
