import type { FmfReportRosterPlayer } from './fmf-match-report.parser';
import type { MatchOfficialEventDraft } from './match-official-event.types';

export type ProjectedPlayerStat = {
  rosterKey: string;
  cbfRegistration: string;
  sourceName: string;
  jerseyNumber: number;
  teamSide: 'home' | 'away';
  starter: boolean;
  listed: boolean;
  played: boolean;
  enteredMinute: number | null;
  exitedMinute: number | null;
  minutesPlayed: number;
  goals: number;
  ownGoals: number;
  penaltyGoals: number;
  yellowCards: number;
  redCards: number;
  playerId: string | null;
};

type TimelineEvent = {
  absoluteMinute: number;
  kind: 'sub_in' | 'sub_out' | 'yellow' | 'red' | 'second_yellow';
  jerseyNumber: number;
};

function rosterKey(side: 'home' | 'away', jersey: number): string {
  return `${side}:${jersey}`;
}

function eventAbsoluteMinute(
  period: string,
  clockMinute: number,
  firstHalfMinutes: number,
): number {
  return period.toUpperCase() === '2T' ? firstHalfMinutes + clockMinute : clockMinute;
}

/** Deriva projeção agregada a partir do roster oficial + eventos normalizados. */
export function projectPlayerStatsFromOfficialFacts(input: {
  roster: FmfReportRosterPlayer[];
  ourTeamSide: 'home' | 'away';
  totalMinutes: number;
  firstHalfMinutes: number;
  events: Array<
    Pick<
      MatchOfficialEventDraft,
      | 'factType'
      | 'sourceJerseyNumber'
      | 'relatedJerseyNumber'
      | 'minute'
      | 'period'
      | 'goalType'
      | 'playerId'
      | 'sourceTeamSide'
    > & { clockMinute?: number | null }
  >;
  playerIdByJersey?: Map<string, string | null>;
}): ProjectedPlayerStat[] {
  const { roster, ourTeamSide, totalMinutes, firstHalfMinutes } = input;
  const ourRoster = roster.filter((r) => r.teamSide === ourTeamSide);
  const byKey = new Map<string, ProjectedPlayerStat>();

  for (const player of ourRoster) {
    const key = rosterKey(player.teamSide, player.jerseyNumber);
    byKey.set(key, {
      rosterKey: key,
      cbfRegistration: player.cbfRegistration,
      sourceName: player.sourceName,
      jerseyNumber: player.jerseyNumber,
      teamSide: player.teamSide,
      starter: player.starter,
      listed: true,
      played: player.starter,
      enteredMinute: player.starter ? 0 : null,
      exitedMinute: null,
      minutesPlayed: 0,
      goals: 0,
      ownGoals: 0,
      penaltyGoals: 0,
      yellowCards: 0,
      redCards: 0,
      playerId: input.playerIdByJersey?.get(key) ?? null,
    });
  }

  const timeline: TimelineEvent[] = [];

  for (const ev of input.events) {
    if (ev.sourceTeamSide && ev.sourceTeamSide !== ourTeamSide) continue;
    const jersey = ev.sourceJerseyNumber;
    if (jersey == null) continue;
    const key = rosterKey(ourTeamSide, jersey);
    const row = byKey.get(key);
    if (!row) continue;

    if (ev.factType === 'PLAYER_GOAL') row.goals += 1;
    if (ev.factType === 'PLAYER_PENALTY_GOAL') {
      row.goals += 1;
      row.penaltyGoals += 1;
    }
    if (ev.factType === 'PLAYER_OWN_GOAL') row.ownGoals += 1;
    if (ev.factType === 'PLAYER_YELLOW_CARD') {
      row.yellowCards += 1;
      const abs =
        ev.minute ??
        (ev.period && ev.clockMinute != null
          ? eventAbsoluteMinute(ev.period, ev.clockMinute, firstHalfMinutes)
          : null);
      if (abs != null) timeline.push({ absoluteMinute: abs, kind: 'yellow', jerseyNumber: jersey });
    }
    if (ev.factType === 'PLAYER_RED_CARD') {
      row.redCards += 1;
      const abs =
        ev.minute ??
        (ev.period && ev.clockMinute != null
          ? eventAbsoluteMinute(ev.period, ev.clockMinute, firstHalfMinutes)
          : null);
      if (abs != null) timeline.push({ absoluteMinute: abs, kind: 'red', jerseyNumber: jersey });
    }
    if (ev.factType === 'PLAYER_SUBSTITUTION') {
      const abs = ev.minute ?? 0;
      const inJersey = ev.relatedJerseyNumber;
      if (inJersey != null) {
        const inKey = rosterKey(ourTeamSide, inJersey);
        const inRow = byKey.get(inKey);
        if (inRow) {
          inRow.played = true;
          inRow.enteredMinute = abs;
          timeline.push({ absoluteMinute: abs, kind: 'sub_in', jerseyNumber: inJersey });
        }
      }
      row.played = true;
      row.exitedMinute = abs;
      timeline.push({ absoluteMinute: abs, kind: 'sub_out', jerseyNumber: jersey });
    }
  }

  const yellowCountByJersey = new Map<number, number>();
  for (const ev of timeline.filter((t) => t.kind === 'yellow').sort((a, b) => a.absoluteMinute - b.absoluteMinute)) {
    const count = (yellowCountByJersey.get(ev.jerseyNumber) ?? 0) + 1;
    yellowCountByJersey.set(ev.jerseyNumber, count);
    if (count === 2) {
      timeline.push({
        absoluteMinute: ev.absoluteMinute,
        kind: 'second_yellow',
        jerseyNumber: ev.jerseyNumber,
      });
    }
  }

  for (const row of byKey.values()) {
    const exitEvents = timeline
      .filter(
        (t) =>
          t.jerseyNumber === row.jerseyNumber &&
          (t.kind === 'sub_out' || t.kind === 'red' || t.kind === 'second_yellow'),
      )
      .sort((a, b) => a.absoluteMinute - b.absoluteMinute);
    const exitMinute = exitEvents[0]?.absoluteMinute ?? null;
    if (exitMinute != null) row.exitedMinute = exitMinute;

    const startMinute = row.starter ? 0 : row.enteredMinute;
    if (startMinute == null) {
      row.minutesPlayed = 0;
      row.played = false;
      continue;
    }
    const endMinute = exitMinute ?? totalMinutes;
    row.minutesPlayed = Math.max(0, endMinute - startMinute);
    row.played = row.starter || row.enteredMinute != null;
  }

  return [...byKey.values()].sort((a, b) => a.jerseyNumber - b.jerseyNumber);
}

