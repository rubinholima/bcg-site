import type { MatchOfficialFactType } from './match-official-event.types';

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function clockMinute(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]);
}

export function parseTimedRowParts(row: string): {
  clock: string;
  period: string;
  minute: number;
} | null {
  const match = row.match(/^(\d{1,2}:\d{2})\s+(1T|2T)\b/i);
  if (!match) return null;
  const minute = clockMinute(match[1]!);
  if (minute == null) return null;
  return { clock: match[1]!, period: match[2]!.toUpperCase(), minute };
}

/** Identidade estável do fato na fonte — independente de Player.id / TechnicalStaff.id. */
export function buildPlayerCardExternalKey(input: {
  kind: 'yellow' | 'red';
  teamSide: 'home' | 'away';
  period: string;
  clock: string;
  jerseyNumber: number;
  sequence?: number;
}): string {
  const seq = input.sequence ?? 0;
  const fact = input.kind === 'yellow' ? 'PLAYER_YELLOW_CARD' : 'PLAYER_RED_CARD';
  return `fmf:${fact}:${input.teamSide}:${input.period}:${input.clock}:${input.jerseyNumber}:${seq}`;
}

export function buildPlayerGoalExternalKey(input: {
  goalType: 'normal' | 'penalty' | 'own_goal';
  teamSide: 'home' | 'away';
  period: string;
  clock: string;
  jerseyNumber: number;
  sequence?: number;
}): string {
  const fact =
    input.goalType === 'penalty'
      ? 'PLAYER_PENALTY_GOAL'
      : input.goalType === 'own_goal'
        ? 'PLAYER_OWN_GOAL'
        : 'PLAYER_GOAL';
  return `fmf:${fact}:${input.teamSide}:${input.period}:${input.clock}:${input.jerseyNumber}:${input.sequence ?? 0}`;
}

export function buildPlayerSubstitutionExternalKey(input: {
  teamSide: 'home' | 'away';
  period: string;
  clock: string;
  outJersey: number;
  inJersey: number;
}): string {
  return `fmf:PLAYER_SUBSTITUTION:${input.teamSide}:${input.period}:${input.clock}:${input.outJersey}:${input.inJersey}`;
}

export function buildStaffCardExternalKey(input: {
  kind: 'yellow' | 'red';
  teamSide: 'home' | 'away';
  period: string;
  clock: string;
  roleLabel: string;
  name: string;
  sequence?: number;
}): string {
  const fact = input.kind === 'yellow' ? 'STAFF_YELLOW_CARD' : 'STAFF_RED_CARD';
  const role = norm(input.roleLabel).replace(/[^a-z0-9]+/g, '_');
  const name = norm(input.name).replace(/[^a-z0-9]+/g, '_').slice(0, 80);
  return `fmf:${fact}:${input.teamSide}:${input.period}:${input.clock}:${role}:${name}:${input.sequence ?? 0}`;
}

export function factTypeFromExternalKey(externalKey: string): MatchOfficialFactType | null {
  const parts = externalKey.split(':');
  const type = parts[1];
  if (!type) return null;
  return type as MatchOfficialFactType;
}
