type TaggedEvent = {
  tagKey: string;
  tagLabel: string;
  outcome: string | null;
  playerId: string | null;
};

export type TeamMetrics = {
  totalTagged: number;
  byTag: Record<string, number>;
  passAttempts: number;
  passSuccess: number;
  passFailure: number;
  passAccuracyPct: number | null;
  shots: number;
  shotsOnGoal: number;
  recoveries: number;
  losses: number;
};

export type PlayerMetrics = TeamMetrics & {
  playerId: string;
  duels: number;
  duelsWon: number;
};

function isPassKey(key: string): boolean {
  return key === 'passe' || key === 'cruzamento';
}

function isPassSuccess(outcome: string | null): boolean {
  return outcome === 'certo' || outcome === 'vencido';
}

function isPassFailure(outcome: string | null): boolean {
  return outcome === 'errado' || outcome === 'perdido';
}

function isShotKey(key: string): boolean {
  return key === 'finalizacao';
}

function aggregate(events: TaggedEvent[]): TeamMetrics {
  const byTag: Record<string, number> = {};
  let passAttempts = 0;
  let passSuccess = 0;
  let passFailure = 0;
  let shots = 0;
  let shotsOnGoal = 0;
  let recoveries = 0;
  let losses = 0;

  for (const ev of events) {
    byTag[ev.tagKey] = (byTag[ev.tagKey] ?? 0) + 1;
    if (isPassKey(ev.tagKey)) {
      passAttempts += 1;
      if (isPassSuccess(ev.outcome)) passSuccess += 1;
      if (isPassFailure(ev.outcome)) passFailure += 1;
    }
    if (isShotKey(ev.tagKey)) {
      shots += 1;
      if (ev.outcome === 'gol' || ev.outcome === 'no_gol') shotsOnGoal += 1;
    }
    if (ev.tagKey === 'recuperacao') recoveries += 1;
    if (ev.tagKey === 'perda') losses += 1;
  }

  const passAccuracyPct =
    passAttempts > 0 ? Math.round((passSuccess / passAttempts) * 1000) / 10 : null;

  return {
    totalTagged: events.length,
    byTag,
    passAttempts,
    passSuccess,
    passFailure,
    passAccuracyPct,
    shots,
    shotsOnGoal,
    recoveries,
    losses,
  };
}

export function computeTeamMetrics(events: TaggedEvent[]): TeamMetrics {
  return aggregate(events);
}

export function computePlayerMetrics(events: TaggedEvent[]): PlayerMetrics[] {
  const byPlayer = new Map<string, TaggedEvent[]>();
  for (const ev of events) {
    if (!ev.playerId) continue;
    const list = byPlayer.get(ev.playerId) ?? [];
    list.push(ev);
    byPlayer.set(ev.playerId, list);
  }
  return [...byPlayer.entries()].map(([playerId, list]) => {
    const base = aggregate(list);
    let duels = 0;
    let duelsWon = 0;
    for (const ev of list) {
      if (ev.tagKey !== 'duelo') continue;
      duels += 1;
      if (ev.outcome === 'vencido') duelsWon += 1;
    }
    return { ...base, playerId, duels, duelsWon };
  });
}
