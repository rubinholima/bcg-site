export function computeTeamRatingAverage(ratings: Array<{ rating: number | null }>): number | null {
  const nums = ratings
    .map((r) => r.rating)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  const avg = nums.reduce((sum, n) => sum + n, 0) / nums.length;
  return Math.round(avg * 10) / 10;
}

export function computeMatchBestFlags(ratings: Array<{ rating: number | null }>): boolean[] {
  const nums = ratings
    .map((r) => r.rating)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return ratings.map(() => false);
  const max = Math.max(...nums);
  return ratings.map((r) => r.rating != null && r.rating === max);
}

export function enrichCoachMatchReport<
  T extends {
    playerRatings: Array<{
      rating: number | null;
      isMatchBest?: boolean;
      player?: { id: string; name: string; jerseyNumber: number | null };
      playerId?: string;
    }>;
  },
>(row: T) {
  const teamRatingAverage = computeTeamRatingAverage(row.playerRatings);
  const matchBestPlayerIds = row.playerRatings
    .filter((r) => r.isMatchBest)
    .map((r) => r.playerId ?? r.player?.id)
    .filter((id): id is string => !!id);

  return {
    ...row,
    teamRatingAverage,
    matchBestPlayerIds,
  };
}
