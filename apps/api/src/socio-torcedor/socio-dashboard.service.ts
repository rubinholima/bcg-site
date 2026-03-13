import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SocioDashboardStats {
  totalMembers: number;
  activeMembers: number;
  newThisMonth: number;
  byPlan: { planId: string; planName: string; count: number }[];
  avgLoyaltyTier: number;
  totalPoints: number;
}

@Injectable()
export class SocioDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string): Promise<SocioDashboardStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, newThisMonth, byPlan, loyaltyAndPoints] = await Promise.all([
      this.prisma.socioMember.count({ where: { tenantId } }),
      this.prisma.socioMember.count({ where: { tenantId, status: 'active' } }),
      this.prisma.socioMember.count({
        where: { tenantId, joinedAt: { gte: startOfMonth } },
      }),
      this.prisma.socioMember.groupBy({
        by: ['planId'],
        where: { tenantId, status: 'active' },
        _count: { id: true },
      }),
      this.prisma.socioMember.aggregate({
        where: { tenantId, status: 'active' },
        _avg: { loyaltyTier: true },
        _sum: { points: true },
      }),
    ]);

    const planIds = [...new Set(byPlan.map((p) => p.planId))];
    const plans = await this.prisma.socioPlan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true },
    });
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]));

    return {
      totalMembers: total,
      activeMembers: active,
      newThisMonth,
      byPlan: byPlan.map((p) => ({
        planId: p.planId,
        planName: planMap[p.planId] ?? '—',
        count: p._count.id,
      })),
      avgLoyaltyTier: loyaltyAndPoints._avg.loyaltyTier ?? 0,
      totalPoints: loyaltyAndPoints._sum.points ?? 0,
    };
  }
}
