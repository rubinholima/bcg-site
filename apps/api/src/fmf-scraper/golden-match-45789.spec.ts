import * as fs from 'fs';
import * as path from 'path';
import { parseFmfMatchReportText } from './fmf-match-report.parser';
import { buildOfficialEventDrafts } from './match-official-events.sync';
import { buildPlayerLinkPool } from './match-official-event.identity';
import { projectPlayerStatsFromOfficialFacts } from './fmf-player-stat.projection';
import { reconcileOfficialEvents } from './match-event-reconciliation.util';
import { reconcilePlayerRoster } from './match-roster-reconciliation.util';
import { compareOfficialEventOrder } from './match-official-event.ordering';
import {
  buildPlayerGoalExternalKey,
  buildPlayerCardExternalKey,
} from './match-official-event.external-key';

const FIXTURES = path.join(__dirname, 'fixtures');

describe('golden match 45789 (FMF real)', () => {
  const sourceText = fs.readFileSync(
    path.join(FIXTURES, 'golden-match-45789.source.txt'),
    'utf8',
  );
  const expected = JSON.parse(
    fs.readFileSync(path.join(FIXTURES, 'golden-match-45789.expected.json'), 'utf8'),
  );
  const parsed = parseFmfMatchReportText(sourceText);
  const ourTeamSide = 'away' as const;
  const emptyPool = buildPlayerLinkPool([]);

  it('parser reproduz metadados da partida', () => {
    expect(parsed.competition).toBe(expected.match.competition);
    expect(parsed.homeScore).toBe(expected.match.score.home);
    expect(parsed.awayScore).toBe(expected.match.score.away);
    expect(parsed.category).toBe(expected.match.category);
    expect(parsed.season).toBe(expected.match.season);
  });

  it('elenco away bate contagem da expectativa', () => {
    const away = parsed.roster.filter((r) => r.teamSide === 'away');
    expect(away.length).toBe(expected.bostonAwayExpectations.rosterCount);
    expect(parsed.roster.filter((r) => r.teamSide === 'home').length).toBe(
      expected.playerRoster.home.count,
    );
  });

  it('staffRoster inclui papéis reais FMF', () => {
    const roles = parsed.staffRoster.map((r) => r.roleLabel.toLowerCase());
    expect(roles).toEqual(expect.arrayContaining(['técnico', 'massagista']));
    expect(roles.some((r) => r.includes('preparador'))).toBe(true);
    expect(parsed.staffRoster.length).toBeGreaterThanOrEqual(expected.staffRoster.length - 1);
  });

  it('gols incluem acréscimo 47:00 distinto de 45:00', () => {
    const homeGoal = parsed.playerGoalEvents.find((g) => g.teamSide === 'home');
    expect(homeGoal?.clock).toBe('47:00');
    const key47 = buildPlayerGoalExternalKey({
      goalType: 'normal',
      teamSide: 'home',
      period: '2T',
      clock: '47:00',
      jerseyNumber: 3,
    });
    const key45 = buildPlayerGoalExternalKey({
      goalType: 'normal',
      teamSide: 'home',
      period: '2T',
      clock: '45:00',
      jerseyNumber: 3,
    });
    expect(key47).not.toBe(key45);
  });

  it('cartões away batem expectativa', () => {
    const awayYellow = parsed.playerCardEvents.filter(
      (c) => c.teamSide === 'away' && c.kind === 'yellow',
    );
    expect(awayYellow.length).toBe(expected.bostonAwayExpectations.yellowCards);
  });

  it('drafts oficiais away incluem substituições INT', () => {
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide,
      playerPool: emptyPool,
      staffPool: [],
    });
    expect(drafts.length).toBe(expected.bostonAwayExpectations.officialEventDrafts);
    expect(drafts.filter((d) => d.sourceClock === 'INT').length).toBe(
      expected.bostonAwayExpectations.intSubstitutions,
    );
  });

  it('reconciliação event-level matched quando persistido = fonte', () => {
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide,
      playerPool: emptyPool,
      staffPool: [],
    });
    const persisted = drafts.map((d, i) => ({
      id: `e${i}`,
      externalKey: d.externalKey,
      factType: d.factType,
      resolutionStatus: d.resolutionStatus,
      relatedResolutionStatus: d.relatedResolutionStatus ?? null,
      sourceTeamSide: d.sourceTeamSide ?? null,
      sourceJerseyNumber: d.sourceJerseyNumber ?? null,
      relatedJerseyNumber: d.relatedJerseyNumber ?? null,
      sourceName: d.sourceName ?? null,
      sourceRoleLabel: d.sourceRoleLabel ?? null,
      minute: d.minute ?? null,
      period: d.period ?? null,
      sourceClock: d.sourceClock ?? null,
      playerId: d.playerId ?? null,
      technicalStaffId: d.technicalStaffId ?? null,
      relatedPlayerId: d.relatedPlayerId ?? null,
    }));
    const result = reconcileOfficialEvents({
      parsed,
      ourTeamSide,
      playerPool: emptyPool,
      staffPool: [],
      persisted,
    });
    expect(result.summary.missing).toBe(0);
    expect(result.summary.drifted).toBe(0);
    expect(result.summary.stale).toBe(0);
  });

  it('projeção deriva gol away #9', () => {
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide,
      playerPool: emptyPool,
      staffPool: [],
    });
    const projected = projectPlayerStatsFromOfficialFacts({
      roster: parsed.roster,
      ourTeamSide,
      totalMinutes: parsed.totalMinutes,
      firstHalfMinutes: parsed.firstHalfMinutes ?? 45,
      events: drafts,
    });
    const scorer = projected.find((s) => s.jerseyNumber === 9);
    expect(scorer?.goals).toBe(1);
  });

  it('ordenação determinística por periodo → relógio → sequência', () => {
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide,
      playerPool: emptyPool,
      staffPool: [],
    });
    const sorted = [...drafts].sort(compareOfficialEventOrder);
    for (let i = 1; i < sorted.length; i++) {
      expect(compareOfficialEventOrder(sorted[i - 1]!, sorted[i]!)).toBeLessThanOrEqual(0);
    }
  });

  it('externalKey distingue dois amarelos mesmo minuto/jogador via sequência', () => {
    const k1 = buildPlayerCardExternalKey({
      kind: 'yellow',
      teamSide: 'away',
      period: '2T',
      clock: '16:00',
      jerseyNumber: 6,
      sequence: 0,
    });
    const k2 = buildPlayerCardExternalKey({
      kind: 'yellow',
      teamSide: 'away',
      period: '2T',
      clock: '16:00',
      jerseyNumber: 6,
      sequence: 1,
    });
    expect(k1).not.toBe(k2);
  });

  it('roster reconciliation marca unresolved sem cadastro', () => {
    const roster = reconcilePlayerRoster({ parsed, ourTeamSide, playerPool: emptyPool });
    expect(roster.source).toBe(roster.structured);
    expect(roster.unresolved).toBe(roster.source);
    expect(roster.resolved).toBe(0);
  });
});
