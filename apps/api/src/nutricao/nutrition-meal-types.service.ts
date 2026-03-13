import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionMealTypeDto } from './dto/create-nutrition-meal-type.dto';
import { UpdateNutritionMealTypeDto } from './dto/update-nutrition-meal-type.dto';

@Injectable()
export class NutritionMealTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    return this.prisma.nutritionMealType.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const mt = await this.prisma.nutritionMealType.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!mt) throw new NotFoundException('Tipo de refeição não encontrado');
    return mt;
  }

  async create(dto: CreateNutritionMealTypeDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return this.prisma.nutritionMealType.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        code: dto.code,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateNutritionMealTypeDto) {
    await this.findOne(id);
    return this.prisma.nutritionMealType.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.code != null && { code: dto.code }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.nutritionMealType.delete({ where: { id } });
  }
}
