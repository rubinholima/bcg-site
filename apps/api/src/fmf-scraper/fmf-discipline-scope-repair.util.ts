import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import { syncMatchOfficialEvents } from './match-official-events.sync';
import {
  buildPlayersByNormalizedName,
  resolvePlayerForFmfStat,
} from './fmf-player-link.util';
import { isFmfTeamMatch } from './fmf-team-match.util';
import type { FmfReportPlayerStat } from './fmf-match-report.parser';

/** Allowlist de produção — Thaylan/Betim + Marcos/Athletic apenas. */
export const PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST = [
  {
    matchId: 'cmsgaqgl3009ep894q6k2jcb4',
    competition: 'Sub-14',
    label: 'Thaylan / Betim',
  },
  {
    matchId: 'cmt26oqqc0062p85b2q6ubovq',
    competition: 'Sub-13',
    label: 'Marcos / Athletic',
  },
] as const;

export type DisciplineStatUpdatePlan = {
  statId: string;
  playerId: string;
  playerName: string;
  cbfRegistration: string | null;
  jerseyNumber: number | null;
  yellowCards: { before: number; after: number };
  redCards: { before: number; after: number };
};

export type PreservedStatSnapshot = {
  statId: string;
  playerId: string;
  playerName: string;
  goals: number;
  ownGoals: number;
  penaltyGoals: number;
  played: boolean;
  starter: boolean;
  minutesPlayed: number;
  enteredMinute: number | null;
  exitedMinute: number | null;
  jerseyNumber: number | null;
  yellowCards: number;
  redCards: number;
};

export type EventCountSnapshot = {
  playerYellow: number;
  playerRed: number;
  staffYellow: number;
  staffRed: number;
};

export type ValidatedMatchRepairPlan = {
  matchId: string;
  externalMatchId: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  safe: boolean;
  blockReasons: string[];
  sourceFingerprint: string;
  statUpdates: DisciplineStatUpdatePlan[];
  preservedStats: PreservedStatSnapshot[];
  reportMutations: {
    rawParsedDisciplineFingerprint: { before: string; after: string; willMutate: boolean };
    occurrencesText: { before: string | null; after: string | null; willMutate: boolean };
  };
  eventMutations: {
    before: EventCountSnapshot;
    after: EventCountSnapshot;
    willMutate: boolean;
  };
};

export type ValidatedRepairPlan = {
  dryRun: true;
  tenantId: string;
  matchIds: string[];
  competitionFilter: string | null;
  matches: ValidatedMatchRepairPlan[];
  safeCount: number;
  blockedCount: number;
  planFingerprint: string;
};

type TenantInfo = {
  id: string;
  name: string;
  tradeName: string | null;
  slug: string;
  aliases: string[];
};

type PlayerRow = {
  id: string;
  name: string;
  cbfRegistration: string | null;
  registrationProfile: unknown;
};

type ExistingStatRow = {
  id: string;
  playerId: string;
  playerName: string;
  cbfRegistration: string;
  jerseyNumber: number | null;
  starter: boolean;
  played: boolean;
  enteredMinute: number | null;
  exitedMinute: number | null;
  minutesPlayed: number;
  goals: number;
  ownGoals: number;
  penaltyGoals: number;
  yellowCards: number;
  redCards: number;
};

function digits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

function cbfFromProfile(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  return digits((value as { sports?: { cbf?: string } }).sports?.cbf);
}

function buildPlayersByCbf(players: PlayerRow[]): Map<string, PlayerRow[]> {
  const map = new Map<string, PlayerRow[]>();
  for (const player of players) {
    const cbf = digits(player.cbfRegistration) || cbfFromProfile(player.registrationProfile);
    if (!cbf) continue;
    map.set(cbf, [...(map.get(cbf) ?? []), player]);
  }
  return map;
}

function countEvents(events: Array<{ factType: string }>): EventCountSnapshot {
  return {
    playerYellow: events.filter((e) => e.factType === 'PLAYER_YELLOW_CARD').length,
    playerRed: events.filter((e) => e.factType === 'PLAYER_RED_CARD').length,
    staffYellow: events.filter((e) => e.factType === 'STAFF_YELLOW_CARD').length,
    staffRed: events.filter((e) => e.factType === 'STAFF_RED_CARD').length,
  };
}

