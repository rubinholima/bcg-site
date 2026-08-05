import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FutebolRelatoriosService } from './futebol-relatorios.service';
import {
  getFootballPositionLabel,
  normalizeFootballPositionCode,
} from '../common/football-positions.util';
import { addDaysToDateKey } from '../common/brazil-time.util';
import { isFmfTeamMatch } from '../fmf-scraper/fmf-team-match.util';
import {
  FMF_SYNC_TENANT_DEFAULTS,
  isFmfSyncTenantSlug,
} from '../fmf-scraper/fmf-sync-tenants.config';
import { softNormalizeTeamNameKey } from '../public/visiting-team-logo-merge.util';
import type { FmfScraperStore } from '../fmf-scraper/fmf-scraper.service';
import type {
  GuiaAgendaDay,
  GuiaCampaignLine,
  GuiaLineup,
  GuiaLineupPlayer,
  GuiaMatchLine,
  GuiaPartidaReportDto,
  GuiaPositionGroup,
  GuiaRankingRow,
  GuiaSquadPlayer,
  GuiaStandingRow,
  GuiaStatLine,
} from './guia-partida.types';

const FMF_STORE_KEY = 'fmf_scraper_data';

type ReportWithStats = {
  id: string;
  competition: string;
  phase: string | null;
  round: number | null;
  category: string;
  season: number;
  matchDate: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  playerStats: {
    playerId: string;
    playerName: string;
    jerseyNumber: number | null;
    starter: boolean;
    played: boolean;
    minutesPlayed: number;
    goals: number;
    yellowCards: number;
    redCards: number;
    enteredMinute: number | null;
    exitedMinute: number | null;
  }[];
};

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return full.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function positionGroupOf(position: string | null | undefined): GuiaPositionGroup {
  const code = normalizeFootballPositionCode(position);
  switch (code) {
    case 'GOLEIRO':
      return 'GOL';
    case 'ZAGUEIRO':
    case 'LATERAL ESQUERDO':
    case 'LATERAL DIREITO':
      return 'DEF';
    case 'VOLANTE':
    case 'MEIO-CAMPO':
      return 'MEI';
    case 'EXTREMO':
    case 'CENTROAVANTE':
      return 'ATA';
    default:
      return 'MEI';
  }
}

