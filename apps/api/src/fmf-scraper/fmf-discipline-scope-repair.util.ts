import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import {
  applyDisciplineEventOperations,
  buildDisciplineCardDraftsForRepair,
  isDisciplineCardFactType,
  planDisciplineEventOperations,
  type DisciplineEventOperationPlan,
} from './fmf-discipline-only-repair.sync';
import {
  disciplineRawPatchSlicesEqual,
  extractDisciplineRawPatchSlice,
  patchRawParsedDisciplineOnly,
  type DisciplineRawPatchSlice,
} from './fmf-discipline-raw-parsed-patch.util';
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
  rawParsedPatch: {
    before: DisciplineRawPatchSlice;
    after: DisciplineRawPatchSlice;
    willMutate: boolean;
    unrelatedFingerprint: { before: string; after: string };
  };
  eventOperations: DisciplineEventOperationPlan[];
  nonDisciplineEventSnapshot: Array<{
    id: string;
    factType: string;
    externalKey: string;
    provenance: string;
  }>;
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

type ExistingEventRow = {
  id: string;
  factType: string;
  provenance: string;
  externalKey: string;
  playerId: string | null;
  technicalStaffId: string | null;
  sourceClock: string | null;
  period: string | null;
  sourceSections: unknown;
  sourceExcerpt: string | null;
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
      .filter((event) => !event.teamSide || event.teamSide === ourSide)
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
  const slice = extractDisciplineRawPatchSlice(rawParsed, ourSide);
  return createHash('sha256').update(JSON.stringify(slice)).digest('hex');
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
  for (const matchId of input.matchIds) {
    const entry = PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST.find((row) => row.matchId === matchId);
    if (!entry) continue;
    const reportCompetition = entry.competition.toLowerCase();
    if (
      input.competitionContains?.trim() &&
      !reportCompetition.includes(input.competitionContains.trim().toLowerCase()) &&
      !input.competitionContains.trim().toLowerCase().includes(reportCompetition)
    ) {
      throw new Error(
        `Filtro competition="${input.competitionContains}" incompatível com ${entry.label}`,
      );
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
    /** Somente testes internos — CLI produtivo sempre enforce. */
    skipAllowlistForTests?: boolean;
  },
): Promise<ValidatedRepairPlan> {
  if (!input.skipAllowlistForTests) {
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
      matchOfficialEvents: {
        select: {
          id: true,
          factType: true,
          provenance: true,
          externalKey: true,
          playerId: true,
          technicalStaffId: true,
          sourceClock: true,
          period: true,
          sourceSections: true,
          sourceExcerpt: true,
        },
      },
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
  const staffPool = await prisma.technicalStaff.findMany({
    where: { tenantId: input.tenantId },
    select: { id: true, name: true, role: true, licenseNumber: true },
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
    let rawParsedPatch: ValidatedMatchRepairPlan['rawParsedPatch'] = {
      before: { playerCardEvents: [], staffCardEvents: [], statsDiscipline: [] },
      after: { playerCardEvents: [], staffCardEvents: [], statsDiscipline: [] },
      willMutate: false,
      unrelatedFingerprint: { before: '', after: '' },
    };
    let eventOperations: DisciplineEventOperationPlan[] = [];
    const nonDisciplineEventSnapshot = report.matchOfficialEvents
      .filter((event) => !isDisciplineCardFactType(event.factType))
      .map((event) => ({
        id: event.id,
        factType: event.factType,
        externalKey: event.externalKey,
        provenance: event.provenance,
      }));

    if (parsed && ourSide) {
      sourceFingerprint = computeDisciplineSourceFingerprint(parsed, ourSide);

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

      const patch = patchRawParsedDisciplineOnly(report.rawParsed, parsed, ourSide);
      rawParsedPatch = {
        before: patch.before,
        after: patch.after,
        willMutate: !disciplineRawPatchSlicesEqual(patch.before, patch.after),
        unrelatedFingerprint: patch.unrelatedFingerprint,
      };
      if (patch.unrelatedFingerprint.before !== patch.unrelatedFingerprint.after) {
        blockReasons.push('Patch rawParsed alteraria conteúdo não-disciplinar — abortado');
      }

      const cardDrafts = buildDisciplineCardDraftsForRepair({
        parsed,
        ourTeamSide: ourSide,
        players,
        staff: staffPool.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          licenseNumber: s.licenseNumber,
        })),
      });
      eventOperations = planDisciplineEventOperations({
        existingEvents: report.matchOfficialEvents as ExistingEventRow[],
        drafts: cardDrafts,
      });
    }

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
      rawParsedPatch,
      eventOperations,
      nonDisciplineEventSnapshot,
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

function assertMatchPlansEqual(
  reviewed: ValidatedMatchRepairPlan,
  fresh: ValidatedMatchRepairPlan,
): void {
  if (JSON.stringify(reviewed) !== JSON.stringify(fresh)) {
    throw new Error('Plano regenerado difere do revisado — abortado; execute novo dry-run');
  }
}

function assertLiveStateMatchesPlan(
  report: {
    rawParsed: unknown;
    playerStats: ExistingStatRow[];
    matchOfficialEvents: ExistingEventRow[];
  },
  plan: ValidatedMatchRepairPlan,
  ourSide: 'home' | 'away',
): void {
  for (const update of plan.statUpdates) {
    const current = report.playerStats.find((row) => row.id === update.statId);
    if (!current) throw new Error(`Stat ${update.statId} não encontrado — abortado`);
    if (
      current.yellowCards !== update.yellowCards.before ||
      current.redCards !== update.redCards.before
    ) {
      throw new Error(`Stat ${update.statId} stale — abortado; execute novo dry-run`);
    }
  }

  const liveDisciplineBefore = extractDisciplineRawPatchSlice(report.rawParsed, ourSide);
  if (!disciplineRawPatchSlicesEqual(liveDisciplineBefore, plan.rawParsedPatch.before)) {
    throw new Error('rawParsed disciplinar stale — abortado; execute novo dry-run');
  }

  const currentNonDiscipline = report.matchOfficialEvents
    .filter((event) => !isDisciplineCardFactType(event.factType))
    .map((event) => ({
      id: event.id,
      factType: event.factType,
      externalKey: event.externalKey,
      provenance: event.provenance,
    }));
  if (JSON.stringify(currentNonDiscipline) !== JSON.stringify(plan.nonDisciplineEventSnapshot)) {
    throw new Error('Eventos não-disciplinares divergiram — abortado; execute novo dry-run');
  }

  const manualCount = report.matchOfficialEvents.filter(
    (event) => event.provenance !== 'fmf_official',
  ).length;
  if (manualCount > 0) {
    throw new Error('Eventos manuais detectados — abortado');
  }

  for (const operation of plan.eventOperations) {
    if (operation.op === 'UPDATE' || operation.op === 'DELETE') {
      const current = report.matchOfficialEvents.find((event) => event.id === operation.eventId);
      if (!current) {
        throw new Error(`Evento ${operation.eventId} stale — abortado`);
      }
      if (JSON.stringify({
        factType: current.factType,
        externalKey: current.externalKey,
        playerId: current.playerId,
        technicalStaffId: current.technicalStaffId,
        sourceClock: current.sourceClock,
        period: current.period,
        sourceSections: current.sourceSections,
        sourceExcerpt: current.sourceExcerpt,
      }) !== JSON.stringify(operation.before)) {
        throw new Error(`Evento disciplinar ${operation.externalKey} stale — abortado`);
      }
    }
  }
}

export async function applyValidatedRepairPlan(
  prisma: PrismaService,
  input: {
    tenant: TenantInfo;
    reviewedPlanFingerprint: string;
    tenantId: string;
    matchIds: string[];
    competitionContains?: string;
    downloadAndParse: (url: string) => Promise<ParsedFmfMatchReport>;
    skipAllowlistForTests?: boolean;
  },
): Promise<Array<{ matchId: string; statUpdatesApplied: number; events: { created: number; updated: number; deleted: number } }>> {
  if (!input.reviewedPlanFingerprint?.trim()) {
    throw new Error('planFingerprint obrigatório para --apply');
  }

  const freshPlan = await planFmfDisciplineScopeRepair(prisma, {
    tenantId: input.tenantId,
    matchIds: input.matchIds,
    competitionContains: input.competitionContains,
    downloadAndParse: input.downloadAndParse,
    skipAllowlistForTests: input.skipAllowlistForTests,
  });

  if (freshPlan.planFingerprint !== input.reviewedPlanFingerprint) {
    throw new Error('planFingerprint divergiu — abortado; execute novo dry-run');
  }

  const results: Array<{
    matchId: string;
    statUpdatesApplied: number;
    events: { created: number; updated: number; deleted: number };
  }> = [];

  for (const matchPlan of freshPlan.matches) {
    if (!matchPlan.safe) {
      throw new Error(`Partida insegura: ${matchPlan.blockReasons.join('; ')}`);
    }
    const result = await applyValidatedMatchRepair(prisma, {
      tenant: input.tenant,
      validatedMatch: matchPlan,
      downloadAndParse: input.downloadAndParse,
      skipPlanRegeneration: true,
    });
    results.push({ matchId: matchPlan.matchId, ...result });
  }

  return results;
}

export async function applyValidatedMatchRepair(
  prisma: PrismaService,
  input: {
    tenant: TenantInfo;
    validatedMatch: ValidatedMatchRepairPlan;
    downloadAndParse: (url: string) => Promise<ParsedFmfMatchReport>;
    skipPlanRegeneration?: boolean;
  },
): Promise<{
  statUpdatesApplied: number;
  events: { created: number; updated: number; deleted: number };
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
      matchOfficialEvents: {
        select: {
          id: true,
          factType: true,
          provenance: true,
          externalKey: true,
          playerId: true,
          technicalStaffId: true,
          sourceClock: true,
          period: true,
          sourceSections: true,
          sourceExcerpt: true,
        },
      },
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
    throw new Error('Source fingerprint divergiu — abortado; execute novo dry-run');
  }

  if (!input.skipPlanRegeneration) {
    const freshMatchPlan = (
      await planFmfDisciplineScopeRepair(prisma, {
        tenantId: input.tenant.id,
        matchIds: [input.validatedMatch.matchId],
        downloadAndParse: input.downloadAndParse,
        skipAllowlistForTests: true,
      })
    ).matches[0];
    if (!freshMatchPlan) throw new Error('Plano regenerado vazio');
    assertMatchPlansEqual(input.validatedMatch, freshMatchPlan);
  }

  assertLiveStateMatchesPlan(report, input.validatedMatch, ourSide);

  const staffPool = await prisma.technicalStaff.findMany({
    where: { tenantId: input.tenant.id },
    select: { id: true, name: true, role: true, licenseNumber: true },
  });
  const players = await prisma.player.findMany({
    where: { tenantId: input.tenant.id },
    select: { id: true, name: true, cbfRegistration: true, registrationProfile: true },
  });

  const cardDrafts = buildDisciplineCardDraftsForRepair({
    parsed,
    ourTeamSide: ourSide,
    players,
    staff: staffPool.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      licenseNumber: s.licenseNumber,
    })),
  });
  const draftsByExternalKey = new Map(cardDrafts.map((draft) => [draft.externalKey, draft]));

  if (input.validatedMatch.eventOperations.length > 0) {
    for (const operation of input.validatedMatch.eventOperations) {
      if (!draftsByExternalKey.has(operation.externalKey) && operation.op !== 'DELETE') {
        throw new Error(`Operação ${operation.op} ${operation.externalKey} sem draft — abortado`);
      }
    }
  }

  const patch = patchRawParsedDisciplineOnly(report.rawParsed, parsed, ourSide);
  if (patch.unrelatedFingerprint.before !== patch.unrelatedFingerprint.after) {
    throw new Error('Patch rawParsed alteraria conteúdo não-disciplinar — abortado');
  }

  let eventResult = { created: 0, updated: 0, deleted: 0 };

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

    if (input.validatedMatch.rawParsedPatch.willMutate) {
      await tx.fmfMatchReport.update({
        where: { id: report.id },
        data: {
          rawParsed: patch.patchedRaw as unknown as Prisma.InputJsonValue,
        },
      });
    }

    if (input.validatedMatch.eventOperations.length > 0) {
      eventResult = await applyDisciplineEventOperations(tx, {
        tenantId: input.tenant.id,
        matchId: report.id,
        operations: input.validatedMatch.eventOperations,
        draftsByExternalKey,
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

  return {
    statUpdatesApplied: input.validatedMatch.statUpdates.length,
    events: eventResult,
  };
}