function eventsEqual(a: EventCountSnapshot, b: EventCountSnapshot): boolean {
  return (
    a.playerYellow === b.playerYellow &&
    a.playerRed === b.playerRed &&
    a.staffYellow === b.staffYellow &&
    a.staffRed === b.staffRed
  );
}

/** Fingerprint estável da fatia disciplinar regenerável do PDF. */
export function computeDisciplineSourceFingerprint(
  parsed: ParsedFmfMatchReport,
  ourSide: 'home' | 'away',
): string {
  const payload = {
    playerCardEvents: parsed.playerCardEvents
      .filter((event) => event.teamSide === ourSide)
      .map((event) => ({
        kind: event.kind,
        jerseyNumber: event.jerseyNumber,
        cbfRegistration: event.cbfRegistration,
        clock: event.clock,
        period: event.period,
        expulsionBySecondYellow: event.expulsionBySecondYellow ?? false,
      })),
    staffCardEvents: parsed.staffCardEvents
      .filter((event) => event.teamSide === ourSide)
      .map((event) => ({
        kind: event.kind,
        name: event.name,
        roleLabel: event.roleLabel,
        clock: event.clock,
      })),
    stats: parsed.stats
      .filter((stat) => stat.teamSide === ourSide)
      .map((stat) => ({
        jerseyNumber: stat.jerseyNumber,
        cbfRegistration: stat.cbfRegistration,
        yellowCards: stat.yellowCards,
        redCards: stat.redCards,
      })),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function fingerprintRawParsedDiscipline(rawParsed: unknown, ourSide: 'home' | 'away'): string {
  if (!rawParsed || typeof rawParsed !== 'object') return '';
  const parsed = rawParsed as ParsedFmfMatchReport;
  return computeDisciplineSourceFingerprint(
    {
      ...parsed,
      playerCardEvents: Array.isArray(parsed.playerCardEvents) ? parsed.playerCardEvents : [],
      staffCardEvents: Array.isArray(parsed.staffCardEvents) ? parsed.staffCardEvents : [],
      stats: Array.isArray(parsed.stats) ? parsed.stats : [],
    } as ParsedFmfMatchReport,
    ourSide,
  );
}

function hashPlan(plan: Omit<ValidatedRepairPlan, 'planFingerprint'>): string {
  return createHash('sha256').update(JSON.stringify(plan)).digest('hex');
}

function resolveOurSide(
  parsed: ParsedFmfMatchReport,
  clubName: string,
  aliases: string[],
): 'home' | 'away' | null {
  if (isFmfTeamMatch(parsed.homeTeam, clubName, aliases)) return 'home';
  if (isFmfTeamMatch(parsed.awayTeam, clubName, aliases)) return 'away';
  return null;
}

function buildDisciplineStatUpdates(
  existingStats: ExistingStatRow[],
  parsed: ParsedFmfMatchReport,
  ourSide: 'home' | 'away',
  playersByCbf: Map<string, PlayerRow[]>,
  playersByName: ReturnType<typeof buildPlayersByNormalizedName>,
  players: PlayerRow[],
): {
  statUpdates: DisciplineStatUpdatePlan[];
  preservedStats: PreservedStatSnapshot[];
  blockReasons: string[];
} {
  const blockReasons: string[] = [];
  const existingByPlayerId = new Map(existingStats.map((row) => [row.playerId, row]));
  const parsedDisciplineByPlayerId = new Map<string, { yellowCards: number; redCards: number }>();

  for (const stat of parsed.stats.filter((row) => row.teamSide === ourSide)) {
    const resolved = resolvePlayerForFmfStat(stat, playersByCbf, playersByName, players);
    if (!resolved.ok) continue;
    parsedDisciplineByPlayerId.set(resolved.playerId, {
      yellowCards: stat.yellowCards,
      redCards: stat.redCards,
    });
  }

  for (const existing of existingStats) {
    if (!parsedDisciplineByPlayerId.has(existing.playerId)) {
      blockReasons.push(
        `Participante ${existing.playerId} (${existing.playerName}) ausente no PDF reparseado — fonte incompleta`,
      );
    }
  }

  const statUpdates: DisciplineStatUpdatePlan[] = [];
  const preservedStats: PreservedStatSnapshot[] = [];

  for (const existing of existingStats) {
    const after = parsedDisciplineByPlayerId.get(existing.playerId);
    if (!after) continue;

    const disciplineChanged =
      existing.yellowCards !== after.yellowCards || existing.redCards !== after.redCards;

    if (disciplineChanged) {
      statUpdates.push({
        statId: existing.id,
        playerId: existing.playerId,
        playerName: existing.playerName,
        cbfRegistration: existing.cbfRegistration,
        jerseyNumber: existing.jerseyNumber,
        yellowCards: { before: existing.yellowCards, after: after.yellowCards },
        redCards: { before: existing.redCards, after: after.redCards },
      });
    }

    preservedStats.push({
      statId: existing.id,
      playerId: existing.playerId,
      playerName: existing.playerName,
      goals: existing.goals,
      ownGoals: existing.ownGoals,
      penaltyGoals: existing.penaltyGoals,
      played: existing.played,
      starter: existing.starter,
      minutesPlayed: existing.minutesPlayed,
      enteredMinute: existing.enteredMinute,
      exitedMinute: existing.exitedMinute,
      jerseyNumber: existing.jerseyNumber,
      yellowCards: disciplineChanged ? after.yellowCards : existing.yellowCards,
      redCards: disciplineChanged ? after.redCards : existing.redCards,
    });
  }

  return { statUpdates, preservedStats, blockReasons };
}

export function assertAllowlistScope(input: {
  tenantId: string;
  matchIds: string[];
  competitionContains?: string;
}): void {
  const unknown = input.matchIds.filter(
    (id) => !PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST.some((entry) => entry.matchId === id),
  );
  if (unknown.length > 0) {
    throw new Error(
      `matchIds fora da allowlist de produção disciplinar: ${unknown.join(', ')}`,
    );
  }
  if (input.competitionContains?.trim()) {
    const allowed = PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST.filter((entry) =>
      input.matchIds.includes(entry.matchId),
    );
    for (const entry of allowed) {
      if (
        !entry.competition.toLowerCase().includes(input.competitionContains!.trim().toLowerCase()) &&
        !input.competitionContains!.trim().toLowerCase().includes(entry.competition.toLowerCase())
      ) {
        throw new Error(
          `Filtro competition="${input.competitionContains}" incompatível com ${entry.label}`,
        );
      }
    }
  }
}

export async function planFmfDisciplineScopeRepair(
  prisma: PrismaService,
  input: {
    tenantId: string;
    matchIds: string[];
    competitionContains?: string;
    downloadAndParse: (url: string) => Promise<ParsedFmfMatchReport>;
    enforceProductionAllowlist?: boolean;
  },
): Promise<ValidatedRepairPlan> {
  if (input.enforceProductionAllowlist) {
    assertAllowlistScope(input);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true, name: true, tradeName: true, slug: true },
  });
  if (!tenant) throw new Error('Tenant não encontrado');

  const clubName = tenant.tradeName?.trim() || tenant.name;
  const aliases = [tenant.slug, 'boston city', 'boston'].filter(Boolean) as string[];

  const reports = await prisma.fmfMatchReport.findMany({
    where: {
      tenantId: input.tenantId,
      id: { in: input.matchIds },
      ...(input.competitionContains
        ? { competition: { contains: input.competitionContains, mode: 'insensitive' } }
        : {}),
    },
    include: {
      playerStats: true,
      matchOfficialEvents: { select: { factType: true, provenance: true } },
      coachStatOverride: { select: { id: true } },
    },
    orderBy: { matchDate: 'asc' },
  });

  if (reports.length !== input.matchIds.length) {
    const found = new Set(reports.map((r) => r.id));
    const missing = input.matchIds.filter((id) => !found.has(id));
    throw new Error(`Partidas não encontradas no tenant: ${missing.join(', ')}`);
  }

  const players = await prisma.player.findMany({
    where: { tenantId: input.tenantId },
    select: { id: true, name: true, cbfRegistration: true, registrationProfile: true },
  });
  const playersByCbf = buildPlayersByCbf(players);
  const playersByName = buildPlayersByNormalizedName(players);

  const matches: ValidatedMatchRepairPlan[] = [];

  for (const report of reports) {
    const blockReasons: string[] = [];
    if (report.coachStatOverride) {
      blockReasons.push('CoachMatchStatOverride presente — override manual protegido');
    }
    if (!report.sourceUrl?.trim()) {
      blockReasons.push('sourceUrl ausente — impossível reparse oficial');
    }

    const manualEvents = report.matchOfficialEvents.filter((e) => e.provenance !== 'fmf_official');
    if (manualEvents.length > 0) {
      blockReasons.push(`${manualEvents.length} evento(s) com provenance não-oficial`);
    }

    let parsed: ParsedFmfMatchReport | null = null;
    if (report.sourceUrl?.trim() && blockReasons.length === 0) {
      try {
        parsed = await input.downloadAndParse(report.sourceUrl);
      } catch (err) {
        blockReasons.push(`Falha ao baixar/parsear PDF: ${(err as Error).message}`);
      }
    }

    const ourSide = parsed ? resolveOurSide(parsed, clubName, aliases) : null;
    if (parsed && !ourSide) {
      blockReasons.push('Clube não identificado na súmula reparseada');
    }

    let statUpdates: DisciplineStatUpdatePlan[] = [];
    let preservedStats: PreservedStatSnapshot[] = [];
    let sourceFingerprint = '';
    let rawBefore = '';
    let rawAfter = '';

    if (parsed && ourSide) {
      sourceFingerprint = computeDisciplineSourceFingerprint(parsed, ourSide);
      rawBefore = fingerprintRawParsedDiscipline(report.rawParsed, ourSide);
      rawAfter = sourceFingerprint;

      const built = buildDisciplineStatUpdates(
        report.playerStats,
        parsed,
        ourSide,
        playersByCbf,
        playersByName,
        players,
      );
      statUpdates = built.statUpdates;
      preservedStats = built.preservedStats;
      blockReasons.push(...built.blockReasons);
    }

    const eventBefore = countEvents(report.matchOfficialEvents);
    const eventAfter = parsed
      ? {
          playerYellow: parsed.playerCardEvents.filter((c) => c.kind === 'yellow').length,
          playerRed: parsed.playerCardEvents.filter((c) => c.kind === 'red').length,
          staffYellow: parsed.staffCardEvents.filter((c) => c.kind === 'yellow').length,
          staffRed: parsed.staffCardEvents.filter((c) => c.kind === 'red').length,
        }
      : eventBefore;

    const occurrencesAfter = parsed?.occurrencesText ?? report.occurrencesText;
    const rawWillMutate = rawBefore !== rawAfter;
    const occurrencesWillMutate = (report.occurrencesText ?? null) !== (occurrencesAfter ?? null);
    const eventsWillMutate = !eventsEqual(eventBefore, eventAfter);

    matches.push({
      matchId: report.id,
      externalMatchId: report.externalMatchId,
      competition: report.competition,
      homeTeam: report.homeTeam,
      awayTeam: report.awayTeam,
      matchDate: report.matchDate.toISOString(),
      safe: blockReasons.length === 0,
      blockReasons,
      sourceFingerprint,
      statUpdates,
      preservedStats,
      reportMutations: {
        rawParsedDisciplineFingerprint: {
          before: rawBefore,
          after: rawAfter,
          willMutate: rawWillMutate,
        },
        occurrencesText: {
          before: report.occurrencesText,
          after: occurrencesAfter ?? null,
          willMutate: occurrencesWillMutate,
        },
      },
      eventMutations: {
        before: eventBefore,
        after: eventAfter,
        willMutate: eventsWillMutate,
      },
    });
  }

  const basePlan = {
    dryRun: true as const,
    tenantId: input.tenantId,
    matchIds: input.matchIds,
    competitionFilter: input.competitionContains ?? null,
    matches,
    safeCount: matches.filter((m) => m.safe).length,
    blockedCount: matches.filter((m) => !m.safe).length,
  };

  return {
    ...basePlan,
    planFingerprint: hashPlan(basePlan),
  };
}

