import {
  filterCurrentSquadPlayers,
  isCurrentSquadPlayerProfile,
} from './player-roster.util';

describe('isCurrentSquadPlayerProfile', () => {
  it('inclui ativo e teste', () => {
    expect(isCurrentSquadPlayerProfile({ sports: { situation: 'ativo' } })).toBe(true);
    expect(isCurrentSquadPlayerProfile({ sports: { situation: 'teste' } })).toBe(true);
    expect(isCurrentSquadPlayerProfile({})).toBe(true);
  });

  it('exclui desligado e emprestado', () => {
    expect(isCurrentSquadPlayerProfile({ sports: { situation: 'desligado' } })).toBe(false);
    expect(isCurrentSquadPlayerProfile({ sports: { situation: 'emprestado' } })).toBe(false);
  });
});

describe('filterCurrentSquadPlayers', () => {
  it('remove ex-atletas do elenco operacional', () => {
    const players = [
      { id: '1', registrationProfile: { sports: { situation: 'ativo' } } },
      { id: '2', registrationProfile: { sports: { situation: 'desligado' } } },
      { id: '3', registrationProfile: { sports: { situation: 'emprestado' } } },
    ];
    expect(filterCurrentSquadPlayers(players).map((p) => p.id)).toEqual(['1']);
  });
});
