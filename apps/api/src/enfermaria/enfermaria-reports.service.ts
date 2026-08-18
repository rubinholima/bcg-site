import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';

@Injectable()
export class EnfermariaReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Sem acesso a este clube.');
    }
  }

  async getReportsDashboard(
    filters: { tenantId?: string; category?: string; status?: string; from?: string; to?: string },
    allowed: string[] | null,
  ) {
    const where: Prisma.NursingSessionWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      where.tenantId = filters.tenantId;
    } else if (allowed !== null) {
      where.tenantId = { in: allowed };
    }
    if (filters.category) where.category = filters.category;
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.from || filters.to) {
      where.attendedAt = {};
      if (filters.from) where.attendedAt.gte = new Date(`${filters.from}T00:00:00`);
      if (filters.to) where.attendedAt.lte = new Date(`${filters.to}T23:59:59`);
    }

    const sessions = await this.prisma.nursingSession.findMany({
      where,
      include: {
        sessionDiagnoses: { include: { diagnosis: true } },
        sessionTreatments: { include: { treatment: true, product: true } },
        player: { select: { id: true, name: true, category: true, jerseyNumber: true } },
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { attendedAt: 'desc' },
      take: 5000,
    });

    const byCategory = new Map<string, number>();
    const byStatus = new Map<string, number>();
    const byDiagnosis = new Map<string, number>();
    const byTreatment = new Map<string, number>();
    const byNurse = new Map<string, { nurseName: string; count: number }>();
    const byMonth = new Map<string, number>();
    const uniquePlayers = new Set<string>();
    let activeCount = 0;
    let completedCount = 0;
    let estimatedDaysSum = 0;
    let estimatedDaysCount = 0;

    for (const s of sessions) {
      uniquePlayers.add(s.playerId);
      byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
      if (s.status === 'active') activeCount += 1;
      if (s.status === 'completed') completedCount += 1;

      const cat = s.category?.trim() || s.player?.category?.trim() || 'Sem categoria';
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);

      const nurseName = s.nurseName?.trim() || 'Não informado';
      const nurseKey = s.nurseStaffId ?? nurseName;
      const nurseRow = byNurse.get(nurseKey) ?? { nurseName, count: 0 };
      nurseRow.count += 1;
      byNurse.set(nurseKey, nurseRow);

      const month = `${s.attendedAt.getFullYear()}-${String(s.attendedAt.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);

      if (s.estimatedDays != null && s.estimatedDays > 0) {
        estimatedDaysSum += s.estimatedDays;
        estimatedDaysCount += 1;
      }

      for (const d of s.sessionDiagnoses) {
        const label = d.diagnosisLabel ?? d.diagnosis?.name ?? 'Sem diagnóstico';
        byDiagnosis.set(label, (byDiagnosis.get(label) ?? 0) + 1);
      }
      for (const t of s.sessionTreatments) {
        const label = t.treatmentLabel ?? t.treatment?.name ?? 'Sem tratamento';
        byTreatment.set(label, (byTreatment.get(label) ?? 0) + 1);
      }
    }

    return {
      summary: {
        total: sessions.length,
        active: activeCount,
        completed: completedCount,
        uniquePlayers: uniquePlayers.size,
        avgEstimatedDays:
          estimatedDaysCount > 0 ? Math.round((estimatedDaysSum / estimatedDaysCount) * 10) / 10 : null,
      },
      byCategory: [...byCategory.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
      byDiagnosis: [...byDiagnosis.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30),
      byTreatment: [...byTreatment.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30),
      byNurse: [...byNurse.values()].sort((a, b) => b.count - a.count),
      byMonth: [...byMonth.entries()]
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      sessions: sessions.map((s) => ({
        id: s.id,
        attendedAt: s.attendedAt.toISOString(),
        status: s.status,
        category: s.category ?? s.player?.category ?? null,
        playerId: s.playerId,
        playerName: s.player ? getPlayerListDisplayName(s.player) : 'Atleta',
        tenantName: s.tenant?.name ?? '',
        nurseName: s.nurseName,
        symptoms: s.symptoms,
        estimatedDays: s.estimatedDays,
        estimatedEndDate: s.estimatedEndDate?.toISOString() ?? null,
        diagnoses: s.sessionDiagnoses
          .map((d) => d.diagnosisLabel ?? d.diagnosis?.name)
          .filter(Boolean),
        treatments: s.sessionTreatments
          .map((t) => t.treatmentLabel ?? t.treatment?.name)
          .filter(Boolean),
      })),
    };
  }
}