export async function applyValidatedMatchRepair(
  prisma: PrismaService,
  input: {
    tenant: TenantInfo;
    validatedMatch: ValidatedMatchRepairPlan;
    downloadAndParse: (url: string) => Promise<ParsedFmfMatchReport>;
  },
): Promise<{
  statUpdatesApplied: number;
  events: { created: number; updated: number; removed: number };
}> {
  if (!input.validatedMatch.safe) {
    throw new Error(`Partida insegura: ${input.validatedMatch.blockReasons.join('; ')}`);
  }

  const clubName = input.tenant.tradeName?.trim() || input.tenant.name;
  const aliases = input.tenant.aliases;

  const report = await prisma.fmfMatchReport.findFirst({
    where: { id: input.validatedMatch.matchId, tenantId: input.tenant.id },
    include: {
      coachStatOverride: true,
      playerStats: true,
    },
  });
  if (!report) throw new Error('Partida não encontrada');
  if (report.coachStatOverride) {
    throw new Error('Partida bloqueada: CoachMatchStatOverride');
  }
  if (!report.sourceUrl?.trim()) {
    throw new Error('sourceUrl ausente');
  }

  const parsed = await input.downloadAndParse(report.sourceUrl);
  const ourSide = resolveOurSide(parsed, clubName, aliases);
  if (!ourSide) throw new Error('Clube não identificado na súmula');

  const liveFingerprint = computeDisciplineSourceFingerprint(parsed, ourSide);
  if (liveFingerprint !== input.validatedMatch.sourceFingerprint) {
    throw new Error(
      'Source fingerprint divergiu desde o dry-run — abortado; execute novo dry-run',
    );
  }

  for (const update of input.validatedMatch.statUpdates) {
    const current = report.playerStats.find((row) => row.id === update.statId);
    if (!current) {
      throw new Error(`Stat ${update.statId} não encontrado — abortado`);
    }
    if (
      current.yellowCards !== update.yellowCards.before ||
      current.redCards !== update.redCards.before
    ) {
      throw new Error(
        `Stat ${update.statId} divergiu do dry-run (yellow/red before) — abortado`,
      );
    }
  }

  const staffPool = await prisma.technicalStaff.findMany({
    where: { tenantId: input.tenant.id },
    select: { id: true, name: true, role: true, licenseNumber: true },
  });
  const players = await prisma.player.findMany({
    where: { tenantId: input.tenant.id },
    select: { id: true, name: true, cbfRegistration: true, registrationProfile: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const update of input.validatedMatch.statUpdates) {
      await tx.fmfPlayerMatchStat.update({
        where: { id: update.statId },
        data: {
          yellowCards: update.yellowCards.after,
          redCards: update.redCards.after,
        },
      });
    }

    if (input.validatedMatch.reportMutations.rawParsedDisciplineFingerprint.willMutate) {
      await tx.fmfMatchReport.update({
        where: { id: report.id },
        data: {
          rawParsed: parsed as unknown as Prisma.InputJsonValue,
          ...(input.validatedMatch.reportMutations.occurrencesText.willMutate
            ? { occurrencesText: parsed.occurrencesText }
            : {}),
        },
      });
    } else if (input.validatedMatch.reportMutations.occurrencesText.willMutate) {
      await tx.fmfMatchReport.update({
        where: { id: report.id },
        data: { occurrencesText: parsed.occurrencesText },
      });
    }

    for (const preserved of input.validatedMatch.preservedStats) {
      const current = await tx.fmfPlayerMatchStat.findUnique({ where: { id: preserved.statId } });
      if (!current) continue;
      if (
        current.goals !== preserved.goals ||
        current.ownGoals !== preserved.ownGoals ||
        current.penaltyGoals !== preserved.penaltyGoals ||
        current.played !== preserved.played ||
        current.starter !== preserved.starter ||
        current.minutesPlayed !== preserved.minutesPlayed ||
        current.enteredMinute !== preserved.enteredMinute ||
        current.exitedMinute !== preserved.exitedMinute ||
        current.jerseyNumber !== preserved.jerseyNumber
      ) {
        throw new Error(
          `Campo canônico não-disciplinar alterado em ${preserved.statId} — rollback`,
        );
      }
    }
  });

  let eventResult = { created: 0, updated: 0, removed: 0 };
  if (input.validatedMatch.eventMutations.willMutate) {
    eventResult = await syncMatchOfficialEvents(prisma, {
      tenantId: input.tenant.id,
      matchId: report.id,
      parsed,
      ourTeamSide: ourSide,
      players,
      staff: staffPool.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        licenseNumber: s.licenseNumber,
      })),
      parseSucceeded: true,
    });
  }

  return {
    statUpdatesApplied: input.validatedMatch.statUpdates.length,
    events: eventResult,
  };
}

/** @deprecated Use applyValidatedMatchRepair com plano validado. */
export async function applyFmfDisciplineScopeRepair(
  prisma: PrismaService,
  input: {
    tenant: TenantInfo;
    validatedMatch: ValidatedMatchRepairPlan;
    downloadAndParse: (url: string) => Promise<ParsedFmfMatchReport>;
  },
) {
  return applyValidatedMatchRepair(prisma, input);
}
