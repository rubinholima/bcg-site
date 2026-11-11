import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { cadastroUpperRequired } from '../common/cadastro-text';

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

@Injectable()
export class SupplierCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string | undefined, allowedTenantIds: string[] | null) {
    const where: Prisma.SupplierCategoryWhereInput = { active: true };
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }];
    } else if (allowedTenantIds !== null) {
      where.OR = [{ tenantId: { in: allowedTenantIds } }, { tenantId: null }];
    }
    return this.prisma.supplierCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(tenantId: string, name: string, sortOrder?: number) {
    const slug = slugify(name);
    if (!slug) throw new BadRequestException('Nome inválido.');
    const existing = await this.prisma.supplierCategory.findFirst({
      where: { tenantId, slug },
    });
    if (existing) throw new BadRequestException('Já existe uma categoria com este nome.');
    return this.prisma.supplierCategory.create({
      data: {
        tenantId,
        slug,
        name: cadastroUpperRequired(name),
        sortOrder: sortOrder ?? 0,
      },
    });
  }

  async update(id: string, data: { name?: string; sortOrder?: number; active?: boolean }) {
    const row = await this.prisma.supplierCategory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.supplierCategory.update({
      where: { id },
      data: {
        ...(data.name != null && {
          name: cadastroUpperRequired(data.name),
          slug: slugify(data.name),
        }),
        ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
        ...(data.active != null && { active: data.active }),
      },
    });
  }

  async remove(id: string) {
    const row = await this.prisma.supplierCategory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Categoria não encontrada');
    await this.prisma.supplier.updateMany({
      where: { supplierCategoryId: id },
      data: { supplierCategoryId: null },
    });
    return this.prisma.supplierCategory.update({
      where: { id },
      data: { active: false },
    });
  }
}
