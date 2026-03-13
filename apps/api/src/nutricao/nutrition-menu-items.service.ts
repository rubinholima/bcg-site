import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionMenuItemDto } from './dto/create-nutrition-menu-item.dto';
import { UpdateNutritionMenuItemDto } from './dto/update-nutrition-menu-item.dto';

@Injectable()
export class NutritionMenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByMenu(menuId: string) {
    const menu = await this.prisma.nutritionMenu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Cardápio não encontrado');
    return this.prisma.nutritionMenuItem.findMany({
      where: { menuId },
      orderBy: [{ sortOrder: 'asc' }, { mealType: { sortOrder: 'asc' } }],
      include: { mealType: true },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.nutritionMenuItem.findUnique({
      where: { id },
      include: { menu: true, mealType: true },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  async create(menuId: string, dto: CreateNutritionMenuItemDto) {
    const menu = await this.prisma.nutritionMenu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Cardápio não encontrado');
    const mealType = await this.prisma.nutritionMealType.findUnique({ where: { id: dto.mealTypeId } });
    if (!mealType) throw new NotFoundException('Tipo de refeição não encontrado');
    if (mealType.tenantId !== menu.tenantId) throw new NotFoundException('Tipo de refeição não pertence ao mesmo tenant');
    return this.prisma.nutritionMenuItem.create({
      data: {
        menuId,
        mealTypeId: dto.mealTypeId,
        description: dto.description,
        calories: dto.calories ?? null,
        proteinG: dto.proteinG ?? null,
        carbsG: dto.carbsG ?? null,
        fatsG: dto.fatsG ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { mealType: true },
    });
  }

  async update(id: string, dto: UpdateNutritionMenuItemDto) {
    await this.findOne(id);
    if (dto.mealTypeId) {
      const mealType = await this.prisma.nutritionMealType.findUnique({ where: { id: dto.mealTypeId } });
      if (!mealType) throw new NotFoundException('Tipo de refeição não encontrado');
    }
    return this.prisma.nutritionMenuItem.update({
      where: { id },
      data: {
        ...(dto.mealTypeId != null && { mealTypeId: dto.mealTypeId }),
        ...(dto.description != null && { description: dto.description }),
        ...(dto.calories !== undefined && { calories: dto.calories ?? null }),
        ...(dto.proteinG !== undefined && { proteinG: dto.proteinG ?? null }),
        ...(dto.carbsG !== undefined && { carbsG: dto.carbsG ?? null }),
        ...(dto.fatsG !== undefined && { fatsG: dto.fatsG ?? null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: { mealType: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.nutritionMenuItem.delete({ where: { id } });
  }
}
