export function parseRatingValue(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function computeTeamRatingAverageFromStrings(ratings: Array<{ rating: string }>): number | null {
  const nums = ratings.map((r) => parseRatingValue(r.rating)).filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  const avg = nums.reduce((sum, n) => sum + n, 0) / nums.length;
  return Math.round(avg * 10) / 10;
}

export function computeMatchBestPlayerIds(ratings: Array<{ playerId: string; rating: string }>): string[] {
  const nums = ratings.map((r) => parseRatingValue(r.rating)).filter((v): v is number => v != null);
  if (nums.length === 0) return [];
  const max = Math.max(...nums);
  return ratings.filter((r) => parseRatingValue(r.rating) === max).map((r) => r.playerId);
}
