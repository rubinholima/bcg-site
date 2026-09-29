export function isPlayerMatchStandout(row: {
  isMatchBest: boolean;
  isStaffStandout?: boolean;
}): boolean {
  return row.isMatchBest || !!row.isStaffStandout;
}

export function resolveSeasonFromMatchDate(matchDate: Date | null | undefined, fmfSeason?: number | null): number {
  if (fmfSeason != null && Number.isFinite(fmfSeason)) return Math.trunc(fmfSeason);
  if (!matchDate) return new Date().getFullYear();
  return matchDate.getUTCFullYear();
}

export function normalizeIdentityKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
