import { dateKeyInBrazil } from './brazil-time.util';
import { softNormalizeTeamNameKey } from '../public/visiting-team-logo-merge.util';

/** Chave de adversário para agrupar o mesmo jogo (FMF + logística + hub Jogos). */
export function matchOpponentMergeKey(name: string | null | undefined): string {
  return softNormalizeTeamNameKey(name ?? '');
}

export function matchOpponentsEquivalent(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = matchOpponentMergeKey(a);
  const kb = matchOpponentMergeKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const minLen = 4;
  if (ka.length >= minLen && kb.length >= minLen) {
    if (ka.includes(kb) || kb.includes(ka)) return true;
  }
  return false;
}

export function gameOpponentDateKey(
  matchDate: Date | string,
  opponentName: string | null | undefined,
): string {
  return `${dateKeyInBrazil(matchDate)}|${matchOpponentMergeKey(opponentName)}`;
}

/** Mesmo dia (Brasília) ou dia adjacente — cobre drift de timezone em viagens. */
export function matchDatesEquivalent(a: Date | string, b: Date | string): boolean {
  const da = dateKeyInBrazil(a);
  const db = dateKeyInBrazil(b);
  if (da === db) return true;
  const dayMs = 86400000;
  const diff = Math.abs(
    new Date(`${da}T12:00:00-03:00`).getTime() - new Date(`${db}T12:00:00-03:00`).getTime(),
  );
  return diff <= dayMs;
}

export function findGameMergeKeyInMap<T>(
  byKey: Map<string, T>,
  matchDate: Date | string,
  opponentName: string | null | undefined,
  getOpponent: (item: T) => string,
): string | null {
  for (const [key, item] of byKey) {
    const [dateKey] = key.split('|');
    if (!matchDatesEquivalent(`${dateKey}T12:00:00-03:00`, matchDate)) continue;
    if (matchOpponentsEquivalent(getOpponent(item), opponentName)) return key;
  }
  return null;
}
