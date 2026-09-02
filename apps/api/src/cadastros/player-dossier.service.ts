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

type JsonArray = unknown[];

function asArray(value: unknown): JsonArray {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickSportsProfile(registrationProfile: unknown) {
  const sports = asObject(asObject(registrationProfile).sports);
  return {
    situation: typeof sports.situation === 'string' ? sports.situation : null,
    cbf: typeof sports.cbf === 'string' ? sports.cbf : null,
    localFedRegistration:
      typeof sports.localFedRegistration === 'string' ? sports.localFedRegistration : null,
    comet: typeof sports.comet === 'string' ? sports.comet : null,
    previousClub: typeof sports.previousClub === 'string' ? sports.previousClub : null,
    jerseyName: typeof sports.jerseyName === 'string' ? sports.jerseyName : null,
  };
}

function summarizeCoachEvaluations(
  rows: Array<{
    periodKey: string;
    status: string;
    overallAverage: number | null;
    percentage: number | null;
    classification: string | null;
    submittedAt: Date | null;
  }>,
) {
  const submitted = rows.filter((r) => r.status === 'concluido' && r.submittedAt);
  const percentages = submitted
    .map((r) => r.percentage)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p));
  const avg =
    percentages.length > 0
      ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10
      : null;
  return {
    count: submitted.length,
    averagePercentage: avg,
    periods: submitted.map((r) => ({
      periodKey: r.periodKey,
      percentage: r.percentage,
      classification: r.classification,
      submittedAt: r.submittedAt?.toISOString() ?? null,
    })),
  };
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

    const [fmfStats, coachEvaluations, subidaHistory] = await Promise.all([
      this.fmfMatchReports.getPlayerStats(player.id).catch(() => null),
      this.prisma.coachPlayerEvaluation.findMany({
        where: { playerId: player.id, season },
        orderBy: [{ periodKey: 'asc' }],
        select: {
          periodKey: true,
          status: true,
          overallAverage: true,
          percentage: true,
          classification: true,
          submittedAt: true,
        },
      }),
      this.players.findSubidaHistory(player.id, input.allowedTenantIds).catch(() => []),
    ]);

    const sports = pickSportsProfile(player.registrationProfile);
    const previousTeams = asArray(player.previousTeams).filter(
      (t): t is string => typeof t === 'string' && t.trim().length > 0,
    );
    const seasonHistory = asArray(player.seasonHistory);
    const highlights = asArray(player.highlights).filter(
      (h): h is string => typeof h === 'string' && h.trim().length > 0,
    );
    const evaluations = asArray(player.evaluations);
    const analysisMetrics = asObject(player.analysisMetrics);

    const timelineEvents: Array<{
      date: string;
      type: string;
      label: string;
      detail?: string | null;
    }> = [];

    for (const ev of evaluations) {
      const row = asObject(ev);
      const date = typeof row.date === 'string' ? row.date : null;
      if (!date) continue;
      timelineEvents.push({
        date,
        type: 'evaluation',
        label: 'Avaliação técnica',
        detail: typeof row.notes === 'string' ? row.notes : null,
      });
    }

    if (fmfStats?.matches?.length) {
      for (const m of fmfStats.matches.slice(0, 12)) {
        if (!m.played) continue;
        timelineEvents.push({
          date: m.match.matchDate.toISOString().slice(0, 10),
          type: 'match',
          label: `${m.match.homeTeam} ${m.match.homeScore ?? '–'}×${m.match.awayScore ?? '–'} ${m.match.awayTeam}`,
          detail: m.goals > 0 ? `${m.goals} gol(s) · ${m.minutesPlayed} min` : `${m.minutesPlayed} min`,
        });
      }
    }

    for (const h of highlights.slice(0, 8)) {
      timelineEvents.push({
        date: '',
        type: 'highlight',
        label: 'Destaque',
        detail: h,
      });
    }

    timelineEvents.sort((a, b) => (b.date || '9999').localeCompare(a.date || '9999'));

    const optionalData = await this.loadOptionalSections(
      player.id,
      player.tenantId,
      includedOptional,
      input.allowedTenantIds,
    );

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        playerId: player.id,
        season,
        canChooseOptionalSections: canChooseSensitiveDossierSections(input.role),
        availableOptionalSections: listAvailableOptionalSections(moduleSlugs).map((id) => ({
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
      identity: {
        name: player.name,
        photoUrl: player.photoUrl,
        jerseyNumber: player.jerseyNumber,
        birthDate: player.birthDate,
        nationality: player.nationality,
        category: player.category,
        position: player.position,
        preferredFoot: player.preferredFoot,
        height: player.height,
        weight: player.weight,
        bmi: player.bmi,
        bodyFatPercent: player.bodyFatPercent,
        currentTeam: player.currentTeam,
        bioPT: player.bioPT,
      },
      registration: {
        cbfRegistration: player.cbfRegistration ?? sports.cbf,
        situation: sports.situation,
        localFedRegistration: sports.localFedRegistration,
        comet: sports.comet,
        jerseyName: sports.jerseyName,
      },
      career: {
        previousTeams,
        seasonHistory,
        subidaHighlights: Array.isArray(subidaHistory)
          ? subidaHistory.slice(0, 10).map((t: Record<string, unknown>) => ({
              matchDate:
                t.matchDate instanceof Date
                  ? t.matchDate.toISOString()
                  : typeof t.matchDate === 'string'
                    ? t.matchDate
                    : null,
              destination: typeof t.destination === 'string' ? t.destination : null,
              eventCategories: t.eventCategories,
              isSubida: Boolean(t.isSubida),
            }))
          : [],
      },
      fmfStats,
      performance: {
        evaluations,
        analysisMetrics,
        performanceAnalysis: player.performanceAnalysis,
        coachEvaluations: summarizeCoachEvaluations(coachEvaluations),
      },
      timeline: timelineEvents,
      charts: {
        seasonMinutes: (fmfStats?.seasons ?? []).slice(0, 6).map((s) => ({
          label: `${s.year} · ${s.competition}`,
          minutesPlayed: s.minutesPlayed,
          goals: s.goals,
          matchesPlayed: s.matchesPlayed,
        })),
        yearTotals: (fmfStats?.years ?? []).slice(0, 5).map((y) => ({
          year: y.year,
          minutesPlayed: y.minutesPlayed,
          goals: y.goals,
          matchesPlayed: y.matchesPlayed,
        })),
      },
      optional: optionalData,
    };
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
            assessments: asArray(p.psychologicalAssessment).slice(0, 8),
            consultations: asArray(p.onlineConsultations).slice(0, 8),
          };
        })(),
      );
    }

    if (sections.includes('physio')) {
      tasks.push(
        (async () => {
          const rows = await this.prisma.physioPlayerEvaluation.findMany({
            where: { playerId },
            orderBy: [{ evaluatedAt: 'desc' }],
            take: 10,
            select: {
              id: true,
              evaluatedAt: true,
              context: true,
              rating: true,
              outcome: true,
              finalObservations: true,
            },
          });
          out.physio = { evaluations: rows };
        })(),
      );
    }

    if (sections.includes('nursing')) {
      tasks.push(
        (async () => {
          const rows = await this.prisma.nursingSession.findMany({
            where: { playerId, tenantId },
            orderBy: [{ attendedAt: 'desc' }],
            take: 10,
            select: {
              id: true,
              attendedAt: true,
              status: true,
              symptoms: true,
              treatmentNotes: true,
            },
          });
          out.nursing = { sessions: rows };
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
              take: 10,
              select: {
                id: true,
                departedAt: true,
                returnedAt: true,
                destination: true,
                careType: true,
                reason: true,
                status: true,
              },
            }),
            this.players.findOne(playerId, allowedTenantIds),
          ]);
          out.medical = {
            departures,
            history: asArray(p.medicalHistory).slice(0, 10),
          };
        })(),
      );
    }

    if (sections.includes('nutrition')) {
      tasks.push(
        (async () => {
          const history = await this.players.findNutritionHistory(playerId, allowedTenantIds);
          out.nutrition = history;
        })(),
      );
    }

    if (sections.includes('physiology')) {
      tasks.push(
        (async () => {
          const p = await this.players.findOne(playerId, allowedTenantIds);
          out.physiology = asObject(p.physiology);
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
          const prospect = await this.prisma.scoutingProspect.findFirst({
            where: { playerId, tenantId },
            orderBy: [{ updatedAt: 'desc' }],
            include: {
              reports: {
                orderBy: [{ reportDate: 'desc' }],
                take: 5,
              },
            },
          });
          out.scouting = { prospect };
        })(),
      );
    }

    if (sections.includes('training')) {
      tasks.push(
        (async () => {
          const history = await this.players.findTrainingHistory(playerId, allowedTenantIds);
          out.training = { sessions: history.slice(0, 15) };
        })(),
      );
    }

    await Promise.all(tasks);
    return out;
  }
}
