import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
} from './sports-situation.util';

export function sportsSituationFromProfile(registrationProfile: unknown): string | undefined {
  if (!registrationProfile || typeof registrationProfile !== 'object' || Array.isArray(registrationProfile)) {
    return undefined;
  }
  const sports = (registrationProfile as Record<string, unknown>).sports;
  if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return undefined;
  const situation = (sports as Record<string, unknown>).situation;
  return typeof situation === 'string' ? situation : undefined;
}

/** Elenco atual operacional: ativo ou teste — exclui desligado e emprestado. */
export function isCurrentSquadPlayerProfile(registrationProfile: unknown): boolean {
  const situation = sportsSituationFromProfile(registrationProfile);
  return !isArchivedSportsSituation(situation) && !isLoanedSportsSituation(situation);
}

export function filterCurrentSquadPlayers<T extends { registrationProfile?: unknown }>(
  players: T[],
): T[] {
  return players.filter((p) => isCurrentSquadPlayerProfile(p.registrationProfile));
}
