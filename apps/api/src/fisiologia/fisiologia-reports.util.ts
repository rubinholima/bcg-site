import { isCurrentSquadPlayerProfile } from '../common/player-roster.util';

type PlayerProfileRow = { player: { registrationProfile?: unknown } };

/** Mantém apenas atletas do elenco operacional atual (ativo/teste). */
export function filterReportRowsByCurrentSquad<T extends PlayerProfileRow>(rows: T[]): T[] {
  return rows.filter((row) => isCurrentSquadPlayerProfile(row.player.registrationProfile));
}

export function filterLoadSessionsByCurrentSquad<
  T extends { entries: PlayerProfileRow[] },
>(sessions: T[]): T[] {
  return sessions
    .map((session) => ({
      ...session,
      entries: filterReportRowsByCurrentSquad(session.entries),
    }))
    .filter((session) => session.entries.length > 0);
}
