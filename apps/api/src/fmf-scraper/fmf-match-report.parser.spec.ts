import { extractFmfRosterFullName, parseFmfMatchReportText } from './fmf-match-report.parser';

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
});
