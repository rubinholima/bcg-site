import { createHash } from 'crypto';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import { normalizeParsedFmfReport } from './fmf-parsed-normalize.util';

export type DisciplineRawPatchSlice = {
  playerCardEvents: ParsedFmfMatchReport['playerCardEvents'];
  staffCardEvents: ParsedFmfMatchReport['staffCardEvents'];
  statsDiscipline: Array<{
    teamSide: 'home' | 'away';
    jerseyNumber: number;
    cbfRegistration: string | null;
    yellowCards: number;
    redCards: number;
  }>;
};

function statMatchKey(stat: {
  teamSide?: 'home' | 'away';
  jerseyNumber?: number;
  cbfRegistration?: string | null;
}): string {
  return `${stat.teamSide ?? ''}:${stat.jerseyNumber ?? ''}:${stat.cbfRegistration ?? ''}`;
}

export function extractDisciplineRawPatchSlice(
  rawParsed: unknown,
  ourSide: 'home' | 'away',
): DisciplineRawPatchSlice {
  const parsed = normalizeParsedFmfReport(rawParsed);
  if (!parsed) {
    return { playerCardEvents: [], staffCardEvents: [], statsDiscipline: [] };
  }
  return {
    playerCardEvents: parsed.playerCardEvents.filter((event) => event.teamSide === ourSide),
    staffCardEvents: parsed.staffCardEvents.filter(
      (event) => !event.teamSide || event.teamSide === ourSide,
    ),
    statsDiscipline: parsed.stats
      .filter((stat) => stat.teamSide === ourSide)
      .map((stat) => ({
        teamSide: stat.teamSide,
        jerseyNumber: stat.jerseyNumber,
        cbfRegistration: stat.cbfRegistration ?? null,
        yellowCards: stat.yellowCards,
        redCards: stat.redCards,
      })),
  };
}

/** Patch mínimo: cartões + yellow/red em stats do nosso lado. Preserva todo o resto. */
export class ExistingRawParsedRepairBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExistingRawParsedRepairBlockedError';
  }
}

function resolveExistingCanonicalRawParsed(existingRaw: unknown): ParsedFmfMatchReport {
  if (existingRaw == null) {
    throw new ExistingRawParsedRepairBlockedError(
      'rawParsed existente ausente — repair bloqueado',
    );
  }
  const existing = normalizeParsedFmfReport(existingRaw);
  if (!existing) {
    throw new ExistingRawParsedRepairBlockedError(
      'rawParsed existente inválido — repair bloqueado',
    );
  }
  const hasTeams = Boolean(existing.homeTeam?.trim() && existing.awayTeam?.trim());
  const hasCanonicalBody =
    existing.stats.length > 0 ||
    existing.roster.length > 0 ||
    existing.playerGoalEvents.length > 0 ||
    existing.substitutionEvents.length > 0;
  if (!hasTeams || !hasCanonicalBody) {
    throw new ExistingRawParsedRepairBlockedError(
      'rawParsed existente inválido — repair bloqueado',
    );
  }
  return existing;
}

export function patchRawParsedDisciplineOnly(
  existingRaw: unknown,
  parsed: ParsedFmfMatchReport,
  ourSide: 'home' | 'away',
): {
  patchedRaw: ParsedFmfMatchReport;
  before: DisciplineRawPatchSlice;
  after: DisciplineRawPatchSlice;
  unrelatedFingerprint: { before: string; after: string };
} {
  const existing = resolveExistingCanonicalRawParsed(existingRaw);
  const before = extractDisciplineRawPatchSlice(existing, ourSide);

  const patched: ParsedFmfMatchReport = {
    ...existing,
    playerCardEvents: [
      ...existing.playerCardEvents.filter((event) => event.teamSide !== ourSide),
      ...parsed.playerCardEvents.filter((event) => event.teamSide === ourSide),
    ],
    staffCardEvents: [
      ...existing.staffCardEvents.filter(
        (event) => event.teamSide && event.teamSide !== ourSide,
      ),
      ...parsed.staffCardEvents.filter(
        (event) => !event.teamSide || event.teamSide === ourSide,
      ),
    ],
    stats: existing.stats.map((stat) => {
      if (stat.teamSide !== ourSide) return stat;
      const parsedStat = parsed.stats.find(
        (row) => statMatchKey(row) === statMatchKey(stat),
      );
      if (!parsedStat) return stat;
      return {
        ...stat,
        yellowCards: parsedStat.yellowCards,
        redCards: parsedStat.redCards,
      };
    }),
  };

  const after = extractDisciplineRawPatchSlice(patched, ourSide);
  const unrelatedBefore = hashUnrelatedRawParsedContent(existing, ourSide);
  const unrelatedAfter = hashUnrelatedRawParsedContent(patched, ourSide);

  return {
    patchedRaw: patched,
    before,
    after,
    unrelatedFingerprint: { before: unrelatedBefore, after: unrelatedAfter },
  };
}

function hashUnrelatedRawParsedContent(
  raw: ParsedFmfMatchReport,
  ourSide: 'home' | 'away',
): string {
  const payload = {
    playerGoalEvents: raw.playerGoalEvents,
    substitutionEvents: raw.substitutionEvents,
    roster: raw.roster,
    staffRoster: raw.staffRoster,
    occurrences: raw.occurrences,
    occurrencesText: raw.occurrencesText,
    competition: raw.competition,
    phase: raw.phase,
    round: raw.round,
    category: raw.category,
    season: raw.season,
    homeTeam: raw.homeTeam,
    awayTeam: raw.awayTeam,
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
    firstHalfMinutes: raw.firstHalfMinutes,
    secondHalfMinutes: raw.secondHalfMinutes,
    totalMinutes: raw.totalMinutes,
    statsNonDiscipline: raw.stats.map((stat) => ({
      key: statMatchKey(stat),
      starter: stat.starter,
      played: stat.played,
      enteredMinute: stat.enteredMinute,
      exitedMinute: stat.exitedMinute,
      minutesPlayed: stat.minutesPlayed,
      goals: stat.goals,
      ownGoals: stat.ownGoals,
      penaltyGoals: stat.penaltyGoals,
      sourceName: stat.sourceName,
    })),
    opponentCards: raw.playerCardEvents.filter((event) => event.teamSide !== ourSide),
    opponentStaffCards: raw.staffCardEvents.filter(
      (event) => event.teamSide && event.teamSide !== ourSide,
    ),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function disciplineRawPatchSlicesEqual(
  a: DisciplineRawPatchSlice,
  b: DisciplineRawPatchSlice,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