export function compareProjectedToPersistedStats(
  projected: ProjectedPlayerStat[],
  persisted: Array<{
    cbfRegistration: string;
    jerseyNumber: number | null;
    starter: boolean;
    played: boolean;
    minutesPlayed: number;
    goals: number;
    ownGoals: number;
    penaltyGoals: number;
    yellowCards: number;
    redCards: number;
  }>,
): Array<{ cbfRegistration: string; field: string; persisted: number | boolean; projected: number | boolean }> {
  const drifts: Array<{
    cbfRegistration: string;
    field: string;
    persisted: number | boolean;
    projected: number | boolean;
  }> = [];
  const persistedByCbf = new Map(persisted.map((p) => [p.cbfRegistration, p]));

  for (const proj of projected) {
    const row = persistedByCbf.get(proj.cbfRegistration);
    if (!row) continue;
    const checks: Array<[string, number | boolean, number | boolean]> = [
      ['goals', row.goals, proj.goals],
      ['ownGoals', row.ownGoals, proj.ownGoals],
      ['penaltyGoals', row.penaltyGoals, proj.penaltyGoals],
      ['yellowCards', row.yellowCards, proj.yellowCards],
      ['redCards', row.redCards, proj.redCards],
      ['minutesPlayed', row.minutesPlayed, proj.minutesPlayed],
      ['played', row.played, proj.played],
      ['starter', row.starter, proj.starter],
    ];
    for (const [field, persistedVal, projectedVal] of checks) {
      if (persistedVal !== projectedVal) {
        drifts.push({
          cbfRegistration: proj.cbfRegistration,
          field,
          persisted: persistedVal,
          projected: projectedVal,
        });
      }
    }
  }
  return drifts;
}
