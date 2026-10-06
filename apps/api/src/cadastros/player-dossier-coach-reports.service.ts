import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  type CoachReportSelectionToken,
  type DossierCoachReportKind,
  DOSSIER_COACH_REPORT_LABELS,
} from './player-dossier-coach-reports.util';

export type DossierEligibleCoachReportDto = {
  kind: DossierCoachReportKind;
  id: string;
  label: string;
  date: string | null;
  periodLabel: string | null;
  coachName: string | null;
  category: string | null;
  opponent: string | null;
  summary: string | null;
  classification: string | null;
};

export type DossierFormalCoachReportPayload = {
  kind: DossierCoachReportKind;
  id: string;
  label: string;
  date: string | null;
  periodLabel: string | null;
  coachName: string | null;
  category: string | null;
  opponent: string | null;
  rating: number | null;
  percentage: number | null;
  classification: string | null;
  summary: string | null;
  technicalAssessment: string | null;
  finalResult: string | null;
  observations: string | null;
  strengths: string | null;
  matchScore: string | null;
  teamReportContext: string | null;
  /** Avaliação individual — dimensões para radar/cards */
  coachEvaluationRow?: {
    season: number;
    periodKey: string;
    percentage: number | null;
    classification: string | null;
    overallAverage: number | null;
    matchMinutes: number;
    trainingMinutes: number;
    goals: number;
    assists: number;
    submittedAt: string | null;
    technicalAssessment?: string | null;
    finalResult?: string | null;
    techAverage?: number | null;
    tacAverage?: number | null;
    physAverage?: number | null;
    behAverage?: number | null;
  };
};

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function staffName(staff: { name: string } | null | undefined): string | null {
  const n = staff?.name?.trim();
  return n || null;
}

function periodLabelTeamReport(report: {
  season: number | null;
  periodKey: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
}): string | null {
  if (report.season && report.periodKey) {
    return `${report.season} · ${report.periodKey}`;
  }
  if (report.periodStart && report.periodEnd) {
    return `${isoDate(report.periodStart)} — ${isoDate(report.periodEnd)}`;
  }
  return report.periodKey ?? null;
}

