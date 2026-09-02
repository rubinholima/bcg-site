/**
 * Validação local — dossiê com dados reais (FMF + departamentos).
 * Uso: pnpm exec ts-node scripts/validate-player-dossier.ts [playerId]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const playerId = process.argv[2];
  let targetId = playerId;

  if (!targetId) {
    const top = await prisma.fmfPlayerMatchStat.groupBy({
      by: ['playerId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });
    targetId = top[0]?.playerId;
  }

  if (!targetId) {
    console.log('Nenhum atleta com estatísticas FMF encontrado.');
    return;
  }

  const player = await prisma.player.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, category: true, tenantId: true },
  });

  const [fmfCount, physioSessions, coachEvals, departures] = await Promise.all([
    prisma.fmfPlayerMatchStat.count({ where: { playerId: targetId, played: true } }),
    prisma.physioSession.count({ where: { playerId: targetId } }),
    prisma.coachPlayerEvaluation.count({
      where: { playerId: targetId, status: 'concluido' },
    }),
    prisma.playerMedicalDeparture.count({ where: { playerId: targetId } }),
  ]);

  console.log(
    JSON.stringify(
      {
        player,
        fmfMatchesPlayed: fmfCount,
        physioSessions,
        coachEvaluations: coachEvals,
        medicalDepartures: departures,
        sampleUrl: `/dashboard/cadastros/jogadores/${targetId}/edit`,
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
