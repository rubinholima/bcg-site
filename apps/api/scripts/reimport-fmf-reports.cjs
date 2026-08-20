/**
 * Reprocessa súmulas FMF já importadas (baixa PDF de novo + parser atual).
 * Uso: node scripts/reimport-fmf-reports.cjs <tenantId> [competitionContains]
 */
const { PrismaClient } = require('@prisma/client');
const { PDFParse } = require('pdf-parse');
const {
  parseFmfMatchReportText,
} = require('../dist/fmf-scraper/fmf-match-report.parser');
const {
  buildPlayersByCbf,
  buildPlayersByNormalizedName,
  resolvePlayerForFmfStat,
} = require('../dist/fmf-scraper/fmf-player-link.util');

const p = new PrismaClient();

function digits(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function cbfFromProfile(value) {
  if (!value || typeof value !== 'object') return '';
  return digits(value.sports?.cbf);
}

async function downloadAndParse(url) {
  const parser = new PDFParse({ url });
  try {
    const result = await parser.getText();
    return parseFmfMatchReportText(result.text);
  } finally {
    await parser.destroy();
  }
}

function isTeamMatch(team, clubName, aliases) {
  const key = String(team || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  const names = [clubName, ...aliases]
    .map((n) =>
      String(n || '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase(),
    )
    .filter(Boolean);
  return names.some((n) => key.includes(n) || n.includes(key));
}

(async () => {
  const tenantId = process.argv[2];
  const competitionContains = process.argv[3] || '';
  if (!tenantId) {
    console.error('Uso: node scripts/reimport-fmf-reports.cjs <tenantId> [competitionContains]');
    process.exit(1);
  }

  const tenant = await p.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, tradeName: true, slug: true },
  });
  if (!tenant) throw new Error('tenant não encontrado');
  const clubName = tenant.tradeName?.trim() || tenant.name;
  const aliases = [tenant.slug, 'boston city', 'boston'].filter(Boolean);

  const players = await p.player.findMany({
    where: { tenantId },
    select: { id: true, name: true, cbfRegistration: true, registrationProfile: true },
  });
  const playersByCbf = buildPlayersByCbf(players);
  const playersByName = buildPlayersByNormalizedName(players);

  const reports = await p.fmfMatchReport.findMany({
    where: {
      tenantId,
      ...(competitionContains
        ? { competition: { contains: competitionContains, mode: 'insensitive' } }
        : {}),
    },
    select: { id: true, externalMatchId: true, sourceUrl: true, competition: true, homeTeam: true, awayTeam: true },
    orderBy: { matchDate: 'asc' },
  });

  console.log(`Reimportando ${reports.length} súmula(s)…`);
  let linkedTotal = 0;
  let unresolvedTotal = 0;

  for (const report of reports) {
    if (!report.sourceUrl) {
      console.log('SKIP sem URL', report.externalMatchId);
      continue;
    }
    process.stdout.write(`→ ${report.competition} | ${report.homeTeam} x ${report.awayTeam} … `);
    const parsed = await downloadAndParse(report.sourceUrl);
    const ourSide = isTeamMatch(parsed.homeTeam, clubName, aliases)
      ? 'home'
      : isTeamMatch(parsed.awayTeam, clubName, aliases)
        ? 'away'
        : null;
    if (!ourSide) {
      console.log('lado do clube não encontrado');
      continue;
    }

    const ourStats = parsed.stats.filter((s) => s.teamSide === ourSide);
    const linked = [];
    const unresolved = [];
    for (const stat of ourStats) {
      const resolved = resolvePlayerForFmfStat(stat, playersByCbf, playersByName, players);
      if (resolved.ok) linked.push({ stat, playerId: resolved.playerId });
      else unresolved.push({ ...stat, reason: resolved.reason });
    }

    await p.fmfMatchReport.update({
      where: { id: report.id },
      data: {
        competition: parsed.competition || report.competition,
        phase: parsed.phase,
        round: parsed.round,
        category: parsed.category,
        homeTeam: parsed.homeTeam,
        awayTeam: parsed.awayTeam,
        homeScore: parsed.homeScore,
        awayScore: parsed.awayScore,
        firstHalfMinutes: parsed.firstHalfMinutes,
        secondHalfMinutes: parsed.secondHalfMinutes,
        totalMinutes: parsed.totalMinutes,
        rawParsed: parsed,
        unresolvedPlayers: unresolved,
        occurrencesText: parsed.occurrencesText,
      },
    });

    await p.fmfPlayerMatchStat.deleteMany({ where: { matchId: report.id } });
    if (linked.length) {
      await p.fmfPlayerMatchStat.createMany({
        data: linked.map(({ stat, playerId }) => ({
          matchId: report.id,
          playerId,
          cbfRegistration: stat.cbfRegistration,
          playerName: stat.sourceName,
          jerseyNumber: stat.jerseyNumber,
          starter: stat.starter,
          listed: true,
          played: stat.played,
          enteredMinute: stat.enteredMinute,
          exitedMinute: stat.exitedMinute,
          minutesPlayed: stat.minutesPlayed,
          goals: stat.goals,
          ownGoals: stat.ownGoals,
          penaltyGoals: stat.penaltyGoals,
          yellowCards: stat.yellowCards,
          redCards: stat.redCards,
        })),
      });
    }

    linkedTotal += linked.length;
    unresolvedTotal += unresolved.length;
    const joao = linked.find((l) => digits(l.stat.cbfRegistration) === '776375');
    console.log(
      `ok linked=${linked.length} unresolved=${unresolved.length}` +
        (joao ? ` ★ JOAO Y=${joao.stat.yellowCards}` : ''),
    );
  }

  console.log(`DONE linked=${linkedTotal} unresolved=${unresolvedTotal}`);
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
