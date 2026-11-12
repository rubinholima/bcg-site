import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';

@Injectable()
export class FinanceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, activeOnly?: boolean) {
    return this.prisma.financeCategory.findMany({
      where: { tenantId, ...(activeOnly ? { active: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { parent: { select: { id: true, name: true } } },
    });
  }

  async create(
    tenantId: string,
    dto: { name: string; parentId?: string; code?: string; description?: string; sortOrder?: number },
  ) {
    if (dto.parentId) {
      const parent = await this.prisma.financeCategory.findFirst({
        where: { id: dto.parentId, tenantId, active: true },
      });
      if (!parent) throw new BadRequestException('Categoria pai inválida.');
    }
    return this.prisma.financeCategory.create({
      data: {
        tenantId,
        parentId: dto.parentId?.trim() || null,
        name: cadastroUpperRequired(dto.name),
        code: dto.code?.trim() || null,
        description: cadastroUpper(dto.description),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<{
      name: string;
      parentId: string | null;
      code: string;
      description: string;
      sortOrder: number;
      active: boolean;
    }>,
  ) {
    const row = await this.prisma.financeCategory.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Categoria não encontrada.');
    if (dto.parentId === id) throw new BadRequestException('Categoria não pode ser pai de si mesma.');
    if (dto.active === false) {
      const usage = await this.prisma.financeiroLancamento.count({
        where: { tenantId, financeCategoryId: id },
      });
      if (usage > 0) {
        // apenas desativa — não apaga
      }
    }
    return this.prisma.financeCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: cadastroUpperRequired(dto.name) } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() || null } : {}),
        ...(dto.description !== undefined ? { description: cadastroUpper(dto.description) } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }
}
