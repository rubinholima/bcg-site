import {
  computeMatchBestFlags,
  computeTeamRatingAverage,
  normalizeOpponentBestPlayersInput,
  resolveOpponentBestPlayers,
} from './coach-match-report.util';

describe('coach-match-report.util', () => {
  describe('computeTeamRatingAverage', () => {
    it('returns null when no ratings', () => {
      expect(computeTeamRatingAverage([])).toBeNull();
      expect(computeTeamRatingAverage([{ rating: null }])).toBeNull();
    });

    it('computes average rounded to one decimal', () => {
      expect(
        computeTeamRatingAverage([
          { rating: 4 },
          { rating: 3.5 },
          { rating: 5 },
        ]),
      ).toBe(4.2);
    });
  });

  describe('computeMatchBestFlags', () => {
    it('marks all tied max ratings as best', () => {
      expect(
        computeMatchBestFlags([
          { rating: 4.5 },
          { rating: 5 },
          { rating: 5 },
          { rating: null },
        ]),
      ).toEqual([false, true, true, false]);
    });
  });

  describe('resolveOpponentBestPlayers', () => {
    it('prefere highlights salvos e faz fallback para campos legados', () => {
      expect(
        resolveOpponentBestPlayers({
          opponentBestJersey: 9,
          opponentBestPosition: 'Vol',
          opponentBestNotes: 'Legado',
          opponentHighlights: [
            {
              id: 'a',
              sortOrder: 0,
              jerseyNumber: 10,
              position: 'Zag',
              notes: 'Novo',
            },
          ],
        }),
      ).toEqual([
        {
          id: 'a',
          sortOrder: 0,
          jerseyNumber: 10,
          position: 'Zag',
          notes: 'Novo',
        },
      ]);

      expect(
        resolveOpponentBestPlayers({
          opponentBestJersey: 7,
          opponentBestPosition: 'Meia',
          opponentBestNotes: 'Velho',
          opponentHighlights: [],
        }),
      ).toEqual([
        {
          jerseyNumber: 7,
          position: 'Meia',
          notes: 'Velho',
          sortOrder: 0,
        },
      ]);
    });
  });

  describe('normalizeOpponentBestPlayersInput', () => {
    it('normaliza lista de adversários e ignora linhas vazias', () => {
      expect(
        normalizeOpponentBestPlayersInput({
          opponentBestPlayers: [
            { jerseyNumber: 11, position: 'Atacante', notes: 'Finalizador' },
            { jerseyNumber: null, position: null, notes: null },
          ],
        }),
      ).toEqual([
        {
          sortOrder: 0,
          jerseyNumber: 11,
          position: 'Atacante',
          notes: 'Finalizador',
        },
      ]);
    });
  });
});
