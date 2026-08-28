import { reconcileOfficialEvents } from './match-event-reconciliation.util';
import type { MatchOfficialEventDraft } from './match-official-event.types';
import { parseFmfMatchReportText } from './fmf-match-report.parser';
import { buildOfficialEventDrafts } from './match-official-events.sync';
import { buildPlayerLinkPool } from './match-official-event.identity';

describe('match-event-reconciliation.util', () => {
  const minimalText = `
Competição: TESTE Fase: X Rodada: 1
Jogo: MANDANTE X VISITANTE SAF
Data: 01/08/2026 Hora: 15:00
Resultado do Jogo
0 x 0
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:45
Início do 2º Tempo: 16:00
Término do 2º Tempo: 16:45
Relação de Jogadores
Nº Apelido Nome Completo CBF
10 Atleta Atleta Um 111111
Nº Apelido Nome Completo CBF
10 Atleta Dois Atleta Dois 222222
Árbitro Principal
Gols
Cartões Amarelos
32:00 2T 10 Atleta Um - falta; VISITANTE SAF
Cartões Vermelhos
Substituições
`;

  it('detecta drift quando persistido tem jogador errado', () => {
    const parsed = parseFmfMatchReportText(minimalText);
    const pool = buildPlayerLinkPool([]);
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide: 'away',
      playerPool: pool,
      staffPool: [],
    });
    const card = drafts.find((d) => d.factType === 'PLAYER_YELLOW_CARD')!;
    const wrongPersisted = {
      id: '1',
      externalKey: card.externalKey,
      factType: card.factType,
      resolutionStatus: 'unresolved',
      sourceTeamSide: 'home',
      sourceJerseyNumber: 99,
      sourceName: 'Outro',
      minute: 32,
      period: '2T',
      sourceClock: '32:00',
    };
    const result = reconcileOfficialEvents({
      parsed,
      ourTeamSide: 'away',
      playerPool: pool,
      staffPool: [],
      persisted: [wrongPersisted],
    });
    expect(result.summary.drifted).toBe(1);
    expect(result.summary.matched).toBe(0);
  });

  it('detecta missing e stale', () => {
    const parsed = parseFmfMatchReportText(minimalText);
    const pool = buildPlayerLinkPool([]);
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide: 'away',
      playerPool: pool,
      staffPool: [],
    });
    const resultMissing = reconcileOfficialEvents({
      parsed,
      ourTeamSide: 'away',
      playerPool: pool,
      staffPool: [],
      persisted: [],
    });
    expect(resultMissing.summary.missing).toBe(drafts.length);

    const stale = {
      id: 'stale',
      externalKey: 'fmf:PLAYER_YELLOW_CARD:away:2T:99:00:10:0',
      factType: 'PLAYER_YELLOW_CARD',
      resolutionStatus: 'unresolved',
    };
    const resultStale = reconcileOfficialEvents({
      parsed,
      ourTeamSide: 'away',
      playerPool: pool,
      staffPool: [],
      persisted: [stale],
    });
    expect(resultStale.summary.stale).toBe(1);
  });
});

describe('contagem igual não prova fidelidade', () => {
  it('dois cartões persistidos com mesmo jogador = drift', () => {
    const parsed = parseFmfMatchReportText(`
Competição: T Fase: X Rodada: 1
Jogo: MANDANTE X BOSTON CITY FUTEBOL CLUBE SAF
Data: 01/08/2026 Hora: 15:00
Resultado do Jogo
0 x 0
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:45
Início do 2º Tempo: 16:00
Término do 2º Tempo: 16:45
Relação de Jogadores
Nº Apelido Nome Completo CBF
1 Home Home Um 100
Nº Apelido Nome Completo CBF
10 Joao Joao Silva 111
11 Pedro Pedro Santos 222
Árbitro Principal
Cartões Amarelos
32:00 2T 10 Joao Silva
- falta;
BOSTON CITY FUTEBOL CLUBE SAF
35:00 2T 11 Pedro Santos
- falta;
BOSTON CITY FUTEBOL CLUBE SAF
Cartões Vermelhos
Substituições
`);
    const pool = buildPlayerLinkPool([]);
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide: 'away',
      playerPool: pool,
      staffPool: [],
    });
    expect(drafts.filter((d) => d.factType === 'PLAYER_YELLOW_CARD')).toHaveLength(2);
    const first = drafts[0]!;
    const persisted = drafts.map((d, i) => ({
      id: String(i),
      externalKey: d.externalKey,
      factType: d.factType,
      resolutionStatus: 'unresolved',
      sourceTeamSide: 'away',
      sourceJerseyNumber: 10,
      sourceName: 'Joao',
      minute: i === 0 ? 32 : 35,
      period: '2T',
      sourceClock: i === 0 ? '32:00' : '35:00',
    }));
    persisted[1] = { ...persisted[1]!, sourceName: 'Joao Silva', sourceJerseyNumber: 10 };
    const result = reconcileOfficialEvents({
      parsed,
      ourTeamSide: 'away',
      playerPool: pool,
      staffPool: [],
      persisted,
    });
    expect(result.summary.matched).toBe(0);
    expect(result.summary.unresolved).toBe(1);
    expect(result.summary.drifted).toBe(1);
  });
});
