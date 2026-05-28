import { normalizeTeamNameKeyForMerge } from '../public/visiting-team-logo-merge.util';

/** Compara nome FMF com tenant + aliases opcionais (ex.: "AMÉRICA" ↔ "América Mineiro"). */
export function isFmfTeamMatch(
  fmfTeamName: string,
  tenantName: string,
  aliases: string[] = [],
): boolean {
  const fmKey = normalizeTeamNameKeyForMerge(fmfTeamName);
  if (!fmKey) return false;

  const candidates = [tenantName, ...aliases]
    .map((n) => normalizeTeamNameKeyForMerge(n))
    .filter(Boolean);

  for (const key of candidates) {
    if (fmKey === key) return true;
    if (fmKey.includes(key) || key.includes(fmKey)) return true;
  }
  return false;
}
