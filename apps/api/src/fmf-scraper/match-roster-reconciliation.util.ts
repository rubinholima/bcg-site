import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import {
  resolvePlayerFromRosterEntry,
  type PlayerLinkPool,
} from './match-official-event.identity';
import type { RosterReconciliationOutcome, RosterReconciliationRow } from './match-official-event.types';

function playerRosterKey(side: 'home' | 'away', jersey: number): string {
  return `player:${side}:${jersey}`;
}

function staffRosterKey(side: 'home' | 'away', role: string, name: string): string {
  return `staff:${side}:${role}:${name}`.toLowerCase();
}

export function reconcilePlayerRoster(input: {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
  playerPool: PlayerLinkPool;
}): {
  rows: RosterReconciliationRow[];
  source: number;
  structured: number;
  resolved: number;
  unresolved: number;
  ambiguous: number;
} {
  const side = input.ourTeamSide;
  const sourceEntries = input.parsed.roster.filter((r) => r.teamSide === side);
  const rows: RosterReconciliationRow[] = [];
  let resolved = 0;
  let unresolved = 0;
  let ambiguous = 0;

  const jerseySeen = new Map<number, number>();
  for (const entry of sourceEntries) {
    jerseySeen.set(entry.jerseyNumber, (jerseySeen.get(entry.jerseyNumber) ?? 0) + 1);
  }

  for (const entry of sourceEntries) {
    const identity = resolvePlayerFromRosterEntry(entry, input.playerPool);
    let outcome: RosterReconciliationOutcome = 'matched';
    let explain: string | undefined;

    if ((jerseySeen.get(entry.jerseyNumber) ?? 0) > 1) {
      outcome = 'duplicate';
      explain = `Camisa ${entry.jerseyNumber} duplicada na relação oficial`;
    } else if (identity.resolutionStatus === 'ambiguous') {
      outcome = 'ambiguous';
      ambiguous += 1;
      explain = `Atleta ${entry.sourceName} (CBF ${entry.cbfRegistration}) com identidade ambígua no cadastro`;
    } else if (identity.resolutionStatus === 'unresolved') {
      outcome = 'unresolved';
      unresolved += 1;
      explain = `Atleta ${entry.sourceName} (CBF ${entry.cbfRegistration}) sem vínculo cadastral`;
    } else {
      resolved += 1;
    }

    rows.push({
      key: playerRosterKey(entry.teamSide, entry.jerseyNumber),
      side: entry.teamSide,
      jerseyNumber: entry.jerseyNumber,
      cbfRegistration: entry.cbfRegistration,
      sourceName: entry.sourceName,
      outcome,
      explain,
    });
  }

  return {
    rows,
    source: sourceEntries.length,
    structured: sourceEntries.length,
    resolved,
    unresolved,
    ambiguous,
  };
}

export function reconcileStaffRoster(input: {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
}): {
  rows: RosterReconciliationRow[];
  source: number;
  structured: number;
} {
  const side = input.ourTeamSide;
  const sourceEntries = input.parsed.staffRoster.filter((r) => r.teamSide === side);
  const rows: RosterReconciliationRow[] = sourceEntries.map((entry) => ({
    key: staffRosterKey(entry.teamSide, entry.roleLabel, entry.name),
    side: entry.teamSide,
    roleLabel: entry.roleLabel,
    sourceName: entry.name,
    outcome: 'matched' as RosterReconciliationOutcome,
  }));

  return {
    rows,
    source: sourceEntries.length,
    structured: sourceEntries.length,
  };
}

export function buildRosterMessages(player: ReturnType<typeof reconcilePlayerRoster>): string[] {
  const messages: string[] = [];
  if (player.unresolved > 0) {
    messages.push(
      `${player.unresolved} atleta(s) da súmula não possui(em) vínculo cadastral (${player.resolved}/${player.source} resolvidos).`,
    );
  }
  if (player.ambiguous > 0) {
    messages.push(`${player.ambiguous} atleta(s) com identidade ambígua no cadastro.`);
  }
  const dupes = player.rows.filter((r) => r.outcome === 'duplicate');
  if (dupes.length > 0) {
    messages.push(`${dupes.length} entrada(s) duplicada(s) na relação oficial.`);
  }
  return messages;
}
