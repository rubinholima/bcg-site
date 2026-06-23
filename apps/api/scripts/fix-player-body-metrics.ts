/**
 * Corrige altura/peso gravados em metros (ex.: 1.65) → centímetros (165).
 *
 * pnpm --filter api fix:player-body-metrics
 * pnpm --filter api fix:player-body-metrics -- --dry-run
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeHeightCm, normalizeWeightKg } from '../src/common/body-measures.util';

const cwd = process.cwd();
dotenv.config({ path: resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) dotenv.config({ path: resolve(cwd, '../../.env') });

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();

  try {
    const players = await prisma.player.findMany({
      where: {
        OR: [{ height: { not: null } }, { weight: { not: null } }],
      },
      select: { id: true, name: true, height: true, weight: true },
    });

    let fixed = 0;
    for (const p of players) {
      const nextHeight = p.height != null ? normalizeHeightCm(p.height) : null;
      const nextWeight = p.weight != null ? normalizeWeightKg(p.weight) : null;
      const heightChanged = p.height !== nextHeight;
      const weightChanged = p.weight !== nextWeight;
      if (!heightChanged && !weightChanged) continue;

      fixed++;
      console.log(
        `${dryRun ? '[dry-run] ' : ''}${p.name}: altura ${p.height}→${nextHeight}, peso ${p.weight}→${nextWeight}`,
      );

      if (!dryRun) {
        await prisma.player.update({
          where: { id: p.id },
          data: {
            ...(heightChanged && { height: nextHeight }),
            ...(weightChanged && { weight: nextWeight }),
          },
        });
      }
    }

    console.log(`Concluído: ${fixed} jogador(es) ${dryRun ? 'seriam corrigidos' : 'corrigidos'}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
