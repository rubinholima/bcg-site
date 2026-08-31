import { filterCurrentSquadPlayers } from '../common/player-roster.util';
import {
  filterLoadSessionsByCurrentSquad,
  filterReportRowsByCurrentSquad,
} from './fisiologia-reports.util';

const profile = (situation: string) => ({ sports: { situation } });

describe('fisiologia-reports.util — elenco operacional atual', () => {
  const rows = [
    { id: 'a1', player: { registrationProfile: profile('ativo') } },
    { id: 't1', player: { registrationProfile: profile('teste') } },
    { id: 'd1', player: { registrationProfile: profile('desligado') } },
    { id: 'l1', player: { registrationProfile: profile('emprestado') } },
  ];

  it('inclui ativo no relatório', () => {
    expect(filterReportRowsByCurrentSquad(rows).some((r) => r.id === 'a1')).toBe(true);
  });

  it('inclui teste no relatório', () => {
    expect(filterReportRowsByCurrentSquad(rows).some((r) => r.id === 't1')).toBe(true);
  });

  it('exclui desligado do relatório', () => {
    expect(filterReportRowsByCurrentSquad(rows).some((r) => r.id === 'd1')).toBe(false);
  });

  it('exclui emprestado do relatório', () => {
    expect(filterReportRowsByCurrentSquad(rows).some((r) => r.id === 'l1')).toBe(false);
  });

  it('filtra entries de carga e remove sessões vazias', () => {
    const sessions = [
      {
        id: 's1',
        entries: [
          { player: { registrationProfile: profile('ativo') } },
          { player: { registrationProfile: profile('desligado') } },
        ],
      },
      {
        id: 's2',
        entries: [{ player: { registrationProfile: profile('emprestado') } }],
      },
    ];
    const filtered = filterLoadSessionsByCurrentSquad(sessions);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('s1');
    expect(filtered[0]?.entries).toHaveLength(1);
  });

  it('não altera dados históricos — apenas filtra linhas de saída', () => {
    const source = [...rows];
    filterReportRowsByCurrentSquad(source);
    expect(source).toHaveLength(4);
  });

  it('categoryRoster continua usando filterCurrentSquadPlayers (lançar carga)', () => {
    const roster = [
      { id: '1', registrationProfile: profile('ativo') },
      { id: '2', registrationProfile: profile('desligado') },
    ];
    expect(filterCurrentSquadPlayers(roster).map((p) => p.id)).toEqual(['1']);
  });
});
