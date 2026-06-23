/**
 * Consolida posições dos jogadores para o padrão BCG (8 posições).
 * Uso: pnpm --filter api migrate:football-positions
 *      pnpm --filter api migrate:football-positions -- --dry-run
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  getFieldPositionForMigration,
  normalizeFootballPositionCode,
} from '../src/common/football-positions.util';

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      position: true,
      fieldPositionX: true,
      fieldPositionY: true,
    },
  });

  let updated = 0;
  const changes: Array<{ name: string; from: string; to: string }> = [];

  for (const player of players) {
    const current = player.position?.trim();
    if (!current) continue;

    const migration = getFieldPositionForMigration(
      current,
      player.fieldPositionX,
      player.fieldPositionY,
    );
    const normalized = normalizeFootballPositionCode(current);
    const targetCode = migration?.code ?? normalized;
    if (!targetCode) continue;

    const positionChanged =
      current.trim().toLocaleUpperCase('pt-BR') !== targetCode;
    const fieldX = migration?.fieldPositionX ?? player.fieldPositionX;
    const fieldY = migration?.fieldPositionY ?? player.fieldPositionY;
    const fieldChanged =
      migration != null &&
      (player.fieldPositionX !== fieldX || player.fieldPositionY !== fieldY);

    if (!positionChanged && !fieldChanged) continue;

    changes.push({
      name: player.name,
      from: `${current}${player.fieldPositionX != null ? ` @${player.fieldPositionX},${player.fieldPositionY}` : ''}`,
      to: `${targetCode}${fieldChanged || player.fieldPositionX == null ? ` @${fieldX},${fieldY}` : ''}`,
    });

    if (!dryRun) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          position: targetCode,
          ...(fieldChanged || (positionChanged && player.fieldPositionX == null)
            ? { fieldPositionX: fieldX, fieldPositionY: fieldY }
            : {}),
        },
      });
    }
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned: players.length,
        updated,
        sample: changes.slice(0, 25),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
