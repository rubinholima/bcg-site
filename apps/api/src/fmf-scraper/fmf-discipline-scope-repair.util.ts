import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import { syncMatchOfficialEvents } from './match-official-events.sync';
import { syncFmfMatchIncidents } from '../futebol-jogos/football-match-records.sync';
import {
  buildPlayersByNormalizedName,
  resolvePlayerForFmfStat,
} from './fmf-player-link.util';
import { isFmfTeamMatch } from './fmf-team-match.util';
import type { FmfReportPlayerStat } from './fmf-match-report.parser';

export type ScopeRepairMatchPlan = {
  matchId: string;
  externalMatchId: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  safe: boolean;
  blockReasons: string[];
  statChanges: Array<{
    playerId: string | null;
    cbfRegistration: string | null;
    playerName: string;
    before: { yellowCards: number; redCards: number } | null;
    after: { yellowCards: number; redCards: number };
  }>;
  eventChanges: {
    before: { playerYellow: number; playerRed: number; staffYellow: number; staffRed: number };
    after: { playerYellow: number; playerRed: number; staffYellow: number; staffRed: number };
  };
};

export type ScopeRepairPlan = {
  dryRun: boolean;
  tenantId: string;
  matchIds: string[];
  competitionFilter: string | null;
  matches: ScopeRepairMatchPlan[];
  safeCount: number;
  blockedCount: number;
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

function countEvents(events: Array<{ factType: string }>) {
  return {
    playerYellow: events.filter((e) => e.factType === 'PLAYER_YELLOW_CARD').length,
    playerRed: events.filter((e) => e.factType === 'PLAYER_RED_CARD').length,
    staffYellow: events.filter((e) => e.factType === 'STAFF_YELLOW_CARD').length,
    staffRed: events.filter((e) => e.factType === 'STAFF_RED_CARD').length,
  };
}

function statKey(stat: { cbfRegistration?: string | null; sourceName?: string; jerseyNumber?: number }) {
  return `${digits(stat.cbfRegistration) || stat.sourceName || ''}:${stat.jerseyNumber ?? ''}`;
}

export async function planFmfDisciplineScopeRepair(
  prisma: PrismaService,
  input: {
    tenantId: string;
    matchIds: string[];
    competitionContains?: string;
    downloadAndParse: (url: string) => Promise<ParsedFmfMatchReport>;
  },
): Promise<ScopeRepairPlan> {
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

  const matches: ScopeRepairMatchPlan[] = [];

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

    const ourSide = parsed
      ? isFmfTeamMatch(parsed.homeTeam, clubName, aliases)
        ? 'home'
        : isFmfTeamMatch(parsed.awayTeam, clubName, aliases)
          ? 'away'
          : null
      : null;
    if (parsed && !ourSide) {
      blockReasons.push('Clube não identificado na súmula reparseada');
    }

    const beforeByPlayer = new Map(
      report.playerStats.map((s) => [
        s.playerId,
        { yellowCards: s.yellowCards, redCards: s.redCards },
      ]),
    );

    const statChanges: ScopeRepairMatchPlan['statChanges'] = [];
    if (parsed && ourSide) {
      const ourStats = parsed.stats.filter((s) => s.teamSide === ourSide);
      const afterByKey = new Map<string, { stat: FmfReportPlayerStat; playerId: string | null }>();

      for (const stat of ourStats) {
        const resolved = resolvePlayerForFmfStat(stat, playersByCbf, playersByName, players);
        const playerId = resolved.ok ? resolved.playerId : null;
        afterByKey.set(statKey(stat), { stat, playerId });
        const before = playerId ? beforeByPlayer.get(playerId) ?? null : null;
        const after = { yellowCards: stat.yellowCards, redCards: stat.redCards };
        if (
          !before ||
          before.yellowCards !== after.yellowCards ||
          before.redCards !== after.redCards
        ) {
          statChanges.push({
            playerId,
            cbfRegistration: stat.cbfRegistration,
            playerName: stat.sourceName,
            before,
            after,
          });
        }
      }

      for (const [playerId, before] of beforeByPlayer) {
        const stillPresent = [...afterByKey.values()].some((row) => row.playerId === playerId);
        if (!stillPresent && (before.yellowCards > 0 || before.redCards > 0)) {
          blockReasons.push(
            `Stats atuais do player ${playerId} não regeneráveis do PDF (possível override manual)`,
          );
        }
      }
    }

    const eventChanges = {
      before: countEvents(report.matchOfficialEvents),
      after: parsed
        ? {
            playerYellow: parsed.playerCardEvents.filter((c) => c.kind === 'yellow').length,
            playerRed: parsed.playerCardEvents.filter((c) => c.kind === 'red').length,
            staffYellow: parsed.staffCardEvents.filter((c) => c.kind === 'yellow').length,
            staffRed: parsed.staffCardEvents.filter((c) => c.kind === 'red').length,
          }
        : countEvents(report.matchOfficialEvents),
    };

    matches.push({
      matchId: report.id,
      externalMatchId: report.externalMatchId,
      competition: report.competition,
      homeTeam: report.homeTeam,
      awayTeam: report.awayTeam,
      matchDate: report.matchDate.toISOString(),
      safe: blockReasons.length === 0,
      blockReasons,
      statChanges,
      eventChanges,
    });
  }

  return {
    dryRun: true,
    tenantId: input.tenantId,
    matchIds: input.matchIds,
    competitionFilter: input.competitionContains ?? null,
    matches,
    safeCount: matches.filter((m) => m.safe).length,
    blockedCount: matches.filter((m) => !m.safe).length,
  };
}

