import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';
import { isFmfTeamMatch } from './fmf-team-match.util';
import {
  FMF_SYNC_TENANT_DEFAULTS,
  isFmfSyncTenantSlug,
} from './fmf-sync-tenants.config';
import {
  parseFmfMatchReportText,
  type FmfReportPlayerStat,
  type ParsedFmfMatchReport,
} from './fmf-match-report.parser';
import {
  buildPlayersByNormalizedName,
  normalizeFmfPlayerName,
  resolvePlayerForFmfStat,
} from './fmf-player-link.util';
import { syncFmfMatchIncidents } from '../futebol-jogos/football-match-records.sync';
import { FmfScraperService } from './fmf-scraper.service';

export interface FmfMatchReportCandidate {
  externalMatchId: string;
  reportUrl: string;
  preset: string;
  competition: string;
  category: string;
  phase: string | null;
  round: number | null;
  matchDate: string | null;
  kickoffTime: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  imported: boolean;
  importedAt: string | null;
  linkedPlayers: number;
  unresolvedPlayers: Array<{
    cbfRegistration: string;
    sourceName: string;
    reason: string;
  }>;
}

export interface FmfCadastroPendencyMatchRef {
  externalMatchId: string;
  matchDate: string | null;
  category: string;
  label: string;
  reportUrl: string | null;
}

export interface FmfCadastroPendencyPlayerRef {
  id: string;
  name: string;
  category: string | null;
  cbfRegistration: string | null;
  hasCbfInProfile: boolean;
}

export interface FmfCadastroPendencyItem {
  key: string;
  cbfRegistration: string;
  sourceName: string;
  reason: string;
  fixHint: string;
  matchCount: number;
  matches: FmfCadastroPendencyMatchRef[];
  candidatePlayers: FmfCadastroPendencyPlayerRef[];
}

export interface FmfCadastroPendenciesReport {
  tenantId: string;
  tenantName: string;
  generatedAt: string;
  items: FmfCadastroPendencyItem[];
  totals: {
    pendingGroups: number;
    pendingReferences: number;
    affectedMatches: number;
  };
}

interface ImportOptions {
  tenantId: string;
  externalMatchId?: string;
  preset?: string;
  all?: boolean;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
}

function digits(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/\D/g, '')
    : '';
}

function cbfFromProfile(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const sports = (value as { sports?: unknown }).sports;
  if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return '';
  return digits((sports as { cbf?: unknown }).cbf);
}

/** Snapshots antigos não guardavam o link do PDF da súmula. */
function storeHasReportLinks(store: {
  categories: Record<string, { matches: Array<{ reportUrl?: string | null }> } | null>;
}): boolean {
  return Object.values(store.categories).some((snapshot) =>
    (snapshot?.matches ?? []).some((match) => !!match.reportUrl),
  );
}

