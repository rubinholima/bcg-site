/**
 * Validação local V3 — dossiê com dados reais por seção.
 * Uso: pnpm exec ts-node scripts/validate-player-dossier.ts [playerId]
 */
import { PrismaClient } from '@prisma/client';
import {
  buildHighlightItems,
  buildSportingStory,
  normalizePsychologyRecords,
} from '../src/cadastros/player-dossier-content.util';

const prisma = new PrismaClient();

async function pickRichestPlayer(): Promise<string | undefined> {
  const players = await prisma.player.findMany({
    select: { id: true, psychologicalAssessment: true, highlights: true, bioPT: true },
  });
  let best = { id: '', score: 0 };
  for (const p of players) {
    const [fmf, physio, coach] = await Promise.all([
      prisma.fmfPlayerMatchStat.count({ where: { playerId: p.id, played: true } }),
      prisma.physioSession.count({ where: { playerId: p.id } }),
      prisma.coachPlayerEvaluation.count({ where: { playerId: p.id, status: 'concluido' } }),
    ]);
    const psych = Array.isArray(p.psychologicalAssessment) ? p.psychologicalAssessment.length : 0;
    const hl = Array.isArray(p.highlights)
      ? (p.highlights as unknown[]).filter((u) => typeof u === 'string' && u.trim()).length
      : 0;
    const score =
      fmf * 3 + physio * 2 + coach * 2 + psych * 4 + hl * 3 + (p.bioPT?.trim() ? 2 : 0);
    if (score > best.score) best = { id: p.id, score };
  }
  return best.id || undefined;
}

async function main() {
  const playerId = process.argv[2] ?? (await pickRichestPlayer());
  if (!playerId) {
    console.log('Nenhum atleta encontrado.');
    return;
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!player) {
    console.log('Atleta não encontrado.');
    return;
  }

  const [fmfStats, physioSessions, coachEvals, psychRecords] = await Promise.all([
    prisma.fmfPlayerMatchStat.findMany({
      where: { playerId, played: true },
      include: { match: { select: { season: true, competition: true, matchDate: true } } },
    }),
    prisma.physioSession.findMany({ where: { playerId }, take: 25 }),
    prisma.coachPlayerEvaluation.findMany({
      where: { playerId, status: 'concluido' },
    }),
    Promise.resolve(normalizePsychologyRecords(player.psychologicalAssessment)),
  ]);

  const highlights = buildHighlightItems({
    highlights: player.highlights,
    images: player.images,
  });

  const seasonHistory = Array.isArray(player.seasonHistory) ? player.seasonHistory : [];
  const previousTeams = Array.isArray(player.previousTeams)
    ? (player.previousTeams as string[]).filter(Boolean)
    : [];

  const sportingStory = buildSportingStory({
    previousTeams,
    seasonHistory,
    subidaEvents: [],
    movements: [],
    currentTeam: player.currentTeam,
    category: player.category,
  });

  const fmfTotals = {
    matchesPlayed: fmfStats.length,
    starts: fmfStats.filter((r) => r.starter).length,
    minutesPlayed: fmfStats.reduce((s, r) => s + r.minutesPlayed, 0),
    goals: fmfStats.reduce((s, r) => s + r.goals, 0),
    yellowCards: fmfStats.reduce((s, r) => s + r.yellowCards, 0),
    redCards: fmfStats.reduce((s, r) => s + r.redCards, 0),
  };

  console.log(
    JSON.stringify(
      {
        athleteValidated: {
          id: player.id,
          name: player.name,
          category: player.category,
        },
        realDataUsed: {
          cover: { name: player.name, photo: !!player.photoUrl, bio: !!player.bioPT?.trim() },
          snapshotKpis: {
            games: fmfTotals.matchesPlayed,
            starts: fmfTotals.starts,
            minutes: fmfTotals.minutesPlayed,
            goals: fmfTotals.goals ?? player.goals,
            assists: player.assists,
          },
          sportingStoryEvents: sportingStory.length,
          fmfMatches: fmfStats.length,
          fmfTotals,
          highlights: highlights.length,
          coachEvaluations: coachEvals.length,
          diretoriaEvaluations: Array.isArray(player.evaluations) ? player.evaluations.length : 0,
          performanceAnalysis: !!player.performanceAnalysis?.trim(),
        },
        psychologyContent: {
          records: psychRecords.length,
          sampleSummary: psychRecords[0]?.summary?.slice(0, 140) ?? null,
          observationsCount: psychRecords[0]?.observations.length ?? 0,
        },
        otherDepartmentContent: {
          physioSessions: physioSessions.length,
        },
        pages: [
          'Capa hero + KPI strip',
          'Perfil executivo + Trajetória esportiva',
          'Estatísticas FMF + Destaques (se houver URLs)',
          'Desempenho + Timeline',
          'Seções departamentais (gerente/diretoria + módulo)',
        ],
        localUrl: `http://localhost:3000/dashboard/cadastros/jogadores/${playerId}/edit`,
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
