import {
  extractFmfRosterFullName,
  joinWrappedFmfRosterLines,
  parseFmfMatchReportText,
  parseStaffCardEventsFromTimedRows,
} from './fmf-match-report.parser';

describe('extractFmfRosterFullName', () => {
  it('remove apelido duplicado igual ao nome completo', () => {
    expect(
      extractFmfRosterFullName(
        'Joao Victor Machado De Oliveira Joao Victor Machado De Oliveira',
      ),
    ).toBe('Joao Victor Machado De Oliveira');
  });

  it('prioriza nome completo quando apelido é mais curto', () => {
    expect(extractFmfRosterFullName('Lucas Canella Lucas Azevedo Canella')).toBe(
      'Lucas Azevedo Canella',
    );
  });

  it('mantém nome único sem duplicar', () => {
    expect(extractFmfRosterFullName('Kayo Victor Fonseca Santos')).toBe(
      'Kayo Victor Fonseca Santos',
    );
  });
});

describe('joinWrappedFmfRosterLines', () => {
  it('junta nome quebrado no meio da linha do PDF', () => {
    const joined = joinWrappedFmfRosterLines([
      '3 Lucas Canella Lucas Azevedo Canella 753614',
      '4 Joao Victor Machado',
      'De Oliveira Joao Victor Machado De Oliveira 776375',
      '5 Guilherme De Sa Guilherme De Sa Mendonca 750398',
    ]);
    expect(joined).toEqual([
      '3 Lucas Canella Lucas Azevedo Canella 753614',
      '4 Joao Victor Machado De Oliveira Joao Victor Machado De Oliveira 776375',
      '5 Guilherme De Sa Guilherme De Sa Mendonca 750398',
    ]);
  });
});

describe('parseFmfMatchReportText roster names', () => {
  it('extrai nome completo e CBF da relação', () => {
    const text = `
Competição: Campeonato Mineiro Sub-20 Fase: 1ª Fase Rodada: 1
Jogo: BOSTON CITY FUTEBOL CLUBE SAF X NACIONAL ATLETICO CLUBE
Data: 10/08/2026 Hora: 15:00
Resultado do Jogo
1 x 0
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:45
Início do 2º Tempo: 16:00
Término do 2º Tempo: 16:45

Relação de Jogadores
Nº Apelido Nome Completo CBF
4 Joao Victor Machado De Oliveira Joao Victor Machado De Oliveira 776375
5 Guilherme De Sa Guilherme De Sa Mendonca 750398
Árbitro Principal
Gols
Cartões Amarelos
42:00 2T 4 Joao Victor Machado De Oliveira praticar uma falta ou ação temerária; BOSTON CITY FUTEBOL CLUBE SAF
Cartões Vermelhos
Ocorrências / Observações
Substituições
ANT = Antes do Início
`;
    const parsed = parseFmfMatchReportText(text);
    const joao = parsed.stats.find((p) => p.cbfRegistration === '776375');
    expect(joao?.sourceName).toBe('Joao Victor Machado De Oliveira');
    expect(joao?.yellowCards).toBe(1);
    expect(joao?.jerseyNumber).toBe(4);
  });

  it('não perde atleta quando o PDF quebra o nome em duas linhas', () => {
    const text = `
Competição: SUB 20 - 1ª DIVISÃO - 2026 Fase: DECAGONAL FINAL Rodada: 12
Jogo: NACIONAL ATLETICO CLUBE - MURIAE X BOSTON CITY FUTEBOL CLUBE SAF
Data: 01/08/2026 Hora: 15:00
Resultado do Jogo
1 x 1
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:45
Início do 2º Tempo: 16:00
Término do 2º Tempo: 16:45

Relação de Jogadores
Nº Apelido Nome Completo CBF
1 Dida Guilherme Felipe De O. Duarte 714855
Nº Apelido Nome Completo CBF
1 Wallace Luan Wallace Luan Furtado Da Silva 753419
3 Lucas Canella Lucas Azevedo Canella 753614
4 Joao Victor Machado
De Oliveira Joao Victor Machado De Oliveira 776375
5 Guilherme De Sa Guilherme De Sa Mendonca 750398
6 Higor Higor Vinicius Pinheiro 793228
Árbitro Principal
Gols
Cartões Amarelos
42:00 2T 4 Joao Victor Machado De Oliveira
- praticar uma falta ou ação temerária;
BOSTON CITY FUTEBOL CLUBE SAF
16:00 2T 6 Higor Vinicius Pinheiro
- retardar o reinício do jogo;
BOSTON CITY FUTEBOL CLUBE SAF
Cartões Vermelhos
Ocorrências / Observações
Substituições
ANT = Antes do Início
`;
    const parsed = parseFmfMatchReportText(text);
    const joao = parsed.stats.find((p) => p.cbfRegistration === '776375');
    expect(joao).toBeTruthy();
    expect(joao?.jerseyNumber).toBe(4);
    expect(joao?.teamSide).toBe('away');
    expect(joao?.sourceName).toBe('Joao Victor Machado De Oliveira');
    expect(joao?.yellowCards).toBe(1);
  });

  it('extrai cartão amarelo do técnico na seção Cartões Amarelos', () => {
    const events = parseStaffCardEventsFromTimedRows(
      [
        '20:00 2T Técnico Adriano Dos Santos Almeida - discordar das decisões da arbitragem com palavras ou ações; NACIONAL',
        '42:00 2T 4 Joao Victor Machado De Oliveira - falta temerária; BOSTON',
      ],
      'yellow',
      'BOSTON CITY FUTEBOL CLUBE SAF',
      'NACIONAL',
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.roleLabel).toBe('Técnico');
    expect(events[0]?.name).toBe('Adriano Dos Santos Almeida');
    expect(events[0]?.kind).toBe('yellow');
    expect(events[0]?.teamSide).toBe('away');
  });
});