@Injectable()
export class FmfMatchReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: FmfScraperService,
  ) {}

  async listCandidates(
    tenantId: string,
    options: { allowRefresh?: boolean } = {},
  ): Promise<FmfMatchReportCandidate[]> {
    const tenant = await this.getTenant(tenantId);
    let store = await this.scraper.getStatus();
    if (options.allowRefresh === true && !storeHasReportLinks(store)) {
      // Snapshot salvo antes do link da súmula existir no parser: refaz uma vez.
      try {
        await this.scraper.runImport({ all: true });
        store = await this.scraper.getStatus();
      } catch {
        /* segue com o snapshot atual */
      }
    }
    const existing = await this.prisma.fmfMatchReport.findMany({
      where: { tenantId },
      select: {
        externalMatchId: true,
        importedAt: true,
        unresolvedPlayers: true,
        _count: { select: { playerStats: true } },
      },
    });
    const importedById = new Map(existing.map((row) => [row.externalMatchId, row]));
    const candidates: FmfMatchReportCandidate[] = [];

    for (const [preset, snapshot] of Object.entries(store.categories)) {
      if (!snapshot) continue;
      for (const match of snapshot.matches) {
        if (!match.reportUrl || !match.externalMatchId) continue;
        if (
          !isFmfTeamMatch(match.homeName, tenant.name, tenant.aliases) &&
          !isFmfTeamMatch(match.awayName, tenant.name, tenant.aliases)
        ) {
          continue;
        }
        const imported = importedById.get(match.externalMatchId);
        const unresolvedPlayers: FmfMatchReportCandidate['unresolvedPlayers'] = [];
        if (Array.isArray(imported?.unresolvedPlayers)) {
          for (const item of imported.unresolvedPlayers) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
            const row = item as Prisma.JsonObject;
            unresolvedPlayers.push({
              cbfRegistration:
                typeof row.cbfRegistration === 'string' ? row.cbfRegistration : '',
              sourceName: typeof row.sourceName === 'string' ? row.sourceName : '',
              reason: typeof row.reason === 'string' ? row.reason : 'Vínculo pendente',
            });
          }
        }
        candidates.push({
          externalMatchId: match.externalMatchId,
          reportUrl: match.reportUrl,
          preset,
          competition: snapshot.name,
          category: snapshot.fixtureCategory,
          phase: match.phaseLabel,
          round: match.roundNumber,
          matchDate: match.matchDate,
          kickoffTime: match.kickoffTime,
          homeTeam: match.homeName,
          awayTeam: match.awayName,
          homeScore: match.homeGoals,
          awayScore: match.awayGoals,
          imported: !!imported,
          importedAt: imported?.importedAt.toISOString() ?? null,
          linkedPlayers: imported?._count.playerStats ?? 0,
          unresolvedPlayers,
        });
      }
    }

    return candidates.sort((a, b) => {
      const dateCompare = (b.matchDate ?? '').localeCompare(a.matchDate ?? '');
      if (dateCompare !== 0) return dateCompare;
      return b.externalMatchId.localeCompare(a.externalMatchId);
    });
  }

  async importReports(options: ImportOptions) {
    if (!options.tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    const tenant = await this.getTenant(options.tenantId);
    let candidates = await this.listCandidates(options.tenantId, { allowRefresh: false });
    if (options.externalMatchId) {
      candidates = candidates.filter((item) => item.externalMatchId === options.externalMatchId);
    } else if (options.preset) {
      candidates = candidates.filter((item) => item.preset === options.preset);
    } else if (options.all) {
      candidates = candidates.filter((item) => !item.imported);
    } else {
      throw new BadRequestException('Informe externalMatchId, preset ou all=true.');
    }
    if (candidates.length === 0) {
      throw new NotFoundException('Nenhuma súmula FMF encontrada para os filtros informados.');
    }

    const results: Array<{
      externalMatchId: string;
      ok: boolean;
      linked: number;
      unresolved: number;
      error?: string;
    }> = [];
    for (const candidate of candidates) {
      try {
        const result = await this.importCandidate(tenant, candidate);
        results.push({
          externalMatchId: candidate.externalMatchId,
          ok: true,
          linked: result.linked,
          unresolved: result.unresolved,
        });
      } catch (error) {
        results.push({
          externalMatchId: candidate.externalMatchId,
          ok: false,
          linked: 0,
          unresolved: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await this.refreshPlayerCareerTotals(options.tenantId);
    return {
      tenantId: options.tenantId,
      imported: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      linked: results.reduce((sum, item) => sum + item.linked, 0),
      unresolved: results.reduce((sum, item) => sum + item.unresolved, 0),
      results,
    };
  }

  async reconcile(tenantId: string) {
    const reports = await this.prisma.fmfMatchReport.findMany({
      where: { tenantId },
      select: { externalMatchId: true },
    });
    const candidates = await this.listCandidates(tenantId);
    const byId = new Map(candidates.map((item) => [item.externalMatchId, item]));
    const tenant = await this.getTenant(tenantId);
    let linked = 0;
    let unresolved = 0;

    for (const report of reports) {
      const candidate = byId.get(report.externalMatchId);
      if (!candidate) continue;
      const result = await this.importCandidate(tenant, candidate);
      linked += result.linked;
      unresolved += result.unresolved;
    }
    await this.refreshPlayerCareerTotals(tenantId);
    return { tenantId, reports: reports.length, linked, unresolved };
  }

  async listCadastroPendencies(tenantId: string): Promise<FmfCadastroPendenciesReport> {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId.trim() },
      select: { id: true, name: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const storeCandidates = await this.listCandidates(tenantId, { allowRefresh: false });
    const reportUrlById = new Map(storeCandidates.map((row) => [row.externalMatchId, row.reportUrl]));

    const reports = await this.prisma.fmfMatchReport.findMany({
      where: { tenantId: tenant.id },
      select: {
        externalMatchId: true,
        matchDate: true,
        category: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        competition: true,
        sourceUrl: true,
        unresolvedPlayers: true,
      },
      orderBy: { matchDate: 'desc' },
    });

    type AggRow = {
      cbfRegistration: string;
      sourceName: string;
      reason: string;
      matches: Map<string, FmfCadastroPendencyMatchRef>;
    };
    const grouped = new Map<string, AggRow>();

    for (const report of reports) {
      if (!Array.isArray(report.unresolvedPlayers) || report.unresolvedPlayers.length === 0) continue;

      const dateKey = report.matchDate.toISOString().slice(0, 10);
      const score =
        report.homeScore != null && report.awayScore != null
          ? `${report.homeScore} x ${report.awayScore}`
          : '—';
      const matchRef: FmfCadastroPendencyMatchRef = {
        externalMatchId: report.externalMatchId,
        matchDate: dateKey,
        category: report.category,
        label: `${this.formatBrDate(dateKey)} · ${report.homeTeam} ${score} ${report.awayTeam}`,
        reportUrl: report.sourceUrl?.trim() || reportUrlById.get(report.externalMatchId) || null,
      };

      for (const raw of report.unresolvedPlayers) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const row = raw as Prisma.JsonObject;
        const cbfRegistration =
          typeof row.cbfRegistration === 'string' ? digits(row.cbfRegistration) : '';
        const sourceName = typeof row.sourceName === 'string' ? row.sourceName.trim() : '';
        const reason =
          typeof row.reason === 'string' && row.reason.trim()
            ? row.reason.trim()
            : 'Vínculo pendente';
        const key = `${cbfRegistration}|${normalizeFmfPlayerName(sourceName)}|${reason}`;
        const current = grouped.get(key) ?? {
          cbfRegistration,
          sourceName,
          reason,
          matches: new Map<string, FmfCadastroPendencyMatchRef>(),
        };
        current.matches.set(report.externalMatchId, matchRef);
        grouped.set(key, current);
      }
    }

    const players = await this.prisma.player.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        category: true,
        cbfRegistration: true,
        registrationProfile: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const items: FmfCadastroPendencyItem[] = [];
    for (const [key, group] of grouped) {
      const matches = [...group.matches.values()].sort((a, b) =>
        (b.matchDate ?? '').localeCompare(a.matchDate ?? ''),
      );
      const candidatePlayers = this.resolveCadastroPendencyCandidates(group, players);
      items.push({
        key,
        cbfRegistration: group.cbfRegistration,
        sourceName: group.sourceName,
        reason: group.reason,
        fixHint: this.buildCadastroPendencyFixHint(group.reason, candidatePlayers.length),
        matchCount: matches.length,
        matches,
        candidatePlayers,
      });
    }

    items.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.sourceName.localeCompare(b.sourceName, 'pt-BR');
    });

    const affectedMatches = new Set(items.flatMap((item) => item.matches.map((m) => m.externalMatchId)))
      .size;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      generatedAt: new Date().toISOString(),
      items,
      totals: {
        pendingGroups: items.length,
        pendingReferences: items.reduce((sum, item) => sum + item.matchCount, 0),
        affectedMatches,
      },
    };
  }

  async getPlayerStats(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, tenantId: true, cbfRegistration: true },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    const rows = await this.prisma.fmfPlayerMatchStat.findMany({
      where: { playerId },
      orderBy: { match: { matchDate: 'desc' } },
      include: {
        match: {
          select: {
            id: true,
            competition: true,
            phase: true,
            round: true,
            category: true,
            season: true,
            matchDate: true,
            homeTeam: true,
            awayTeam: true,
            homeScore: true,
            awayScore: true,
            sourceUrl: true,
          },
        },
      },
    });

    const summarize = (items: typeof rows) => ({
      matchesListed: items.length,
      matchesPlayed: items.filter((item) => item.played).length,
      starts: items.filter((item) => item.starter).length,
      minutesPlayed: items.reduce((sum, item) => sum + item.minutesPlayed, 0),
      goals: items.reduce((sum, item) => sum + item.goals, 0),
      penaltyGoals: items.reduce((sum, item) => sum + item.penaltyGoals, 0),
      ownGoals: items.reduce((sum, item) => sum + item.ownGoals, 0),
      yellowCards: items.reduce((sum, item) => sum + item.yellowCards, 0),
      redCards: items.reduce((sum, item) => sum + item.redCards, 0),
    });

    const bySeason = new Map<string, typeof rows>();
    const byYear = new Map<string, typeof rows>();
    for (const row of rows) {
      const seasonKey = `${row.match.season}:${row.match.competition}:${row.match.category}`;
      bySeason.set(seasonKey, [...(bySeason.get(seasonKey) ?? []), row]);
      const yearKey = String(row.match.season);
      byYear.set(yearKey, [...(byYear.get(yearKey) ?? []), row]);
    }

    return {
      player: {
        id: player.id,
        name: player.name,
        cbfRegistration: player.cbfRegistration,
      },
      total: summarize(rows),
      years: [...byYear.entries()]
        .map(([year, items]) => ({ year: Number(year), ...summarize(items) }))
        .sort((a, b) => b.year - a.year),
      seasons: [...bySeason.entries()]
        .map(([key, items]) => ({
          key,
          year: items[0].match.season,
          competition: items[0].match.competition,
          category: items[0].match.category,
          ...summarize(items),
        }))
        .sort((a, b) => b.year - a.year || a.competition.localeCompare(b.competition)),
      matches: rows.map((row) => ({
        id: row.id,
        match: row.match,
        jerseyNumber: row.jerseyNumber,
        starter: row.starter,
        listed: row.listed,
        played: row.played,
        enteredMinute: row.enteredMinute,
        exitedMinute: row.exitedMinute,
        minutesPlayed: row.minutesPlayed,
        goals: row.goals,
        ownGoals: row.ownGoals,
        penaltyGoals: row.penaltyGoals,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
      })),
    };
  }

  private async importCandidate(tenant: TenantInfo, candidate: FmfMatchReportCandidate) {
    const parsed = await this.downloadAndParse(candidate.reportUrl);
    const ourSide = isFmfTeamMatch(parsed.homeTeam, tenant.name, tenant.aliases)
      ? 'home'
      : isFmfTeamMatch(parsed.awayTeam, tenant.name, tenant.aliases)
        ? 'away'
        : null;
    if (!ourSide) throw new Error('O clube da súmula não corresponde ao clube selecionado.');

    const players = await this.prisma.player.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        cbfRegistration: true,
        registrationProfile: true,
      },
    });
    const playersByCbf = new Map<string, (typeof players)[number][]>();
    const backfills: Array<{ id: string; cbfRegistration: string }> = [];
    for (const player of players) {
      const cbf = digits(player.cbfRegistration) || cbfFromProfile(player.registrationProfile);
      if (!cbf) continue;
      playersByCbf.set(cbf, [...(playersByCbf.get(cbf) ?? []), player]);
      if (!player.cbfRegistration) backfills.push({ id: player.id, cbfRegistration: cbf });
    }
    if (backfills.length > 0) {
      await this.prisma.$transaction(
        backfills.map((item) =>
          this.prisma.player.update({
            where: { id: item.id },
            data: { cbfRegistration: item.cbfRegistration },
          }),
        ),
      );
    }

    const playersByName = buildPlayersByNormalizedName(players);

    const ourStats = parsed.stats.filter((item) => item.teamSide === ourSide);
    const linked: Array<{ stat: FmfReportPlayerStat; playerId: string }> = [];
    const unresolved: Array<FmfReportPlayerStat & { reason: string }> = [];
    for (const stat of ourStats) {
      const resolved = resolvePlayerForFmfStat(stat, playersByCbf, playersByName, players);
      if (resolved.ok) {
        linked.push({ stat, playerId: resolved.playerId });
      } else {
        unresolved.push({ ...stat, reason: resolved.reason });
      }
    }

    const match = await this.prisma.fmfMatchReport.upsert({
      where: {
        tenantId_externalMatchId: {
          tenantId: tenant.id,
          externalMatchId: candidate.externalMatchId,
        },
      },
      create: this.matchData(tenant.id, candidate, parsed, unresolved),
      update: this.matchData(tenant.id, candidate, parsed, unresolved),
    });

    await this.prisma.$transaction([
      this.prisma.fmfPlayerMatchStat.deleteMany({ where: { matchId: match.id } }),
      ...(linked.length > 0
        ? [
            this.prisma.fmfPlayerMatchStat.createMany({
              data: linked.map(({ stat, playerId }) => ({
                matchId: match.id,
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
            }),
          ]
        : []),
    ]);

    await syncFmfMatchIncidents(this.prisma, {
      tenantId: tenant.id,
      matchId: match.id,
      occurrencesText: parsed.occurrencesText,
      occurrences: parsed.occurrences,
    });

    return { linked: linked.length, unresolved: unresolved.length };
  }

  private matchData(
    tenantId: string,
    candidate: FmfMatchReportCandidate,
    parsed: ParsedFmfMatchReport,
    unresolved: Array<FmfReportPlayerStat & { reason: string }>,
  ): Prisma.FmfMatchReportUncheckedCreateInput {
    return {
      tenantId,
      externalMatchId: candidate.externalMatchId,
      sourceUrl: candidate.reportUrl,
      competition: parsed.competition || candidate.competition,
      phase: parsed.phase ?? candidate.phase,
      round: parsed.round ?? candidate.round,
      category: candidate.category || parsed.category,
      season: parsed.season,
      matchDate: new Date(`${parsed.matchDate}T12:00:00-03:00`),
      kickoffTime: parsed.kickoffTime,
      homeTeam: parsed.homeTeam,
      awayTeam: parsed.awayTeam,
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      firstHalfMinutes: parsed.firstHalfMinutes,
      secondHalfMinutes: parsed.secondHalfMinutes,
      totalMinutes: parsed.totalMinutes,
      rawParsed: parsed as unknown as Prisma.InputJsonValue,
      unresolvedPlayers: unresolved as unknown as Prisma.InputJsonValue,
      importedAt: new Date(),
    };
  }

  private async downloadAndParse(url: string): Promise<ParsedFmfMatchReport> {
    const parser = new PDFParse({ url });
    try {
      const result = await parser.getText();
      return parseFmfMatchReportText(result.text);
    } finally {
      await parser.destroy();
    }
  }

  private formatBrDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  private buildCadastroPendencyFixHint(reason: string, candidateCount: number): string {
    if (reason === 'Registro CBF duplicado no cadastro') {
      return 'Corrija o CBF duplicado nas fichas indicadas.';
    }
    if (reason === 'Nome duplicado no cadastro (sem CBF único)') {
      return 'Defina o CBF correto na ficha do atleta certo.';
    }
    if (candidateCount === 1) {
      return 'Informe ou confira o registro CBF na ficha do atleta.';
    }
    if (candidateCount > 1) {
      return 'Escolha a ficha correta e ajuste o registro CBF.';
    }
    return 'Cadastre o atleta ou vincule o registro CBF na ficha.';
  }

  private resolveCadastroPendencyCandidates(
    group: { cbfRegistration: string; sourceName: string; reason: string },
    players: Array<{
      id: string;
      name: string;
      category: string | null;
      cbfRegistration: string | null;
      registrationProfile: unknown;
    }>,
  ): FmfCadastroPendencyPlayerRef[] {
    const toRef = (player: (typeof players)[number]): FmfCadastroPendencyPlayerRef => {
      const profileCbf = cbfFromProfile(player.registrationProfile);
      return {
        id: player.id,
        name: player.name,
        category: player.category,
        cbfRegistration: player.cbfRegistration?.trim() || profileCbf || null,
        hasCbfInProfile: !!profileCbf,
      };
    };

    const cbf = digits(group.cbfRegistration);
    const byCbf = players.filter((player) => {
      if (!cbf) return false;
      const reg = digits(player.cbfRegistration) || cbfFromProfile(player.registrationProfile);
      return reg === cbf;
    });
    if (group.reason === 'Registro CBF duplicado no cadastro' || byCbf.length > 1) {
      return byCbf.map(toRef);
    }
    if (byCbf.length === 1) return [toRef(byCbf[0]!)];

    const nameKey = normalizeFmfPlayerName(group.sourceName);
    const byName = nameKey
      ? players.filter((player) => normalizeFmfPlayerName(player.name) === nameKey)
      : [];
    if (group.reason === 'Nome duplicado no cadastro (sem CBF único)' || byName.length > 1) {
      return byName.map(toRef);
    }
    if (byName.length === 1) return [toRef(byName[0]!)];

    if (nameKey.length >= 4) {
      const partial = players.filter((player) => {
        const playerKey = normalizeFmfPlayerName(player.name);
        return playerKey.includes(nameKey) || nameKey.includes(playerKey);
      });
      if (partial.length > 0 && partial.length <= 5) return partial.map(toRef);
    }

    return [];
  }

  private async getTenant(tenantId: string): Promise<TenantInfo> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, tradeName: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');
    const aliases = [
      ...(isFmfSyncTenantSlug(tenant.slug)
        ? FMF_SYNC_TENANT_DEFAULTS[tenant.slug].fmfTeamNames
        : [tenant.name]),
      ...(tenant.tradeName?.trim() ? [tenant.tradeName.trim()] : []),
    ];
    return { id: tenant.id, name: tenant.name, slug: tenant.slug, aliases };
  }

  private async refreshPlayerCareerTotals(tenantId: string): Promise<void> {
    const stats = await this.prisma.fmfPlayerMatchStat.findMany({
      where: { player: { tenantId } },
      select: {
        playerId: true,
        played: true,
        goals: true,
        yellowCards: true,
        redCards: true,
      },
    });
    const totals = new Map<
      string,
      { matchesPlayed: number; goals: number; yellowCards: number; redCards: number }
    >();
    for (const stat of stats) {
      const current = totals.get(stat.playerId) ?? {
        matchesPlayed: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
      };
      if (stat.played) current.matchesPlayed += 1;
      current.goals += stat.goals;
      current.yellowCards += stat.yellowCards;
      current.redCards += stat.redCards;
      totals.set(stat.playerId, current);
    }
    if (totals.size === 0) return;
    await this.prisma.$transaction(
      [...totals.entries()].map(([playerId, total]) =>
        this.prisma.player.update({ where: { id: playerId }, data: total }),
      ),
    );
  }
}
