import { dateKeyInBrazil } from '../common/brazil-time.util';

export type DisciplineOpeningBalance = {
  effectiveFrom: string;
  yellowAccum: number;
  suspensionRoundsLeft: number;
};

function parseRegistrationProfile(value: unknown): {
  personal?: { clubArrivalDate?: string };
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as { personal?: { clubArrivalDate?: string } };
}

/** Data de chegada ao clube (cadastro) — fronteira de reset disciplinar por transferência. */
export function readClubArrivalDateKey(registrationProfile: unknown): string | null {
  const raw = parseRegistrationProfile(registrationProfile)?.personal?.clubArrivalDate?.trim();
  if (!raw) return null;
  const parsed = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateKeyInBrazil(parsed);
}

/** Saldo zero automático na chegada quando não há saldo manual na competição. */
export function mergeTransferDisciplineOpenings(
  openingByPlayerId: Map<string, DisciplineOpeningBalance>,
  players: Array<{ id: string; registrationProfile: unknown }>,
): Map<string, DisciplineOpeningBalance> {
  const merged = new Map(openingByPlayerId);
  for (const player of players) {
    if (merged.has(player.id)) continue;
    const effectiveFrom = readClubArrivalDateKey(player.registrationProfile);
    if (!effectiveFrom) continue;
    merged.set(player.id, {
      effectiveFrom,
      yellowAccum: 0,
      suspensionRoundsLeft: 0,
    });
  }
  return merged;
}

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
