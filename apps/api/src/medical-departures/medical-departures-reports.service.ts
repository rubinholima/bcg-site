import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';
import { resolveDepartureDocuments } from './medical-departure-documents.util';

@Injectable()
export class MedicalDeparturesReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Sem acesso a este clube.');
    }
  }

  async getDashboard(
    filters: {
      tenantId?: string;
      playerId?: string;
      category?: string;
      careType?: string;
      transportMode?: string;
      status?: string;
      from?: string;
      to?: string;
    },
    allowed: string[] | null,
  ) {
    const where: Prisma.PlayerMedicalDepartureWhereInput = {};
    if (filters.tenantId) {
      this.assertTenant(allowed, filters.tenantId);
      where.tenantId = filters.tenantId;
    } else if (allowed !== null) {
      where.tenantId = { in: allowed };
    }
    if (filters.playerId) where.playerId = filters.playerId;
    if (filters.category) where.category = filters.category;
    if (filters.careType) where.careType = filters.careType;
    if (filters.transportMode) where.transportMode = filters.transportMode;
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.from || filters.to) {
      where.departedAt = {};
      if (filters.from) where.departedAt.gte = new Date(`${filters.from}T00:00:00`);
      if (filters.to) where.departedAt.lte = new Date(`${filters.to}T23:59:59`);
    }

    const rows = await this.prisma.playerMedicalDeparture.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            category: true,
            jerseyNumber: true,
            registrationProfile: true,
          },
        },
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { departedAt: 'desc' },
      take: 5000,
    });

    const byCareType = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const byTransport = new Map<string, number>();
    const byStatus = new Map<string, number>();
    const uniquePlayers = new Set<string>();

    for (const s of rows) {
      uniquePlayers.add(s.playerId);
      byCareType.set(s.careType, (byCareType.get(s.careType) ?? 0) + 1);
      byTransport.set(s.transportMode, (byTransport.get(s.transportMode) ?? 0) + 1);
      byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
      const cat = s.category?.trim() || s.player?.category?.trim() || 'Sem categoria';
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
    }

    return {
      summary: {
        total: rows.length,
        uniquePlayers: uniquePlayers.size,
      },
      byCareType: [...byCareType.entries()]
        .map(([careType, count]) => ({ careType, count }))
        .sort((a, b) => b.count - a.count),
      byCategory: [...byCategory.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      byTransport: [...byTransport.entries()]
        .map(([transportMode, count]) => ({ transportMode, count }))
        .sort((a, b) => b.count - a.count),
      byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
      departures: rows.map((s) => ({
        id: s.id,
        departedAt: s.departedAt.toISOString(),
        returnedAt: s.returnedAt?.toISOString() ?? null,
        destination: s.destination,
        careType: s.careType,
        reason: s.reason,
        careSummary: s.careSummary,
        transportMode: s.transportMode,
        status: s.status,
        category: s.category ?? s.player?.category ?? null,
        companionName: s.companionName,
        player: s.player
          ? {
              id: s.player.id,
              name: getPlayerListDisplayName(s.player),
              jerseyNumber: s.player.jerseyNumber,
            }
          : null,
        tenant: s.tenant,
        documents: resolveDepartureDocuments(s.player.registrationProfile, s.documentIds),
      })),
    };
  }
}