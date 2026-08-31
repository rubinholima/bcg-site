import { Injectable, NotFoundException } from '@nestjs/common';
import { filterCurrentSquadPlayers } from '../common/player-roster.util';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Injectable()
export class NutritionReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async kitchenMenuReport(params: {
    tenantId: string;
    categoryId: string;
    startDate: string;
    endDate: string;
  }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const category = await this.prisma.nutritionCategory.findUnique({
      where: { id: params.categoryId },
    });
    if (!category || category.tenantId !== params.tenantId) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const entries = await this.prisma.nutritionCalendarEntry.findMany({
      where: {
        tenantId: params.tenantId,
        categoryId: params.categoryId,
        date: {
          gte: startOfDay(new Date(params.startDate)),
          lte: endOfDay(new Date(params.endDate)),
        },
      },
      orderBy: [{ date: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        menu: {
          include: {
            items: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              include: { mealType: true },
            },
          },
        },
      },
    });

    const mealTypes = await this.prisma.nutritionMealType.findMany({
      where: { tenantId: params.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      tenant,
      category,
      startDate: params.startDate,
      endDate: params.endDate,
      mealTypes,
      days: entries.map((e) => ({
        id: e.id,
        date: e.date,
        dayContext: e.dayContext ?? e.menu.dayContext,
        notes: e.notes,
        menu: {
          id: e.menu.id,
          name: e.menu.name,
          items: e.menu.items.map((item) => ({
            id: item.id,
            description: item.description,
            calories: item.calories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatsG: item.fatsG,
            sortOrder: item.sortOrder,
            mealType: item.mealType,
          })),
        },
      })),
    };
  }

  async supplementationReport(params: {
    tenantId: string;
    categoryId?: string;
    playerId?: string;
    scope?: 'all' | 'team' | 'category' | 'individual';
  }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const scope = params.scope ?? 'all';
    const where: Record<string, unknown> = { tenantId: params.tenantId };

    if (scope === 'individual' && params.playerId) {
      where.playerId = params.playerId;
    } else if (scope === 'category' && params.categoryId) {
      where.categoryId = params.categoryId;
      where.playerId = null;
    } else if (scope === 'team') {
      where.categoryId = null;
      where.playerId = null;
    } else {
      if (params.categoryId) where.categoryId = params.categoryId;
      if (params.playerId) where.playerId = params.playerId;
    }

    const guides = await this.prisma.supplementGuide.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
      },
    });

    let players: Array<{ id: string; name: string; jerseyNumber: number | null; category: string | null }> = [];
    if (params.categoryId && scope !== 'individual') {
      const cat = await this.prisma.nutritionCategory.findUnique({ where: { id: params.categoryId } });
      if (cat?.code) {
        const rosterRaw = await this.prisma.player.findMany({
          where: { tenantId: params.tenantId, category: cat.code },
          select: { id: true, name: true, jerseyNumber: true, category: true, registrationProfile: true },
          orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
        });
        players = filterCurrentSquadPlayers(rosterRaw).map(({ id, name, jerseyNumber, category: catCode }) => ({
          id,
          name,
          jerseyNumber,
          category: catCode,
        }));
      }
    }

    return {
      tenant,
      scope,
      categoryId: params.categoryId ?? null,
      playerId: params.playerId ?? null,
      guides,
      rosterPlayers: players,
    };
  }
}
