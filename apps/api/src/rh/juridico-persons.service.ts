import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JuridicoPersonsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPersonOptions(filters?: {
    tenantId?: string;
    category?: string;
    search?: string;
  }) {
    const where: Prisma.EmployeeWhereInput = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;

    if (filters?.category) {
      where.player = { category: filters.category };
    }

    if (filters?.search) {
      const term = filters.search;
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { code: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const rows = await this.prisma.employee.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        playerId: true,
        tenant: { select: { id: true, name: true } },
        player: { select: { id: true, category: true } },
      },
    });

    return rows.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      playerId: e.playerId,
      tenantName: e.tenant.name,
      category: e.player?.category ?? null,
    }));
  }
}
