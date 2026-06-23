/**
 * Status do sync Beatscode (rodando ou último resultado).
 * Uso: pnpm --filter api beatscode:sync-status
 */
import 'dotenv/config';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LOG_PATH = join(process.cwd(), 'data', 'beatscode-sync-overnight.log');

type StoredDoc = { fileUrl?: string; pendingDownload?: boolean };

function countPending(profile: unknown): boolean {
  const docs = (profile as { documents?: StoredDoc[] } | null)?.documents ?? [];
  if (docs.length === 0) return true;
  return docs.some((d) => d.pendingDownload || !d.fileUrl?.trim());
}

async function main() {
  console.log('=== BEATSCODE SYNC — STATUS ===\n');

  if (existsSync(LOG_PATH)) {
    const stat = statSync(LOG_PATH);
    const lines = readFileSync(LOG_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
    const tail = lines.slice(-12);
    console.log(`Log: ${LOG_PATH}`);
    console.log(`Atualizado: ${stat.mtime.toLocaleString('pt-BR')}`);
    console.log('--- últimas linhas ---');
    for (const line of tail) console.log(line);
    console.log('---\n');
  } else {
    console.log(`Log ainda não existe: ${LOG_PATH}\n`);
  }

  const last = await prisma.integrationConfig.findUnique({
    where: { key: 'beatscode_documents_sync_last' },
  });
  if (last?.config) {
    console.log('Último sync salvo no banco:');
    console.log(JSON.stringify(last.config, null, 2));
    console.log('');
  } else {
    console.log('Nenhum sync finalizado salvo ainda (roda ao terminar).\n');
  }

  const checkpoint = await prisma.integrationConfig.findUnique({
    where: { key: 'beatscode_documents_sync_checkpoint' },
  });
  if (checkpoint?.config) {
    console.log('Checkpoint (sync em andamento ou interrompido):');
    console.log(JSON.stringify(checkpoint.config, null, 2));
    console.log('');
  }

  const players = await prisma.player.findMany({
    where: { externalId: { startsWith: 'beatscode-' } },
    select: { registrationProfile: true },
  });

  let pending = 0;
  let withPdf = 0;
  for (const p of players) {
    const docs = (p.registrationProfile as { documents?: StoredDoc[] } | null)?.documents ?? [];
    const uploaded = docs.filter((d) => d.fileUrl?.trim()).length;
    if (uploaded > 0) withPdf += 1;
    if (countPending(p.registrationProfile)) pending += 1;
  }

  console.log(`Atletas Beatscode no banco: ${players.length}`);
  console.log(`Com pelo menos 1 PDF: ${withPdf}`);
  console.log(`Ainda pendentes (sem arquivo / pendingDownload): ${pending}`);
  console.log('\nAcompanhar ao vivo: Get-Content "apps\\api\\data\\beatscode-sync-overnight.log" -Wait -Tail 15');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
