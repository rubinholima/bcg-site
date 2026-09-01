import { dateKeyInBrazil } from '../common/brazil-time.util';

export type DisciplineOpeningBalance = {
  effectiveFrom: string;
  yellowAccum: number;
  suspensionRoundsLeft: number;
};

export function derivePenduradoFromOpening(
  yellowAccum: number,
  suspensionRoundsLeft: number,
): boolean {
  return suspensionRoundsLeft <= 0 && yellowAccum >= 2;
}

export function applyDisciplineOpeningIfDue(
  state: {
    yellowAccum: number;
    suspensionRoundsLeft: number;
    pendurado: boolean;
  },
  matchDate: Date,
  opening: DisciplineOpeningBalance | undefined,
  applied: boolean,
): boolean {
  if (!opening || applied) return applied;
  const matchDay = dateKeyInBrazil(matchDate);
  if (matchDay < opening.effectiveFrom) return false;
  state.yellowAccum = Math.max(0, opening.yellowAccum);
  state.suspensionRoundsLeft = Math.max(0, opening.suspensionRoundsLeft);
  state.pendurado = derivePenduradoFromOpening(state.yellowAccum, state.suspensionRoundsLeft);
  return true;
}

export function mapDisciplineOpeningRows(
  rows: Array<{
    playerId: string;
    effectiveFrom: Date;
    yellowAccum: number;
    suspensionRoundsLeft: number;
  }>,
): Map<string, DisciplineOpeningBalance> {
  const map = new Map<string, DisciplineOpeningBalance>();
  for (const row of rows) {
    map.set(row.playerId, {
      effectiveFrom: dateKeyInBrazil(row.effectiveFrom),
      yellowAccum: row.yellowAccum,
      suspensionRoundsLeft: row.suspensionRoundsLeft,
    });
  }
  return map;
}