function categoryKey(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function ageAt(birthDate: string | null | undefined, reference: Date): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  let age = reference.getFullYear() - y;
  const monthDiff = reference.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < d)) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function dateLabelBr(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function emptyCampaign(label: string): GuiaCampaignLine {
  return {
    label,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    winRate: 0,
  };
}

function emptyStatLine(label: string): GuiaStatLine {
  return {
    label,
    matches: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    yellowCards: 0,
    redCards: 0,
  };
}

function finishCampaign(line: GuiaCampaignLine): GuiaCampaignLine {
  const played = line.matches;
  return {
    ...line,
    goalDiff: line.goalsFor - line.goalsAgainst,
    winRate: played > 0 ? Math.round(((line.wins * 3 + line.draws) / (played * 3)) * 100) : 0,
  };
}

@Injectable()
export class GuiaPartidaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relatorios: FutebolRelatoriosService,
  ) {}

  async getGuiaPartida(travelId: string): Promise<GuiaPartidaReportDto> {
    const pressKit = await this.relatorios.getPressKit(travelId);
    const travel = pressKit.travel;
    const tenantId = travel.tenant.id;
    const clubName = travel.tenant.tradeName?.trim() || travel.tenant.name;
    const matchDate = new Date(`${travel.matchDate}T12:00:00-03:00`);
    const season = matchDate.getFullYear();
    const aliases = await this.tenantAliases(tenantId, travel.tenant.name);
    const catKeys = travel.categories.map(categoryKey).filter(Boolean);

    const allReports = (await this.prisma.fmfMatchReport.findMany({
      where: { tenantId },
      orderBy: { matchDate: 'desc' },
      include: {
        playerStats: {
          select: {
            playerId: true,
            playerName: true,
            jerseyNumber: true,
            starter: true,
            played: true,
            minutesPlayed: true,
            goals: true,
            yellowCards: true,
            redCards: true,
            enteredMinute: true,
            exitedMinute: true,
          },
        },
      },
    })) as unknown as ReportWithStats[];

    const categoryReports =
      catKeys.length > 0
        ? allReports.filter((r) => catKeys.includes(categoryKey(r.category)))
        : allReports;
    const reports = categoryReports.length > 0 ? categoryReports : allReports;
    const seasonReports = reports.filter((r) => r.season === season);
    const played = seasonReports.filter(
      (r) => r.homeScore != null && r.awayScore != null,
    );

    const lines = reports.map((report) => this.toMatchLine(report, clubName, aliases));
    const seasonLines = lines.filter((line) => {
      const report = reports.find((r) => r.id === line.id);
      return report?.season === season;
    });

    const squad = await this.buildSquad(pressKit, seasonReports, allReports, matchDate);
    const campaign = this.buildCampaign(played, clubName, aliases);
    const headToHead = this.buildHeadToHead(lines, travel.opponentName);
    const lastLineups = this.buildLastLineups(seasonReports, squad, clubName, aliases);
    const rankings = this.buildRankings(seasonReports, squad);
    const agenda = await this.buildAgenda(tenantId, travel.categories, travel.matchDate);
    const nextMatches = await this.buildNextMatches(tenantId, travelId, matchDate);
    const standings = await this.buildStandings(
      travel.categories,
      travel.championshipName,
      clubName,
      aliases,
    );

    return {
      travel,
      config: pressKit.config,
      opponentLogoUrl: pressKit.opponentLogoUrl,
      championshipLogoUrl: pressKit.championshipLogoUrl,
      season,
      squad,
      staff: pressKit.staff,
      campaign,
      headToHead,
      recentResults: seasonLines.filter((l) => l.result != null).slice(0, 6),
      lastLineups,
      topScorers: rankings.topScorers,
      topMinutes: rankings.topMinutes,
      topCards: rankings.topCards,
      agenda,
      nextMatches,
      standings,
      hasOfficialData: seasonReports.length > 0,
      generatedAt: new Date().toISOString(),
    };
  }

  private async tenantAliases(tenantId: string, name: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (tenant?.slug && isFmfSyncTenantSlug(tenant.slug)) {
      return [...FMF_SYNC_TENANT_DEFAULTS[tenant.slug].fmfTeamNames];
    }
    return [name];
  }

  private isHomeSide(report: ReportWithStats, name: string, aliases: string[]): boolean {
    return isFmfTeamMatch(report.homeTeam, name, aliases);
  }

  private toMatchLine(
    report: ReportWithStats,
    clubName: string,
    aliases: string[],
  ): GuiaMatchLine {
    const isHome = this.isHomeSide(report, clubName, aliases);
    const ourGoals = isHome ? report.homeScore : report.awayScore;
    const theirGoals = isHome ? report.awayScore : report.homeScore;
    const result =
      ourGoals == null || theirGoals == null
        ? null
        : ourGoals > theirGoals
          ? 'V'
          : ourGoals === theirGoals
            ? 'E'
            : 'D';
    return {
      id: report.id,
      date: report.matchDate.toISOString().slice(0, 10),
      dateLabel: dateLabelBr(report.matchDate),
      competition: report.competition,
      phase: report.phase,
      round: report.round,
      homeTeam: report.homeTeam,
      awayTeam: report.awayTeam,
      homeScore: report.homeScore,
      awayScore: report.awayScore,
      scoreLabel:
        report.homeScore == null || report.awayScore == null
          ? '—'
          : `${report.homeScore} x ${report.awayScore}`,
      isHome,
      opponent: isHome ? report.awayTeam : report.homeTeam,
      result,
    };
  }

  private buildCampaign(
    reports: ReportWithStats[],
    clubName: string,
    aliases: string[],
  ): GuiaPartidaReportDto['campaign'] {
    const overall = emptyCampaign('Temporada');
    const home = emptyCampaign('Em casa');
    const away = emptyCampaign('Fora de casa');
    const byCompetition = new Map<string, GuiaCampaignLine>();

    for (const report of reports) {
      const isHome = this.isHomeSide(report, clubName, aliases);
      const ourGoals = (isHome ? report.homeScore : report.awayScore) ?? 0;
      const theirGoals = (isHome ? report.awayScore : report.homeScore) ?? 0;
      const competition = report.competition.trim() || 'Competição';
      const target = byCompetition.get(competition) ?? emptyCampaign(competition);

      for (const line of [overall, isHome ? home : away, target]) {
        line.matches += 1;
        line.goalsFor += ourGoals;
        line.goalsAgainst += theirGoals;
        if (ourGoals > theirGoals) line.wins += 1;
        else if (ourGoals === theirGoals) line.draws += 1;
        else line.losses += 1;
      }
      byCompetition.set(competition, target);
    }

    return {
      overall: finishCampaign(overall),
      byCompetition: [...byCompetition.values()]
        .map(finishCampaign)
        .sort((a, b) => b.matches - a.matches),
      home: finishCampaign(home),
      away: finishCampaign(away),
    };
  }

  private buildHeadToHead(
    lines: GuiaMatchLine[],
    opponentName: string | null,
  ): GuiaPartidaReportDto['headToHead'] {
    const wanted = softNormalizeTeamNameKey(opponentName ?? '');
    const matches = wanted
      ? lines.filter((line) => {
          const key = softNormalizeTeamNameKey(line.opponent);
          return key === wanted || key.includes(wanted) || wanted.includes(key);
        })
      : [];

    const summary = {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      matches: matches.slice(0, 8),
    };

    for (const line of matches) {
      if (line.result == null) continue;
      summary.played += 1;
      if (line.result === 'V') summary.wins += 1;
      else if (line.result === 'E') summary.draws += 1;
      else summary.losses += 1;
      const ourGoals = line.isHome ? (line.homeScore ?? 0) : (line.awayScore ?? 0);
      const theirGoals = line.isHome ? (line.awayScore ?? 0) : (line.homeScore ?? 0);
      summary.goalsFor += ourGoals;
      summary.goalsAgainst += theirGoals;
    }

    return summary;
  }

  private async buildSquad(
    pressKit: Awaited<ReturnType<FutebolRelatoriosService['getPressKit']>>,
    seasonReports: ReportWithStats[],
    allReports: ReportWithStats[],
    matchDate: Date,
  ): Promise<GuiaSquadPlayer[]> {
    const playerIds = pressKit.athletes
      .map((a) => a.playerId)
      .filter((id): id is string => !!id);
    const players =
      playerIds.length > 0
        ? await this.prisma.player.findMany({
            where: { id: { in: playerIds } },
            select: {
              id: true,
              height: true,
              weight: true,
              position: true,
              jerseyNumber: true,
            },
          })
        : [];
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const starterIds = new Set(pressKit.config.starterPlayerIds);

    const seasonByPlayer = new Map<string, GuiaStatLine>();
    const competitionByPlayer = new Map<string, Map<string, GuiaStatLine>>();
    for (const report of seasonReports) {
      const competition = report.competition.trim() || 'Competição';
      for (const stat of report.playerStats) {
        const total = seasonByPlayer.get(stat.playerId) ?? emptyStatLine('Temporada');
        const perComp = competitionByPlayer.get(stat.playerId) ?? new Map<string, GuiaStatLine>();
        const comp = perComp.get(competition) ?? emptyStatLine(competition);
        for (const line of [total, comp]) {
          if (stat.played) line.matches += 1;
          if (stat.starter) line.starts += 1;
          line.minutes += stat.minutesPlayed;
          line.goals += stat.goals;
          line.yellowCards += stat.yellowCards;
          line.redCards += stat.redCards;
        }
        perComp.set(competition, comp);
        competitionByPlayer.set(stat.playerId, perComp);
        seasonByPlayer.set(stat.playerId, total);
      }
    }

    const careerByPlayer = new Map<string, GuiaSquadPlayer['career']>();
    for (const report of allReports) {
      for (const stat of report.playerStats) {
        const career = careerByPlayer.get(stat.playerId) ?? {
          matches: 0,
          minutes: 0,
          goals: 0,
          yellowCards: 0,
          redCards: 0,
        };
        if (stat.played) career.matches += 1;
        career.minutes += stat.minutesPlayed;
        career.goals += stat.goals;
        career.yellowCards += stat.yellowCards;
        career.redCards += stat.redCards;
        careerByPlayer.set(stat.playerId, career);
      }
    }

    const rows = pressKit.athletes.map((athlete) => {
      const player = athlete.playerId ? playerMap.get(athlete.playerId) : undefined;
      const position = athlete.position ?? player?.position ?? null;
      const season = athlete.playerId
        ? (seasonByPlayer.get(athlete.playerId) ?? emptyStatLine('Temporada'))
        : emptyStatLine('Temporada');
      const byCompetition = athlete.playerId
        ? [...(competitionByPlayer.get(athlete.playerId)?.values() ?? [])].sort(
            (a, b) => b.matches - a.matches,
          )
        : [];
      return {
        playerId: athlete.playerId ?? null,
        name: athlete.name,
        shortName: shortName(athlete.name),
        jerseyNumber: athlete.jerseyNumber ?? player?.jerseyNumber ?? null,
        position,
        positionLabel: getFootballPositionLabel(position) || '—',
        positionGroup: positionGroupOf(position),
        birthDate: athlete.birthDate,
        age: ageAt(athlete.birthDate, matchDate),
        height: player?.height ?? null,
        weight: player?.weight ?? null,
        photoUrl: athlete.photoUrl ?? null,
        isStarter: athlete.playerId ? starterIds.has(athlete.playerId) : false,
        season,
        byCompetition,
        career: athlete.playerId
          ? (careerByPlayer.get(athlete.playerId) ?? {
              matches: 0,
              minutes: 0,
              goals: 0,
              yellowCards: 0,
              redCards: 0,
            })
          : { matches: 0, minutes: 0, goals: 0, yellowCards: 0, redCards: 0 },
      } satisfies GuiaSquadPlayer;
    });

    const groupOrder: Record<GuiaPositionGroup, number> = { GOL: 0, DEF: 1, MEI: 2, ATA: 3 };
    return rows.sort((a, b) => {
      const byGroup = groupOrder[a.positionGroup] - groupOrder[b.positionGroup];
      if (byGroup !== 0) return byGroup;
      const an = a.jerseyNumber ?? 999;
      const bn = b.jerseyNumber ?? 999;
      if (an !== bn) return an - bn;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }

  private buildLastLineups(
    seasonReports: ReportWithStats[],
    squad: GuiaSquadPlayer[],
    clubName: string,
    aliases: string[],
  ): GuiaLineup[] {
    const byPlayer = new Map(squad.filter((p) => p.playerId).map((p) => [p.playerId!, p]));
    return seasonReports
      .filter((report) => report.playerStats.length > 0)
      .slice(0, 3)
      .map((report) => {
        const toRow = (stat: ReportWithStats['playerStats'][number]): GuiaLineupPlayer => {
          const known = byPlayer.get(stat.playerId);
          const name = known?.name ?? stat.playerName;
          return {
            playerId: stat.playerId,
            name,
            shortName: shortName(name),
            jerseyNumber: stat.jerseyNumber ?? known?.jerseyNumber ?? null,
            positionGroup: known?.positionGroup ?? 'MEI',
            minutes: stat.minutesPlayed,
            goals: stat.goals,
            enteredMinute: stat.enteredMinute,
            exitedMinute: stat.exitedMinute,
          };
        };

        const starters = report.playerStats
          .filter((stat) => stat.starter)
          .map(toRow)
          .sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999));
        const bench = report.playerStats
          .filter((stat) => !stat.starter && stat.played)
          .map(toRow)
          .sort((a, b) => (a.enteredMinute ?? 999) - (b.enteredMinute ?? 999));

        return {
          match: this.toMatchLine(report, clubName, aliases),
          starters,
          bench,
        };
      });
  }

  private buildRankings(
    seasonReports: ReportWithStats[],
    squad: GuiaSquadPlayer[],
  ): {
    topScorers: GuiaRankingRow[];
    topMinutes: GuiaRankingRow[];
    topCards: GuiaRankingRow[];
  } {
    const byPlayer = new Map(squad.filter((p) => p.playerId).map((p) => [p.playerId!, p]));
    const totals = new Map<
      string,
      { name: string; jerseyNumber: number | null; goals: number; minutes: number; matches: number; yellow: number; red: number }
    >();

    for (const report of seasonReports) {
      for (const stat of report.playerStats) {
        const known = byPlayer.get(stat.playerId);
        const current = totals.get(stat.playerId) ?? {
          name: known?.name ?? stat.playerName,
          jerseyNumber: known?.jerseyNumber ?? stat.jerseyNumber ?? null,
          goals: 0,
          minutes: 0,
          matches: 0,
          yellow: 0,
          red: 0,
        };
        if (stat.played) current.matches += 1;
        current.goals += stat.goals;
        current.minutes += stat.minutesPlayed;
        current.yellow += stat.yellowCards;
        current.red += stat.redCards;
        totals.set(stat.playerId, current);
      }
    }

    const rows = [...totals.entries()];
    const toRanking = (
      playerId: string,
      total: (typeof rows)[number][1],
      value: number,
      detail: string | null,
    ): GuiaRankingRow => ({
      playerId,
      name: total.name,
      shortName: shortName(total.name),
      jerseyNumber: total.jerseyNumber,
      value,
      detail,
    });

    const topScorers = rows
      .filter(([, t]) => t.goals > 0)
      .sort((a, b) => b[1].goals - a[1].goals || b[1].minutes - a[1].minutes)
      .slice(0, 8)
      .map(([id, t]) => toRanking(id, t, t.goals, `${t.matches} jogo${t.matches === 1 ? '' : 's'}`));

    const topMinutes = rows
      .filter(([, t]) => t.minutes > 0)
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 8)
      .map(([id, t]) => toRanking(id, t, t.minutes, `${t.matches} jogo${t.matches === 1 ? '' : 's'}`));

    const topCards = rows
      .filter(([, t]) => t.yellow + t.red > 0)
      .sort((a, b) => b[1].red - a[1].red || b[1].yellow - a[1].yellow)
      .slice(0, 8)
      .map(([id, t]) =>
        toRanking(id, t, t.yellow + t.red, `${t.yellow} amarelo${t.yellow === 1 ? '' : 's'}${t.red > 0 ? ` · ${t.red} vermelho${t.red === 1 ? '' : 's'}` : ''}`),
      );

    return { topScorers, topMinutes, topCards };
  }

  private async buildAgenda(
    tenantId: string,
    categories: string[],
    matchDateKey: string,
  ): Promise<GuiaAgendaDay[]> {
    if (!matchDateKey) return [];
    const from = addDaysToDateKey(matchDateKey, -3);
    const to = addDaysToDateKey(matchDateKey, 3);
    try {
      const programacao = await this.relatorios.getProgramacaoSemanal({
        tenantId,
        from,
        to,
        categories: categories.join(','),
      });
      return programacao.days.map((day) => {
        const items = Object.values(day.byCategory)
          .flat()
          .map((cell) => ({
            time: cell.time,
            title: cell.title,
            typeLabel: cell.typeLabel,
            location: cell.location,
          }));
        const seen = new Set<string>();
        const unique = items.filter((item) => {
          const key = `${item.time}|${item.title}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return {
          date: day.date,
          weekdayLabel: day.weekdayLabel,
          dateLabel: day.dateLabel,
          isMatchDay: day.date === matchDateKey,
          items: unique,
        } satisfies GuiaAgendaDay;
      });
    } catch {
      return [];
    }
  }

  private async buildNextMatches(
    tenantId: string,
    travelId: string,
    matchDate: Date,
  ): Promise<GuiaPartidaReportDto['nextMatches']> {
    const rows = await this.prisma.travelLogistics.findMany({
      where: {
        tenantId,
        id: { not: travelId },
        status: { not: 'cancelado' },
        matchDate: { gt: matchDate },
      },
      orderBy: { matchDate: 'asc' },
      take: 5,
      select: {
        id: true,
        matchDate: true,
        opponentName: true,
        championshipName: true,
        stadiumName: true,
        city: true,
        isHomeMatch: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      date: row.matchDate.toISOString().slice(0, 10),
      dateLabel: dateLabelBr(row.matchDate),
      opponent: row.opponentName?.trim() || 'A definir',
      competition: row.championshipName,
      venue: [row.stadiumName, row.city].filter(Boolean).join(' · ') || null,
      isHome: row.isHomeMatch === true,
    }));
  }

  private async buildStandings(
    categories: string[],
    championshipName: string | null,
    clubName: string,
    aliases: string[],
  ): Promise<GuiaStandingRow[]> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: FMF_STORE_KEY },
    });
    if (!row?.config || typeof row.config !== 'object') return [];
    const store = row.config as unknown as FmfScraperStore;
    const snapshots = Object.values(store.categories ?? {}).filter(Boolean);
    if (snapshots.length === 0) return [];

    const catKeys = categories.map(categoryKey).filter(Boolean);
    const championshipKey = softNormalizeTeamNameKey(championshipName ?? '');
    const snapshot =
      snapshots.find(
        (s) =>
          s &&
          catKeys.includes(categoryKey(s.fixtureCategory)) &&
          (!championshipKey || softNormalizeTeamNameKey(s.name).includes(championshipKey)),
      ) ??
      snapshots.find((s) => s && catKeys.includes(categoryKey(s.fixtureCategory))) ??
      null;

    if (!snapshot?.standings?.length) return [];

    return [...snapshot.standings]
      .sort(
        (a, b) =>
          b.pontos - a.pontos ||
          b.vitorias - a.vitorias ||
          b.saldoGols - a.saldoGols ||
          b.golsMarcados - a.golsMarcados,
      )
      .map((team, index) => ({
        position: index + 1,
        team: team.time,
        points: team.pontos,
        matches: team.jogos,
        wins: team.vitorias,
        draws: team.empates,
        losses: team.derrotas,
        goalsFor: team.golsMarcados,
        goalsAgainst: team.golsSofridos,
        goalDiff: team.saldoGols,
        winRate:
          team.jogos > 0 ? Math.round((team.pontos / (team.jogos * 3)) * 100) : 0,
        isClub: isFmfTeamMatch(team.time, clubName, aliases),
      }));
  }
}
