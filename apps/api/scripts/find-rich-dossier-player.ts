/**
 * Encontra atleta com mais dados canônicos para validação do dossiê.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      highlights: true,
      assists: true,
      goals: true,
      bioPT: true,
      psychologicalAssessment: true,
    },
  });

  const scored: Array<Record<string, unknown>> = [];

  for (const p of players) {
    const [fmf, physio, coach, departures] = await Promise.all([
      prisma.fmfPlayerMatchStat.count({ where: { playerId: p.id, played: true } }),
      prisma.physioSession.count({ where: { playerId: p.id } }),
      prisma.coachPlayerEvaluation.count({ where: { playerId: p.id, status: 'concluido' } }),
      prisma.playerMedicalDeparture.count({ where: { playerId: p.id } }),
    ]);
    const psych = Array.isArray(p.psychologicalAssessment) ? p.psychologicalAssessment.length : 0;
    const hl = Array.isArray(p.highlights)
      ? (p.highlights as unknown[]).filter((u) => typeof u === 'string' && u.trim()).length
      : 0;
    const score =
      fmf * 3 + physio * 2 + coach * 2 + psych * 4 + hl * 3 + (p.bioPT?.trim() ? 2 : 0);
    if (score >= 8) {
      scored.push({
        id: p.id,
        name: p.name,
        category: p.category,
        fmf,
        physio,
        coach,
        psych,
        highlights: hl,
        goals: p.goals,
        assists: p.assists,
        score,
      });
    }
  }

  scored.sort((a, b) => (b.score as number) - (a.score as number));
  console.log(JSON.stringify(scored.slice(0, 10), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
