/**
 * Normaliza registrationProfile.sports.situation para pt-BR canônico.
 * Corrige valores Beatscode em inglês (inative, definitive, loaned, etc.).
 *
 * pnpm --filter api players:normalize-situations
 * pnpm --filter api players:normalize-situations -- --dry-run
 * pnpm --filter api players:normalize-situations -- --tenant boston-city-fc-brasil
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { normalizeSportsSituation } from '../src/common/sports-situation.util';

const cwd = process.cwd();
dotenv.config({ path: resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: resolve(cwd, '../../.env') });
}

type ProfileJson = Record<string, unknown>;

function parseProfile(raw: unknown): ProfileJson {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as ProfileJson;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const tenantArg = process.argv.find((a) => a.startsWith('--tenant='))?.split('=')[1]
    ?? (process.argv.includes('--tenant')
      ? process.argv[process.argv.indexOf('--tenant') + 1]
      : undefined);

  const prisma = new PrismaClient();

  const tenant = tenantArg
    ? await prisma.tenant.findUnique({ where: { slug: tenantArg }, select: { id: true, slug: true } })
    : null;
  if (tenantArg && !tenant) {
    throw new Error(`Tenant não encontrado: ${tenantArg}`);
  }

  const players = await prisma.player.findMany({
    where: tenant ? { tenantId: tenant.id } : undefined,
    select: { id: true, name: true, registrationProfile: true },
  });

  const changes: Array<{ id: string; name: string; from: string | null; to: string }> = [];

  for (const p of players) {
    const profile = parseProfile(p.registrationProfile);
    const sports = (profile.sports as Record<string, unknown> | undefined) ?? {};
    const raw = typeof sports.situation === 'string' ? sports.situation : null;
    const normalized = normalizeSportsSituation(raw);
    if (raw === normalized) continue;
    changes.push({ id: p.id, name: p.name, from: raw, to: normalized });
  }

  const byFrom = new Map<string, number>();
  for (const c of changes) {
    const key = c.from ?? '(vazio)';
    byFrom.set(key, (byFrom.get(key) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        tenant: tenant?.slug ?? 'todos',
        playersScanned: players.length,
        toUpdate: changes.length,
        byOriginalValue: Object.fromEntries([...byFrom.entries()].sort((a, b) => b[1] - a[1])),
        sample: changes.slice(0, 8),
      },
      null,
      2,
    ),
  );

  if (changes.length === 0) {
    console.log('Nada para atualizar.');
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log('Dry-run — nenhuma alteração gravada.');
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  for (const c of changes) {
    const player = players.find((p) => p.id === c.id)!;
    const profile = parseProfile(player.registrationProfile);
    const sports = { ...((profile.sports as Record<string, unknown> | undefined) ?? {}) };
    sports.situation = c.to;
    const nextProfile = { ...profile, sports };

    await prisma.player.update({
      where: { id: c.id },
      data: { registrationProfile: nextProfile as Prisma.InputJsonValue },
    });
    updated++;
  }

  console.log(`Atualizados: ${updated} jogador(es).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
