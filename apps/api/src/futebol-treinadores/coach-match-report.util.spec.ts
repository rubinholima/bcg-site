import {
  computeMatchBestFlags,
  computeTeamRatingAverage,
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
});
