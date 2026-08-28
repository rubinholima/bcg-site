/**
 * Amostra real FMF (3–5 PDFs públicos) + shadow legacy vs eventos.
 * Uso: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/phase3-closure-sample-shadow.ts
 */
import { PDFParse } from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';
import { parseFmfMatchReportText } from '../src/fmf-scraper/fmf-match-report.parser';
import { buildOfficialEventDrafts } from '../src/fmf-scraper/match-official-events.sync';
import { buildPlayerLinkPool } from '../src/fmf-scraper/match-official-event.identity';
import { projectPlayerStatsFromOfficialFacts } from '../src/fmf-scraper/fmf-player-stat.projection';
import { buildShadowComparison } from '../src/fmf-scraper/match-shadow-comparison.util';
import { parseStaffCardsForMatch } from '../src/futebol-relatorios/fmf-staff-cards.util';

const CANDIDATES = [
  { id: '45789', format: 'F10', note: 'Sub-20 Decagonal — golden' },
  { id: '44855', format: 'F10', note: 'ID referenciado no schema' },
  { id: '45790', format: 'F10', note: 'Rodada adjacente' },
  { id: '45788', format: 'F10', note: 'Rodada adjacente' },
  { id: '46000', format: 'F10', note: 'Probe variedade' },
];

async function fetchPdfText(id: string, format: string): Promise<string | null> {
  const url = `https://sge.fmf.com.br/sumulas/Sumula_Jogo_${id}_${format}.pdf`;
  try {
    const parser = new PDFParse({ url });
    const r = await parser.getText();
    await parser.destroy();
    return r.text;
  } catch {
    return null;
  }
}

async function main() {
  const fixtureDir = path.join(__dirname, '../src/fmf-scraper/fixtures/samples');
  fs.mkdirSync(fixtureDir, { recursive: true });

  const results: unknown[] = [];

  for (const c of CANDIDATES) {
    let text = await fetchPdfText(c.id, c.format);
    if (!text || text.length < 500) {
      results.push({ id: c.id, status: 'unavailable', note: c.note });
      continue;
    }

    fs.writeFileSync(path.join(fixtureDir, `sample-${c.id}.source.txt`), text);
    const parsed = parseFmfMatchReportText(text);
    const ourSide: 'home' | 'away' = parsed.awayTeam.toUpperCase().includes('BOSTON') ? 'away' : 'home';
    const pool = buildPlayerLinkPool([]);
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide: ourSide,
      playerPool: pool,
      staffPool: [],
    });
    const projected = projectPlayerStatsFromOfficialFacts({
      roster: parsed.roster,
      ourTeamSide: ourSide,
      totalMinutes: parsed.totalMinutes,
      firstHalfMinutes: parsed.firstHalfMinutes ?? 45,
      events: drafts,
    });
    const legacyStats = parsed.stats.filter((s) => s.teamSide === ourSide);
    const phase1Staff = parseStaffCardsForMatch(
      {
        rawParsed: parsed,
        occurrencesText: parsed.occurrencesText,
        clubFilter: {
          homeTeam: parsed.homeTeam,
          awayTeam: parsed.awayTeam,
          clubName: ourSide === 'away' ? parsed.awayTeam : parsed.homeTeam,
          aliases: ['BOSTON'],
        },
      },
      [],
    );
    const shadow = buildShadowComparison({
      projectedStats: projected,
      persistedStats: legacyStats.map((s) => ({
        cbfRegistration: s.cbfRegistration,
        jerseyNumber: s.jerseyNumber,
        starter: s.starter,
        played: s.played,
        minutesPlayed: s.minutesPlayed,
        goals: s.goals,
        ownGoals: s.ownGoals,
        penaltyGoals: s.penaltyGoals,
        yellowCards: s.yellowCards,
        redCards: s.redCards,
      })),
      eventStaffYellow: drafts.filter((d) => d.factType === 'STAFF_YELLOW_CARD').length,
      eventStaffRed: drafts.filter((d) => d.factType === 'STAFF_RED_CARD').length,
      phase1StaffYellow: phase1Staff.reduce((n, r) => n + r.yellowCards, 0),
      phase1StaffRed: phase1Staff.reduce((n, r) => n + r.redCards, 0),
    });

    const intSubs = parsed.substitutionEvents.filter((s) => s.sourceTimingMarker === 'INT').length;

    results.push({
      id: c.id,
      status: 'parsed',
      note: c.note,
      category: parsed.category,
      competition: parsed.competition,
      round: parsed.round,
      score: `${parsed.homeScore}x${parsed.awayScore}`,
      ourSide,
      roster: parsed.roster.filter((r) => r.teamSide === ourSide).length,
      goals: parsed.playerGoalEvents.filter((g) => g.teamSide === ourSide).length,
      yellow: parsed.playerCardEvents.filter((x) => x.teamSide === ourSide && x.kind === 'yellow').length,
      subs: parsed.substitutionEvents.filter((s) => s.teamSide === ourSide).length,
      intSubs,
      eventDrafts: drafts.length,
      shadowDrifts: shadow.playerStatDrifts.map((d) => ({
        ...d,
        classification: d.classification,
      })),
      staffShadow: shadow.staffCardDrifts,
    });
  }

  const parsedCount = results.filter((r) => (r as { status: string }).status === 'parsed').length;
  console.log(JSON.stringify({ parsedCount, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
