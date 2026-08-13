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

/** Chave normalizada de categoria — nunca faz merge entre sub13 e sub14. */
export function matchCategoryMergeKey(value: string | null | undefined): string {
  const key = (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return key || '_';
}

export function matchCategoriesEquivalent(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return matchCategoryMergeKey(a) === matchCategoryMergeKey(b);
}

export function gameOpponentDateCategoryKey(
  matchDate: Date | string,
  opponentName: string | null | undefined,
  category: string | null | undefined,
): string {
  return `${gameOpponentDateKey(matchDate, opponentName)}|${matchCategoryMergeKey(category)}`;
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
  category: string | null | undefined,
  getOpponent: (item: T) => string,
  getCategory?: (item: T) => string | null | undefined,
): string | null {
  for (const [key, item] of byKey) {
    const parts = key.split('|');
    if (parts.length < 3) continue;
    const dateKey = parts[0];
    const keyCategory = parts[parts.length - 1];
    if (!matchDatesEquivalent(`${dateKey}T12:00:00-03:00`, matchDate)) continue;
    if (!matchOpponentsEquivalent(getOpponent(item), opponentName)) continue;
    if (matchCategoryMergeKey(category) !== keyCategory) continue;
    if (getCategory && !matchCategoriesEquivalent(getCategory(item), category)) continue;
    return key;
  }
  return null;
}
