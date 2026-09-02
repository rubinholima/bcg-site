import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from './players.service';
import { FmfMatchReportService } from '../fmf-scraper/fmf-match-report.service';
import { ModulesService } from '../modules/modules.service';
import {
  canChooseSensitiveDossierSections,
  listAvailableOptionalSections,
  parseOptionalSectionsQuery,
  PLAYER_DOSSIER_OPTIONAL_LABELS,
  PlayerDossierOptionalSection,
  resolveIncludedOptionalSections,
} from './player-dossier-access.util';
import {
  buildHighlightItems,
  buildMonthlyAppearancesChart,
  buildMonthlyGoalsChart,
  buildSportingStory,
  normalizePsychologyRecords,
  resolveAssists,
} from './player-dossier-content.util';

type JsonArray = unknown[];

function asArray(value: unknown): JsonArray {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isoDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate?.trim()) return null;
  const d = new Date(`${birthDate.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

function pickRegistration(registrationProfile: unknown) {
  const root = asObject(registrationProfile);
  const personal = asObject(root.personal);
  const sports = asObject(root.sports);
  return {
    nickname: typeof personal.nickname === 'string' ? personal.nickname : null,
    situation: typeof sports.situation === 'string' ? sports.situation : null,
    cbf: typeof sports.cbf === 'string' ? sports.cbf : null,
    localFedRegistration:
      typeof sports.localFedRegistration === 'string' ? sports.localFedRegistration : null,
    comet: typeof sports.comet === 'string' ? sports.comet : null,
    previousClub: typeof sports.previousClub === 'string' ? sports.previousClub : null,
    jerseyName: typeof sports.jerseyName === 'string' ? sports.jerseyName : null,
  };
}

function buildMonthlyMinutesChart(
  matches: Array<{ played: boolean; minutesPlayed: number; match: { matchDate: Date | string } }>,
) {
  const byMonth = new Map<string, { minutes: number; games: number }>();
  for (const row of matches) {
    if (!row.played) continue;
    const date = row.match.matchDate instanceof Date ? row.match.matchDate : new Date(row.match.matchDate);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const cur = byMonth.get(key) ?? { minutes: 0, games: 0 };
    cur.minutes += row.minutesPlayed ?? 0;
    cur.games += 1;
    byMonth.set(key, cur);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([label, v]) => ({ label, minutes: v.minutes, games: v.games }));
}

@Injectable()
export class PlayerDossierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly players: PlayersService,
    private readonly fmfMatchReports: FmfMatchReportService,
    private readonly modulesService: ModulesService,
  ) {}

  async buildDossier(input: {
    playerId: string;
    allowedTenantIds: string[] | null;
    actorSub: string;
    role: string;
    optionalSectionsRaw?: string | null;
    season?: number;
  }) {
    const player = await this.players.findOne(input.playerId, input.allowedTenantIds);
    const moduleSlugs = await this.modulesService.getSlugsForActor(input.actorSub, input.role);
    const requested = parseOptionalSectionsQuery(input.optionalSectionsRaw);
    const includedOptional = resolveIncludedOptionalSections({
      role: input.role,
      moduleSlugs,
      requested,
    });

    const season =
      input.season && Number.isFinite(input.season)
        ? input.season
        : new Date().getFullYear();

    const reg = pickRegistration(player.registrationProfile);

    const [fmfStats, coachEvaluations, subidaHistory, optionalData] = await Promise.all([
      this.fmfMatchReports.getPlayerStats(player.id).catch(() => null),
      this.prisma.coachPlayerEvaluation.findMany({
        where: { playerId: player.id },
        orderBy: [{ season: 'desc' }, { periodKey: 'asc' }],
        select: {
          season: true,
          periodKey: true,
          status: true,
          overallAverage: true,
          percentage: true,
          classification: true,
          submittedAt: true,
          matchMinutes: true,
          trainingMinutes: true,
          goals: true,
          assists: true,
          technicalAssessment: true,
          finalResult: true,
          techAverage: true,
          tacAverage: true,
          physAverage: true,
          behAverage: true,
        },
      }),
      this.players.findSubidaHistory(player.id, input.allowedTenantIds).catch(() => []),
      this.loadOptionalSections(player.id, player.tenantId, includedOptional, input.allowedTenantIds),
    ]);

    const submittedCoach = coachEvaluations.filter((r) => r.status === 'concluido' && r.submittedAt);
    const coachPercentages = submittedCoach
      .map((r) => r.percentage)
      .filter((p): p is number => typeof p === 'number' && Number.isFinite(p));
    const coachAvg =
      coachPercentages.length > 0
        ? Math.round((coachPercentages.reduce((a, b) => a + b, 0) / coachPercentages.length) * 10) / 10
        : null;

    const fmfMatches = (fmfStats?.matches ?? []).map((row) => ({
      id: row.id,
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
      match: {
        id: row.match.id,
        competition: row.match.competition,
        phase: row.match.phase,
        round: row.match.round,
        category: row.match.category,
        season: row.match.season,
        matchDate: isoDate(row.match.matchDate),
        homeTeam: row.match.homeTeam,
        awayTeam: row.match.awayTeam,
        homeScore: row.match.homeScore,
        awayScore: row.match.awayScore,
      },
    }));

    const movements: Array<{ date: string; label: string; detail?: string | null }> = [];

    for (const row of asArray(player.seasonHistory)) {
      const o = asObject(row);
      const date =
        typeof o.season === 'string'
          ? o.season
          : typeof o.year === 'string'
            ? o.year
            : typeof o.year === 'number'
              ? String(o.year)
              : '';
      const club = typeof o.club === 'string' ? o.club : typeof o.team === 'string' ? o.team : '';
      const cat = typeof o.category === 'string' ? o.category : '';
      if (club || cat) {
        movements.push({
          date,
          label: club || 'Temporada',
          detail: cat ? `Categoria ${cat}` : null,
        });
      }
    }

    for (const t of asArray(subidaHistory)) {
      const o = asObject(t);
      movements.push({
        date: isoDate(o.matchDate as Date | string),
        label: 'Convocação / subida de categoria',
        detail: Array.isArray(o.eventCategories)
          ? (o.eventCategories as string[]).join(', ')
          : null,
      });
    }

    movements.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const sportingStory = buildSportingStory({
      previousTeams: asArray(player.previousTeams).filter(
        (t): t is string => typeof t === 'string' && t.trim().length > 0,
      ),
      seasonHistory: asArray(player.seasonHistory),
      subidaEvents: asArray(subidaHistory),
      movements,
      currentTeam: player.currentTeam ?? player.tenant?.name ?? null,
      category: player.category,
    });

    const highlights = buildHighlightItems({
      highlights: player.highlights,
      images: player.images,
    });

    const assists = resolveAssists({
      profileAssists: player.assists,
      coachEvaluations: submittedCoach,
    });

    const fmfTotals = fmfStats?.total ?? null;
    const snapshot = {
      games: fmfTotals?.matchesPlayed ?? player.matchesPlayed ?? null,
      starts: fmfTotals?.starts ?? null,
      minutes: fmfTotals?.minutesPlayed ?? null,
      goals: fmfTotals?.goals ?? player.goals ?? null,
      assists,
      yellowCards: fmfTotals?.yellowCards ?? player.yellowCards ?? null,
      redCards: fmfTotals?.redCards ?? player.redCards ?? null,
      coachAvgPct: coachAvg,
    };

    const psychologyRecords =
      includedOptional.includes('psychology') && optionalData.psychology
        ? normalizePsychologyRecords(asObject(optionalData.psychology).assessments)
        : undefined;

    const timeline = this.buildTimeline({
      evaluations: asArray(player.evaluations),
      fmfMatches,
      highlights: asArray(player.highlights).filter((h): h is string => typeof h === 'string'),
      coachEvaluations: submittedCoach,
      optional: optionalData,
      includedOptional,
    });

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        playerId: player.id,
        season,
        canChooseOptionalSections: canChooseSensitiveDossierSections(input.role),
        availableOptionalSections: listAvailableOptionalSections(moduleSlugs, input.role).map((id) => ({
          id,
          label: PLAYER_DOSSIER_OPTIONAL_LABELS[id],
        })),
        includedOptionalSections: includedOptional,
      },
      club: player.tenant
        ? {
            id: player.tenant.id,
            name: player.tenant.name,
            slug: player.tenant.slug,
            logoUrl: player.tenant.logoUrl,
          }
        : null,
      cover: {
        name: player.name,
        nickname: reg.nickname,
        photoUrl: player.photoUrl,
        jerseyNumber: player.jerseyNumber,
        category: player.category,
        position: player.position,
        age: calcAge(player.birthDate),
        nationality: player.nationality,
        preferredFoot: player.preferredFoot,
        height: player.height,
        weight: player.weight,
        situation: reg.situation ?? player.status,
        bioPT: player.bioPT,
      },
      snapshot,
      highlights,
      sportingStory,
      profile: {
        birthDate: player.birthDate,
        cbfRegistration: player.cbfRegistration ?? reg.cbf,
        localFedRegistration: reg.localFedRegistration,
        comet: reg.comet,
        jerseyName: reg.jerseyName,
        currentTeam: player.currentTeam ?? player.tenant?.name ?? null,
        bmi: player.bmi,
        bodyFatPercent: player.bodyFatPercent,
        matchesPlayed: player.matchesPlayed,
        goals: player.goals,
        assists: player.assists,
        yellowCards: player.yellowCards,
        redCards: player.redCards,
        marketValue: player.marketValue,
      },
      career: {
        previousTeams: asArray(player.previousTeams).filter(
          (t): t is string => typeof t === 'string' && t.trim().length > 0,
        ),
        seasonHistory: asArray(player.seasonHistory),
        subidaEvents: asArray(subidaHistory),
        movements,
      },
      matchHistory: {
        totals: fmfStats?.total
          ? {
              matchesListed: fmfStats.total.matchesListed,
              matchesPlayed: fmfStats.total.matchesPlayed,
              starts: fmfStats.total.starts,
              minutesPlayed: fmfStats.total.minutesPlayed,
              goals: fmfStats.total.goals,
              yellowCards: fmfStats.total.yellowCards,
              redCards: fmfStats.total.redCards,
            }
          : null,
        bySeason: (fmfStats?.seasons ?? []).map((s) => ({
          year: s.year,
          competition: s.competition,
          category: s.category,
          minutesPlayed: s.minutesPlayed,
          goals: s.goals,
          matchesPlayed: s.matchesPlayed,
          starts: s.starts,
        })),
        matches: fmfMatches,
      },
      performance: {
        diretoriaEvaluations: asArray(player.evaluations),
        analysisMetrics: asObject(player.analysisMetrics),
        performanceAnalysis: player.performanceAnalysis,
        coachEvaluations: submittedCoach.map((r) => ({
          season: r.season,
          periodKey: r.periodKey,
          percentage: r.percentage,
          classification: r.classification,
          overallAverage: r.overallAverage,
          matchMinutes: r.matchMinutes,
          trainingMinutes: r.trainingMinutes,
          goals: r.goals,
          assists: r.assists,
          submittedAt: r.submittedAt?.toISOString() ?? null,
          technicalAssessment: r.technicalAssessment,
          finalResult: r.finalResult,
          techAverage: r.techAverage,
          tacAverage: r.tacAverage,
          physAverage: r.physAverage,
          behAverage: r.behAverage,
        })),
        coachSummary: {
          count: submittedCoach.length,
          averagePercentage: coachAvg,
        },
      },
      timeline,
      charts: {
        monthlyMinutes: buildMonthlyMinutesChart(fmfStats?.matches ?? []),
        monthlyGoals: buildMonthlyGoalsChart(fmfStats?.matches ?? []),
        monthlyAppearances: buildMonthlyAppearancesChart(fmfStats?.matches ?? []),
        seasonMinutes: (fmfStats?.seasons ?? []).slice(0, 8).map((s) => ({
          label: `${s.year} · ${s.competition}`,
          minutesPlayed: s.minutesPlayed,
          goals: s.goals,
          matchesPlayed: s.matchesPlayed,
        })),
        evaluationTrend: submittedCoach
          .filter((r) => r.percentage != null)
          .map((r) => ({
            label: `${r.season} · ${r.periodKey}`,
            value: r.percentage as number,
          })),
      },
      optional: optionalData,
      ...(psychologyRecords && psychologyRecords.length > 0 ? { psychologyRecords } : {}),
    };
  }

  private buildTimeline(input: {
    evaluations: JsonArray;
    fmfMatches: Array<{ played: boolean; minutesPlayed: number; goals: number; match: { matchDate: string; homeTeam: string; awayTeam: string; homeScore?: number | null; awayScore?: number | null } }>;
    highlights: string[];
    coachEvaluations: Array<{ season: number; periodKey: string; submittedAt: Date | null; percentage: number | null }>;
    optional: Record<string, unknown>;
    includedOptional: PlayerDossierOptionalSection[];
  }) {
    const events: Array<{ date: string; category: string; title: string; detail?: string | null }> = [];

    for (const ev of input.evaluations) {
      const o = asObject(ev);
      const date = typeof o.date === 'string' ? o.date : '';
      if (!date) continue;
      events.push({
        date,
        category: 'Avaliação',
        title: typeof o.evaluator === 'string' ? `Avaliação — ${o.evaluator}` : 'Avaliação técnica',
        detail: typeof o.notes === 'string' ? o.notes : null,
      });
    }

    for (const m of input.fmfMatches.filter((r) => r.played)) {
      events.push({
        date: m.match.matchDate,
        category: 'Partida oficial',
        title: `${m.match.homeTeam} ${m.match.homeScore ?? '–'}×${m.match.awayScore ?? '–'} ${m.match.awayTeam}`,
        detail: `${m.minutesPlayed} min${m.goals > 0 ? ` · ${m.goals} gol(s)` : ''}`,
      });
    }

    for (const r of input.coachEvaluations) {
      events.push({
        date: isoDate(r.submittedAt),
        category: 'Comissão técnica',
        title: `Avaliação ${r.periodKey} (${r.season})`,
        detail: r.percentage != null ? `${r.percentage}%` : null,
      });
    }

    for (const h of input.highlights.slice(0, 10)) {
      events.push({ date: '', category: 'Destaque', title: h, detail: null });
    }

    if (input.includedOptional.includes('physio')) {
      const physio = asObject(input.optional.physio);
      for (const s of asArray(physio.sessions)) {
        const o = asObject(s);
        events.push({
          date: isoDate(o.startedAt as Date | string),
          category: 'Fisioterapia',
          title: typeof o.diagnosisLabel === 'string' ? o.diagnosisLabel : 'Episódio fisioterapêutico',
          detail: typeof o.symptoms === 'string' ? o.symptoms.slice(0, 120) : null,
        });
      }
    }

    if (input.includedOptional.includes('medical')) {
      const med = asObject(input.optional.medical);
      for (const d of asArray(med.departures)) {
        const o = asObject(d);
        events.push({
          date: isoDate(o.departedAt as Date | string),
          category: 'Saída médica',
          title: typeof o.destination === 'string' ? o.destination.slice(0, 80) : 'Saída do CT',
          detail: typeof o.reason === 'string' ? o.reason.slice(0, 120) : null,
        });
      }
    }

    if (input.includedOptional.includes('training')) {
      const tr = asObject(input.optional.training);
      for (const s of asArray(tr.sessions)) {
        const o = asObject(s);
        events.push({
          date: isoDate(o.sessionDate as Date | string),
          category: 'Treino',
          title: typeof o.agendaTitle === 'string' ? o.agendaTitle : 'Sessão de treino',
          detail: o.rating != null ? `Nota ${o.rating}` : null,
        });
      }
    }

    events.sort((a, b) => (b.date || '0000').localeCompare(a.date || '0000'));
    return events.slice(0, 40);
  }

  private async loadOptionalSections(
    playerId: string,
    tenantId: string,
    sections: PlayerDossierOptionalSection[],
    allowedTenantIds: string[] | null,
  ) {
    if (sections.length === 0) return {};

    const out: Record<string, unknown> = {};
    const tasks: Promise<void>[] = [];

    if (sections.includes('psychology')) {
      tasks.push(
        (async () => {
          const p = await this.players.findOne(playerId, allowedTenantIds);
          out.psychology = {
            assessments: asArray(p.psychologicalAssessment),
            consultations: asArray(p.onlineConsultations),
            records: normalizePsychologyRecords(p.psychologicalAssessment),
          };
        })(),
      );
    }

    if (sections.includes('physio')) {
      tasks.push(
        (async () => {
          const [sessions, evaluations, transitions] = await Promise.all([
            this.prisma.physioSession.findMany({
              where: { playerId, tenantId },
              orderBy: [{ startedAt: 'desc' }],
              take: 25,
              include: {
                region: { select: { namePt: true } },
                transitionProgram: { select: { id: true, status: true, startedAt: true, completedAt: true } },
              },
            }),
            this.prisma.physioPlayerEvaluation.findMany({
              where: { playerId, tenantId },
              orderBy: [{ evaluatedAt: 'desc' }],
              take: 15,
              include: { tests: true },
            }),
            this.prisma.physioTransitionProgram.findMany({
              where: { playerId, tenantId },
              orderBy: [{ createdAt: 'desc' }],
              take: 8,
              include: { entries: { orderBy: [{ sessionDate: 'desc' }] } },
            }),
          ]);
          out.physio = { sessions, evaluations, transitions };
        })(),
      );
    }

    if (sections.includes('nursing')) {
      tasks.push(
        (async () => {
          out.nursing = {
            sessions: await this.prisma.nursingSession.findMany({
              where: { playerId, tenantId },
              orderBy: [{ attendedAt: 'desc' }],
              take: 25,
              include: {
                sessionDiagnoses: { include: { diagnosis: { select: { name: true } } } },
                sessionTreatments: { include: { treatment: { select: { name: true } } } },
              },
            }),
          };
        })(),
      );
    }

    if (sections.includes('medical')) {
      tasks.push(
        (async () => {
          const [departures, p] = await Promise.all([
            this.prisma.playerMedicalDeparture.findMany({
              where: { playerId, tenantId },
              orderBy: [{ departedAt: 'desc' }],
              take: 25,
            }),
            this.players.findOne(playerId, allowedTenantIds),
          ]);
          out.medical = {
            departures,
            clinicalHistory: asArray(p.medicalHistory),
          };
        })(),
      );
    }

    if (sections.includes('nutrition')) {
      tasks.push(
        (async () => {
          out.nutrition = await this.players.findNutritionHistory(playerId, allowedTenantIds);
        })(),
      );
    }

    if (sections.includes('physiology')) {
      tasks.push(
        (async () => {
          const [playerRow, assessments] = await Promise.all([
            this.players.findOne(playerId, allowedTenantIds),
            this.prisma.physiologyAssessment.findMany({
              where: { playerId, tenantId },
              orderBy: [{ assessedAt: 'desc' }],
              take: 15,
            }),
          ]);
          out.physiology = {
            profile: asObject(asObject(playerRow.physiology).profile),
            records: asArray(asObject(playerRow.physiology).records),
            assessments,
          };
        })(),
      );
    }

    if (sections.includes('performance')) {
      tasks.push(
        (async () => {
          const p = await this.players.findOne(playerId, allowedTenantIds);
          out.performanceDetail = {
            performanceAnalysis: p.performanceAnalysis,
            analysisMetrics: asObject(p.analysisMetrics),
            heatMapData: p.heatMapData,
          };
        })(),
      );
    }

    if (sections.includes('scouting')) {
      tasks.push(
        (async () => {
          const prospects = await this.prisma.scoutingProspect.findMany({
            where: { playerId, tenantId },
            orderBy: [{ updatedAt: 'desc' }],
            take: 3,
            include: {
              reports: { orderBy: [{ reportDate: 'desc' }], take: 10 },
            },
          });
          out.scouting = { prospects };
        })(),
      );
    }

    if (sections.includes('training')) {
      tasks.push(
        (async () => {
          const history = await this.players.findTrainingHistory(playerId, allowedTenantIds);
          out.training = { sessions: history };
        })(),
      );
    }

    await Promise.all(tasks);
    return out;
  }
}
