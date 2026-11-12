import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { applyRhTenantFilter, assertRhTenantAccess } from './rh-scope.util';

@Injectable()
export class BenefitCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string | undefined, allowed: string[] | null, activeOnly = true) {
    const where: { tenantId?: string | { in: string[] }; active?: boolean } = {};
    applyRhTenantFilter(where, allowed, tenantId);
    if (activeOnly) where.active = true;
    return this.prisma.rhBenefitCatalog.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async upsert(
    dto: {
      id?: string;
      tenantId: string;
      code: string;
      name: string;
      description?: string;
      active?: boolean;
      sortOrder?: number;
    },
    allowed: string[] | null,
  ) {
    assertRhTenantAccess(allowed, dto.tenantId);
    if (dto.id) {
      const row = await this.prisma.rhBenefitCatalog.findUnique({ where: { id: dto.id } });
      if (!row) throw new NotFoundException('Benefício não encontrado.');
      assertRhTenantAccess(allowed, row.tenantId);
      return this.prisma.rhBenefitCatalog.update({
        where: { id: dto.id },
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description ?? null,
          active: dto.active ?? row.active,
          sortOrder: dto.sortOrder ?? row.sortOrder,
        },
      });
    }
    return this.prisma.rhBenefitCatalog.create({
      data: {
        tenantId: dto.tenantId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description ?? null,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }
}
