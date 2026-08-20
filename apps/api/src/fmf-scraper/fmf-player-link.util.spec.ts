import {
  buildPlayersByNormalizedName,
  resolvePlayerForFmfStat,
} from './fmf-player-link.util';

describe('resolvePlayerForFmfStat', () => {
  const players = [
    { id: 'p1', name: 'João Pedro Pimentel', cbfRegistration: '111111' },
    { id: 'p2', name: 'Samuel Fernandes', cbfRegistration: '222222' },
  ];

  const playersByCbf = new Map<string, typeof players>();
  for (const player of players) {
    playersByCbf.set(player.cbfRegistration, [player]);
  }
  const playersByName = buildPlayersByNormalizedName(players);

  it('vincula por CBF quando único', () => {
    const result = resolvePlayerForFmfStat(
      { cbfRegistration: '111111', sourceName: 'João Pedro' },
      playersByCbf,
      playersByName,
    );
    expect(result).toEqual({ ok: true, playerId: 'p1', linkedBy: 'cbf' });
  });

  it('marca duplicado de CBF como não resolvido', () => {
    const dupMap = new Map([['111111', players]]);
    const result = resolvePlayerForFmfStat(
      { cbfRegistration: '111111', sourceName: 'João Pedro' },
      dupMap,
      playersByName,
    );
    expect(result).toEqual({ ok: false, reason: 'Registro CBF duplicado no cadastro' });
  });

  it('vincula por nome exato quando CBF não existe no cadastro', () => {
    const emptyCbf = new Map<string, typeof players>();
    const result = resolvePlayerForFmfStat(
      { cbfRegistration: '999999', sourceName: 'Samuel Fernandes' },
      emptyCbf,
      playersByName,
      players,
    );
    expect(result).toEqual({ ok: true, playerId: 'p2', linkedBy: 'name' });
  });

  it('vincula subida por nome da súmula quando único no cadastro', () => {
    const sub17 = [
      { id: 'jv', name: 'João Victor Machado', cbfRegistration: '' },
      { id: 'p2', name: 'Samuel Fernandes', cbfRegistration: '222222' },
    ];
    const emptyCbf = new Map<string, typeof sub17>();
    const byName = buildPlayersByNormalizedName(sub17);
    const result = resolvePlayerForFmfStat(
      { cbfRegistration: '888888', sourceName: 'JOAO VICTOR MACHADO' },
      emptyCbf,
      byName,
      sub17,
    );
    expect(result).toEqual({ ok: true, playerId: 'jv', linkedBy: 'name' });
  });

  it('não vincula por nome parcial ou ambíguo', () => {
    const emptyCbf = new Map<string, typeof players>();
    const ambiguous = buildPlayersByNormalizedName([
      { id: 'a', name: 'João Silva' },
      { id: 'b', name: 'João Silva' },
    ]);
    const partial = resolvePlayerForFmfStat(
      { cbfRegistration: '999999', sourceName: 'Silva' },
      emptyCbf,
      ambiguous,
    );
    expect(partial).toEqual({
      ok: false,
      reason: 'Registro CBF não encontrado no cadastro do atleta',
    });
  });
});