@Injectable()
export class PlayerDossierCoachReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async staffNameById(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.technicalStaff.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name.trim()]));
  }

  async listEligible(input: {
    playerId: string;
    tenantId: string;
    allowedTenantIds: string[] | null;
  }): Promise<DossierEligibleCoachReportDto[]> {
    this.assertTenantAccess(input.tenantId, input.allowedTenantIds);

    const [individual, teamRows, matchRows] = await Promise.all([
      this.prisma.coachPlayerEvaluation.findMany({
        where: {
          playerId: input.playerId,
          tenantId: input.tenantId,
          status: 'concluido',
          submittedAt: { not: null },
        },
        orderBy: [{ submittedAt: 'desc' }, { season: 'desc' }],
      }),
      this.prisma.coachTeamReportPlayerEvaluation.findMany({
        where: {
          playerId: input.playerId,
          report: { tenantId: input.tenantId, status: 'enviado', sentAt: { not: null } },
        },
        orderBy: [{ report: { sentAt: 'desc' } }],
        include: {
          report: {
            include: { staff: { select: { name: true } } },
          },
        },
      }),
      this.prisma.coachMatchReportPlayerRating.findMany({
        where: {
          playerId: input.playerId,
          report: { tenantId: input.tenantId, status: 'finalizado' },
        },
        orderBy: [{ report: { matchDate: 'desc' } }],
        include: {
          report: {
            include: { staff: { select: { name: true } } },
          },
        },
      }),
    ]);

    const individualStaff = await this.staffNameById(individual.map((r) => r.staffId ?? ''));

    const out: DossierEligibleCoachReportDto[] = [];

    for (const row of individual) {
      out.push({
        kind: 'coach_player_evaluation',
        id: row.id,
        label: DOSSIER_COACH_REPORT_LABELS.coach_player_evaluation,
        date: isoDate(row.submittedAt),
        periodLabel: `${row.season} · ${row.periodKey}`,
        coachName: row.staffId ? individualStaff.get(row.staffId) ?? null : null,
        category: row.category,
        opponent: null,
        summary: row.technicalAssessment?.slice(0, 160) ?? row.finalResult,
        classification: row.classification,
      });
    }

    for (const row of teamRows) {
      const report = row.report;
      out.push({
        kind: 'coach_team_report_player',
        id: row.id,
        label: DOSSIER_COACH_REPORT_LABELS.coach_team_report_player,
        date: isoDate(report.sentAt),
        periodLabel: periodLabelTeamReport(report),
        coachName: staffName(report.staff),
        category: report.category,
        opponent: null,
        summary:
          row.individualObservation?.slice(0, 160) ??
          row.playerStrengths?.slice(0, 160) ??
          null,
        classification:
          row.coachFinalRating != null ? String(row.coachFinalRating) : null,
      });
    }

    for (const row of matchRows) {
      const report = row.report;
      out.push({
        kind: 'coach_match_rating',
        id: row.id,
        label: DOSSIER_COACH_REPORT_LABELS.coach_match_rating,
        date: isoDate(report.matchDate),
        periodLabel: null,
        coachName: staffName(report.staff),
        category: report.category,
        opponent: report.opponentName,
        summary: row.individualReport?.slice(0, 160) ?? null,
        classification: row.rating != null ? String(row.rating) : null,
      });
    }

    return out;
  }

  async resolveSelected(input: {
    playerId: string;
    tenantId: string;
    allowedTenantIds: string[] | null;
    selections: readonly CoachReportSelectionToken[];
  }): Promise<DossierFormalCoachReportPayload[]> {
    if (input.selections.length === 0) return [];
    this.assertTenantAccess(input.tenantId, input.allowedTenantIds);

    const byKind = new Map<DossierCoachReportKind, string[]>();
    for (const s of input.selections) {
      const list = byKind.get(s.kind) ?? [];
      list.push(s.id);
      byKind.set(s.kind, list);
    }

    const resolved: DossierFormalCoachReportPayload[] = [];

    const individualIds = byKind.get('coach_player_evaluation') ?? [];
    if (individualIds.length > 0) {
      const rows = await this.prisma.coachPlayerEvaluation.findMany({
        where: {
          id: { in: individualIds },
          playerId: input.playerId,
          tenantId: input.tenantId,
          status: 'concluido',
          submittedAt: { not: null },
        },
      });
      const map = new Map(rows.map((r) => [r.id, r]));
      const staffMap = await this.staffNameById(rows.map((r) => r.staffId ?? ''));
      for (const id of individualIds) {
        const row = map.get(id);
        if (!row) {
          throw new NotFoundException(`Relatório de treinador inválido ou indisponível: ${id}`);
        }
        resolved.push({
          kind: 'coach_player_evaluation',
          id: row.id,
          label: DOSSIER_COACH_REPORT_LABELS.coach_player_evaluation,
          date: isoDate(row.submittedAt),
          periodLabel: `${row.season} · ${row.periodKey}`,
          coachName: row.staffId ? staffMap.get(row.staffId) ?? null : null,
          category: row.category,
          opponent: null,
          rating: row.overallAverage,
          percentage: row.percentage,
          classification: row.classification,
          summary: row.finalResult,
          technicalAssessment: row.technicalAssessment,
          finalResult: row.finalResult,
          observations: row.technicalAssessment,
          strengths: null,
          matchScore: null,
          teamReportContext: null,
          coachEvaluationRow: {
            season: row.season,
            periodKey: row.periodKey,
            percentage: row.percentage,
            classification: row.classification,
            overallAverage: row.overallAverage,
            matchMinutes: row.matchMinutes,
            trainingMinutes: row.trainingMinutes,
            goals: row.goals,
            assists: row.assists,
            submittedAt: row.submittedAt?.toISOString() ?? null,
            technicalAssessment: row.technicalAssessment,
            finalResult: row.finalResult,
            techAverage: row.techAverage,
            tacAverage: row.tacAverage,
            physAverage: row.physAverage,
            behAverage: row.behAverage,
          },
        });
      }
    }

    const teamIds = byKind.get('coach_team_report_player') ?? [];
    if (teamIds.length > 0) {
      const rows = await this.prisma.coachTeamReportPlayerEvaluation.findMany({
        where: {
          id: { in: teamIds },
          playerId: input.playerId,
          report: { tenantId: input.tenantId, status: 'enviado', sentAt: { not: null } },
        },
        include: {
          report: { include: { staff: { select: { name: true } } } },
        },
      });
      const map = new Map(rows.map((r) => [r.id, r]));
      for (const id of teamIds) {
        const row = map.get(id);
        if (!row) {
          throw new NotFoundException(`Relatório de equipe inválido ou indisponível: ${id}`);
        }
        const report = row.report;
        resolved.push({
          kind: 'coach_team_report_player',
          id: row.id,
          label: DOSSIER_COACH_REPORT_LABELS.coach_team_report_player,
          date: isoDate(report.sentAt),
          periodLabel: periodLabelTeamReport(report),
          coachName: staffName(report.staff),
          category: report.category,
          opponent: null,
          rating: row.coachFinalRating,
          percentage: null,
          classification: row.coachFinalRating != null ? String(row.coachFinalRating) : null,
          summary: report.generalDescription?.slice(0, 200) ?? null,
          technicalAssessment: null,
          finalResult: null,
          observations: row.individualObservation,
          strengths: row.playerStrengths,
          matchScore: null,
          teamReportContext: `Origem: relatório periódico da equipe (${periodLabelTeamReport(report) ?? 'período'})`,
        });
      }
    }

    const matchIds = byKind.get('coach_match_rating') ?? [];
    if (matchIds.length > 0) {
      const rows = await this.prisma.coachMatchReportPlayerRating.findMany({
        where: {
          id: { in: matchIds },
          playerId: input.playerId,
          report: { tenantId: input.tenantId, status: 'finalizado' },
        },
        include: {
          report: { include: { staff: { select: { name: true } } } },
        },
      });
      const map = new Map(rows.map((r) => [r.id, r]));
      for (const id of matchIds) {
        const row = map.get(id);
        if (!row) {
          throw new NotFoundException(`Avaliação pós-jogo inválida ou indisponível: ${id}`);
        }
        const report = row.report;
        resolved.push({
          kind: 'coach_match_rating',
          id: row.id,
          label: DOSSIER_COACH_REPORT_LABELS.coach_match_rating,
          date: isoDate(report.matchDate),
          periodLabel: null,
          coachName: staffName(report.staff),
          category: report.category,
          opponent: report.opponentName,
          rating: row.rating,
          percentage: null,
          classification: row.rating != null ? String(row.rating) : null,
          summary: report.matchSummary?.slice(0, 200) ?? null,
          technicalAssessment: null,
          finalResult: null,
          observations: row.individualReport,
          strengths: null,
          matchScore: null,
          teamReportContext: report.opponentName
            ? `Partida vs ${report.opponentName}`
            : null,
        });
      }
    }

    const order = new Map(input.selections.map((s, i) => [`${s.kind}:${s.id}`, i]));
    resolved.sort(
      (a, b) =>
        (order.get(`${a.kind}:${a.id}`) ?? 0) - (order.get(`${b.kind}:${b.id}`) ?? 0),
    );

    return resolved;
  }

  private assertTenantAccess(tenantId: string, allowedTenantIds: string[] | null): void {
    if (allowedTenantIds == null) return;
    if (!allowedTenantIds.includes(tenantId)) {
      throw new NotFoundException('Atleta não encontrado.');
    }
  }
}
