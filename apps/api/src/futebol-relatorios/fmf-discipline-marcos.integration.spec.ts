import { parseFmfMatchReportText } from '../fmf-scraper/fmf-match-report.parser';
import { buildOfficialEventDrafts } from '../fmf-scraper/match-official-events.sync';
import { buildPlayerLinkPool } from '../fmf-scraper/match-official-event.identity';
import {
  buildMatchDisciplineFromOfficialEvents,
} from './cartoes-suspensao-events.util';
import {
  buildDisciplineGrid,
  DISCIPLINE_ACCUMULATION_POLICY,
} from './cartoes-suspensao.util';

const ATHLETIC_SUMULA = `
Competição: SUB 13 - 1ª DIVISÃO 2026 Fase: DECAGONAL FINAL Rodada: 5
Jogo: ATHLETIC CLUB ESPORTES S.A.F. X BOSTON CITY FUTEBOL CLUBE SAF
Data: 31/05/2026 Hora: 15:00
Resultado do Jogo
1 x 0
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:35
Início do 2º Tempo: 15:50
Término do 2º Tempo: 16:35
Relação de Jogadores
Nº Apelido Nome Completo CBF
Nº Apelido Nome Completo CBF
3 Marcos Luiz Marcos Luiz Fernandes Silva 964959
Gols
Cartões Amarelos
32:00 2T 3 Marcos Luiz Fernandes Silva
- praticar uma falta ou ação temerária;
BOSTON CITY FUTEBOL CLUBE SAF
Cartões Vermelhos
- TER 3 Marcos Luiz Fernandes Silva
Vermelho direto.
Ao término da partida foi apresentado o 2º cartão amarelo e consequentemente o cartão vermelho.
BOSTON CITY FUTEBOL CLUBE SAF
Ocorrências / Observações
Substituições
TER = Após o Término do Jogo
`;

describe('Marcos 964959 — cadeia parser → eventos → grid', () => {
  const playerId = 'marcos-964959';
  const player = {
    id: playerId,
    name: 'Marcos Luiz Fernandes Silva',
    jerseyNumber: 3,
    position: 'ZAG',
    status: 'available',
    statusDetails: null,
    yellowCards: null,
    redCards: null,
    registrationProfile: null,
  };

  it('parser → stats → eventos oficiais → projeção disciplinar → grid', () => {
    const parsed = parseFmfMatchReportText(ATHLETIC_SUMULA);
    const marcosStat = parsed.stats.find((p) => p.cbfRegistration === '964959');
    expect(marcosStat?.yellowCards).toBe(2);
    expect(marcosStat?.redCards).toBe(0);

    const marcosCards = parsed.playerCardEvents.filter((c) => c.cbfRegistration === '964959');
    expect(marcosCards).toHaveLength(2);
    expect(marcosCards[0]).toMatchObject({ kind: 'yellow', clock: '32:00', period: '2T' });
    expect(marcosCards[1]).toMatchObject({
      kind: 'yellow',
      clock: 'TER',
      period: 'TER',
      expulsionBySecondYellow: true,
    });
    expect(parsed.playerCardEvents.some((c) => c.kind === 'red')).toBe(false);

    const pool = buildPlayerLinkPool([
      { id: playerId, name: player.name, cbfRegistration: '964959', registrationProfile: null },
    ]);
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide: 'away',
      playerPool: pool,
      staffPool: [],
    });
    const marcosDrafts = drafts.filter((d) => d.playerId === playerId);
    expect(marcosDrafts.filter((d) => d.factType === 'PLAYER_YELLOW_CARD')).toHaveLength(2);
    expect(marcosDrafts.some((d) => d.factType === 'PLAYER_RED_CARD')).toBe(false);
    expect(
      marcosDrafts.some(
        (d) =>
          d.factType === 'PLAYER_YELLOW_CARD' &&
          Array.isArray(d.sourceSections) &&
          d.sourceSections.includes('Expulsão por 2º amarelo'),
      ),
    ).toBe(true);

    const fromEvents = buildMatchDisciplineFromOfficialEvents({
      events: drafts.map((d) => ({
        factType: d.factType,
        resolutionStatus: d.resolutionStatus,
        playerId: d.playerId,
        sourceTeamSide: d.sourceTeamSide,
        sourceSections: d.sourceSections,
      })),
      homeTeam: parsed.homeTeam,
      awayTeam: parsed.awayTeam,
      clubName: 'Boston City',
      aliases: [],
    });
    const stat = fromEvents.playerStats[0];
    expect(stat?.yellowCards).toBe(2);
    expect(stat?.redCards).toBe(0);
    expect(stat?.expulsionBySecondYellow).toBe(true);

    const baseMatch = {
      homeTeam: parsed.homeTeam,
      awayTeam: parsed.awayTeam,
      homeScore: 1,
      awayScore: 0,
      occurrencesText: null,
    };
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub13',
      nextMatchDate: '2026-06-14',
      players: [player],
      matches: [
        {
          id: 'athletic',
          round: 5,
          matchDate: new Date('2026-05-31T12:00:00Z'),
          ...baseMatch,
          playerStats: fromEvents.playerStats,
        },
        {
          id: 'sa-round',
          round: 6,
          matchDate: new Date('2026-06-07T12:00:00Z'),
          ...baseMatch,
          playerStats: [],
        },
        {
          id: 'after-sa',
          round: 7,
          matchDate: new Date('2026-06-14T12:00:00Z'),
          ...baseMatch,
          playerStats: [],
        },
      ],
    });

    const row = grid.players.find((p) => p.playerId === playerId);
    expect(row?.roundCells[0]).toBe('V');
    expect(row?.roundCells[1]).toBe('SA');
    expect(row?.nextRoundCell).toBe('P');
    expect(row?.yellowCardsTotal).toBe(2);
    expect(DISCIPLINE_ACCUMULATION_POLICY.expulsionDoesNotResetYellowAccum).toBe(true);
  });
});
