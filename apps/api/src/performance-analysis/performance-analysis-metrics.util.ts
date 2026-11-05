type TaggedEvent = {
  tagKey: string;
  tagLabel: string;
  outcome: string | null;
  playerId: string | null;
  teamSide?: string | null;
};

export type TeamMetrics = {
  totalTagged: number;
  byTag: Record<string, number>;
  byOutcome: Record<string, number>;
  passAttempts: number;
  passSuccess: number;
  passFailure: number;
  passAccuracyPct: number | null;
  shots: number;
  shotsOnGoal: number;
  shotsBlocked: number;
  shotsOffTarget: number;
  goals: number;
  fouls: number;
  cornersFor: number;
  cornersAgainst: number;
  yellowCards: number;
  redCards: number;
  recoveries: number;
  losses: number;
  duels: number;
  duelsWon: number;
  crosses: number;
  crossesSuccess: number;
  possessionMarks: number;
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
  const byOutcome: Record<string, number> = {};
  let passAttempts = 0;
  let passSuccess = 0;
  let passFailure = 0;
  let shots = 0;
  let shotsOnGoal = 0;
  let shotsBlocked = 0;
  let shotsOffTarget = 0;
  let goals = 0;
  let fouls = 0;
  let cornersFor = 0;
  let cornersAgainst = 0;
  let yellowCards = 0;
  let redCards = 0;
  let recoveries = 0;
  let losses = 0;
  let duels = 0;
  let duelsWon = 0;
  let crosses = 0;
  let crossesSuccess = 0;
  let possessionMarks = 0;

  for (const ev of events) {
    byTag[ev.tagKey] = (byTag[ev.tagKey] ?? 0) + 1;
    if (ev.outcome) {
      const ok = `${ev.tagKey}:${ev.outcome}`;
      byOutcome[ok] = (byOutcome[ok] ?? 0) + 1;
    }
    if (isPassKey(ev.tagKey)) {
      passAttempts += 1;
      if (isPassSuccess(ev.outcome)) passSuccess += 1;
      if (isPassFailure(ev.outcome)) passFailure += 1;
    }
    if (isShotKey(ev.tagKey)) {
      shots += 1;
      if (ev.outcome === 'gol') {
        shotsOnGoal += 1;
        goals += 1;
      } else if (ev.outcome === 'defesa') shotsOnGoal += 1;
      else if (ev.outcome === 'bloqueada') shotsBlocked += 1;
      else if (ev.outcome === 'fora') shotsOffTarget += 1;
    }
    if (ev.tagKey === 'gol') goals += 1;
    if (ev.tagKey === 'falta') fouls += 1;
    if (ev.tagKey === 'escanteio') {
      if (ev.outcome === 'contra') cornersAgainst += 1;
      else cornersFor += 1;
    }
    if (ev.tagKey === 'cartao_amarelo') yellowCards += 1;
    if (ev.tagKey === 'cartao_vermelho') redCards += 1;
    if (ev.tagKey === 'posse_bola') possessionMarks += 1;
    if (ev.tagKey === 'recuperacao') recoveries += 1;
    if (ev.tagKey === 'perda') losses += 1;
    if (ev.tagKey === 'duelo') {
      duels += 1;
      if (ev.outcome === 'vencido') duelsWon += 1;
    }
    if (ev.tagKey === 'cruzamento') {
      crosses += 1;
      if (isPassSuccess(ev.outcome)) crossesSuccess += 1;
    }
  }

  const passAccuracyPct =
    passAttempts > 0 ? Math.round((passSuccess / passAttempts) * 1000) / 10 : null;

  return {
    totalTagged: events.length,
    byTag,
    byOutcome,
    passAttempts,
    passSuccess,
    passFailure,
    passAccuracyPct,
    shots,
    shotsOnGoal,
    shotsBlocked,
    shotsOffTarget,
    goals,
    fouls,
    cornersFor,
    cornersAgainst,
    yellowCards,
    redCards,
    recoveries,
    losses,
    duels,
    duelsWon,
    crosses,
    crossesSuccess,
    possessionMarks,
  };
}

export function computeTeamMetrics(events: TaggedEvent[]): TeamMetrics {
  return aggregate(events);
}

export function computeTeamMetricsBySide(
  events: TaggedEvent[],
): { proprio: TeamMetrics; adversario: TeamMetrics; all: TeamMetrics } {
  const proprio = events.filter((e) => !e.teamSide || e.teamSide === 'proprio');
  const adversario = events.filter((e) => e.teamSide === 'adversario');
  return {
    proprio: aggregate(proprio),
    adversario: aggregate(adversario),
    all: aggregate(events),
  };
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