export async function applyFmfDisciplineScopeRepair(
  prisma: PrismaService,
  input: {
    tenant: TenantInfo;
    matchId: string;
    parsed: ParsedFmfMatchReport;
    downloadAndParse: (url: string) => Promise<ParsedFmfMatchReport>;
  },
): Promise<{ linked: number; unresolved: number; events: { created: number; updated: number; removed: number } }> {
  const clubName = input.tenant.tradeName?.trim() || input.tenant.name;
  const aliases = input.tenant.aliases;

  const report = await prisma.fmfMatchReport.findFirst({
    where: { id: input.matchId, tenantId: input.tenant.id },
    include: { coachStatOverride: true },
  });
  if (!report) throw new Error('Partida não encontrada');
  if (report.coachStatOverride) {
    throw new Error('Partida bloqueada: CoachMatchStatOverride');
  }

  const plan = await planFmfDisciplineScopeRepair(prisma, {
    tenantId: input.tenant.id,
    matchIds: [input.matchId],
    downloadAndParse: input.downloadAndParse,
  });
  const matchPlan = plan.matches[0];
  if (!matchPlan?.safe) {
    throw new Error(`Partida insegura: ${matchPlan?.blockReasons.join('; ')}`);
  }

  const parsed = input.parsed;
  const ourSide = isFmfTeamMatch(parsed.homeTeam, clubName, aliases)
    ? 'home'
    : isFmfTeamMatch(parsed.awayTeam, clubName, aliases)
      ? 'away'
      : null;
  if (!ourSide) throw new Error('Clube não identificado na súmula');

  const players = await prisma.player.findMany({
    where: { tenantId: input.tenant.id },
    select: { id: true, name: true, cbfRegistration: true, registrationProfile: true },
  });
  const playersByCbf = buildPlayersByCbf(players);
  const playersByName = buildPlayersByNormalizedName(players);

  const ourStats = parsed.stats.filter((s) => s.teamSide === ourSide);
  const linked: Array<{ stat: FmfReportPlayerStat; playerId: string }> = [];
  const unresolved: Array<FmfReportPlayerStat & { reason: string }> = [];
  for (const stat of ourStats) {
    const resolved = resolvePlayerForFmfStat(stat, playersByCbf, playersByName, players);
    if (resolved.ok) linked.push({ stat, playerId: resolved.playerId });
    else unresolved.push({ ...stat, reason: resolved.reason });
  }

  const staffPool = await prisma.technicalStaff.findMany({
    where: { tenantId: input.tenant.id },
    select: { id: true, name: true, role: true, licenseNumber: true },
  });

  let eventResult = { created: 0, updated: 0, removed: 0 };

  await prisma.$transaction(async (tx) => {
    await tx.fmfMatchReport.update({
      where: { id: report.id },
      data: {
        competition: parsed.competition || report.competition,
        phase: parsed.phase,
        round: parsed.round,
        category: parsed.category,
        homeTeam: parsed.homeTeam,
        awayTeam: parsed.awayTeam,
        homeScore: parsed.homeScore,
        awayScore: parsed.awayScore,
        firstHalfMinutes: parsed.firstHalfMinutes,
        secondHalfMinutes: parsed.secondHalfMinutes,
        totalMinutes: parsed.totalMinutes,
        rawParsed: parsed as unknown as Prisma.InputJsonValue,
        unresolvedPlayers: unresolved as unknown as Prisma.InputJsonValue,
        occurrencesText: parsed.occurrencesText,
      },
    });

    await tx.fmfPlayerMatchStat.deleteMany({ where: { matchId: report.id } });
    if (linked.length > 0) {
      await tx.fmfPlayerMatchStat.createMany({
        data: linked.map(({ stat, playerId }) => ({
          matchId: report.id,
          playerId,
          cbfRegistration: stat.cbfRegistration,
          playerName: stat.sourceName,
          jerseyNumber: stat.jerseyNumber,
          starter: stat.starter,
          listed: true,
          played: stat.played,
          enteredMinute: stat.enteredMinute,
          exitedMinute: stat.exitedMinute,
          minutesPlayed: stat.minutesPlayed,
          goals: stat.goals,
          ownGoals: stat.ownGoals,
          penaltyGoals: stat.penaltyGoals,
          yellowCards: stat.yellowCards,
          redCards: stat.redCards,
        })),
      });
    }
  });

  await syncFmfMatchIncidents(prisma, {
    tenantId: input.tenant.id,
    matchId: report.id,
    occurrencesText: parsed.occurrencesText,
    occurrences: parsed.occurrences,
  });

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

  return {
    linked: linked.length,
    unresolved: unresolved.length,
    events: eventResult,
  };
}
