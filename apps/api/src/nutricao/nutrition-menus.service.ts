import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionMenuDto } from './dto/create-nutrition-menu.dto';
import { UpdateNutritionMenuDto } from './dto/update-nutrition-menu.dto';

@Injectable()
export class NutritionMenusService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, categoryId?: string, dayContext?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (categoryId) where.categoryId = categoryId;
    if (dayContext?.trim()) where.dayContext = dayContext.trim();
    return this.prisma.nutritionMenu.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, code: true } },
        items: { orderBy: [{ sortOrder: 'asc' }, { mealType: { sortOrder: 'asc' } }], include: { mealType: true } },
      },
    });
  }

  async findOne(id: string) {
    const menu = await this.prisma.nutritionMenu.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: true,
        items: { orderBy: [{ sortOrder: 'asc' }], include: { mealType: true } },
      },
    });
    if (!menu) throw new NotFoundException('Cardápio não encontrado');
    return menu;
  }

  async create(dto: CreateNutritionMenuDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    if (dto.categoryId) {
      const cat = await this.prisma.nutritionCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat || cat.tenantId !== dto.tenantId) throw new NotFoundException('Categoria não encontrada');
    }
    return this.prisma.nutritionMenu.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        categoryId: dto.categoryId ?? null,
        dayContext: dto.dayContext ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        notes: dto.notes ?? null,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateNutritionMenuDto) {
    await this.findOne(id);
    if (dto.categoryId !== undefined && dto.categoryId) {
      const cat = await this.prisma.nutritionCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Categoria não encontrada');
    }
    return this.prisma.nutritionMenu.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ?? null }),
        ...(dto.dayContext !== undefined && { dayContext: dto.dayContext ?? null }),
        ...(dto.validFrom !== undefined && { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }),
        ...(dto.validTo !== undefined && { validTo: dto.validTo ? new Date(dto.validTo) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
        items: { include: { mealType: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.nutritionMenu.delete({ where: { id } });
  }
}
