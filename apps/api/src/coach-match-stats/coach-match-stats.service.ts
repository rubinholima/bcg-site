import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type UpsertMatchStatOverrideInput = {
  tenantId: string;
  category?: string | null;
  fmfMatchReportId?: string | null;
  travelLogisticsId?: string | null;
  matchDate: string;
  opponentName?: string | null;
  goalsFor?: number | null;
  goalsAgainst?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  possessionPct?: number | null;
  setPiecesFor?: number | null;
  setPiecesAgainst?: number | null;
  notes?: string | null;
};

function clampPct(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function clampCount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

@Injectable()
export class CoachMatchStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: UpsertMatchStatOverrideInput) {
    if (!input.tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    if (!/^\d{4}-\d{2}-\d{2}/.test(input.matchDate)) {
      throw new BadRequestException('Data do jogo inválida');
    }

    const matchDate = new Date(`${input.matchDate.slice(0, 10)}T12:00:00-03:00`);
    const data = {
      tenantId: input.tenantId.trim(),
      category: input.category?.trim() || null,
      fmfMatchReportId: input.fmfMatchReportId?.trim() || null,
      travelLogisticsId: input.travelLogisticsId?.trim() || null,
      matchDate,
      opponentName: input.opponentName?.trim() || null,
      goalsFor: clampCount(input.goalsFor),
      goalsAgainst: clampCount(input.goalsAgainst),
      yellowCards: clampCount(input.yellowCards),
      redCards: clampCount(input.redCards),
      possessionPct: clampPct(input.possessionPct),
      setPiecesFor: clampCount(input.setPiecesFor),
      setPiecesAgainst: clampCount(input.setPiecesAgainst),
      notes: input.notes?.trim() || null,
    };

    if (data.fmfMatchReportId) {
      const existing = await this.prisma.coachMatchStatOverride.findUnique({
        where: { fmfMatchReportId: data.fmfMatchReportId },
      });
      if (existing) {
        return this.prisma.coachMatchStatOverride.update({
          where: { id: existing.id },
          data,
        });
      }
      return this.prisma.coachMatchStatOverride.create({ data });
    }

    if (data.travelLogisticsId) {
      const existing = await this.prisma.coachMatchStatOverride.findUnique({
        where: { travelLogisticsId: data.travelLogisticsId },
      });
      if (existing) {
        return this.prisma.coachMatchStatOverride.update({
          where: { id: existing.id },
          data,
        });
      }
      return this.prisma.coachMatchStatOverride.create({ data });
    }

    const siblings = await this.prisma.coachMatchStatOverride.findMany({
      where: {
        tenantId: data.tenantId,
        category: data.category,
        matchDate: data.matchDate,
        opponentName: data.opponentName,
        fmfMatchReportId: null,
        travelLogisticsId: null,
      },
      take: 1,
    });

    if (siblings[0]) {
      return this.prisma.coachMatchStatOverride.update({
        where: { id: siblings[0].id },
        data,
      });
    }

    return this.prisma.coachMatchStatOverride.create({ data });
  }
}
