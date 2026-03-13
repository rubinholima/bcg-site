import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionCalendarEntryDto } from './dto/create-nutrition-calendar-entry.dto';
import { UpdateNutritionCalendarEntryDto } from './dto/update-nutrition-calendar-entry.dto';

@Injectable()
export class NutritionCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async findForTenant(tenantId: string, categoryId?: string, startDate?: string, endDate?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (categoryId) where.categoryId = categoryId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }
    return this.prisma.nutritionCalendarEntry.findMany({
      where,
      orderBy: [{ date: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        menu: { select: { id: true, name: true, dayContext: true }, include: { items: { include: { mealType: true } } } },
      },
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.nutritionCalendarEntry.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        category: true,
        menu: { include: { items: { include: { mealType: true } } } },
      },
    });
    if (!entry) throw new NotFoundException('Entrada do calendário não encontrada');
    return entry;
  }

  async create(dto: CreateNutritionCalendarEntryDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    const category = await this.prisma.nutritionCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category || category.tenantId !== dto.tenantId) throw new NotFoundException('Categoria não encontrada');
    const menu = await this.prisma.nutritionMenu.findUnique({ where: { id: dto.menuId } });
    if (!menu || menu.tenantId !== dto.tenantId) throw new NotFoundException('Cardápio não encontrado');
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    return this.prisma.nutritionCalendarEntry.upsert({
      where: {
        tenantId_categoryId_date: { tenantId: dto.tenantId, categoryId: dto.categoryId, date },
      },
      create: {
        tenantId: dto.tenantId,
        categoryId: dto.categoryId,
        date,
        menuId: dto.menuId,
        dayContext: dto.dayContext ?? null,
        notes: dto.notes ?? null,
      },
      update: {
        menuId: dto.menuId,
        dayContext: dto.dayContext ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        category: { select: { id: true, name: true } },
        menu: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateNutritionCalendarEntryDto) {
    await this.findOne(id);
    if (dto.menuId) {
      const menu = await this.prisma.nutritionMenu.findUnique({ where: { id: dto.menuId } });
      if (!menu) throw new NotFoundException('Cardápio não encontrado');
    }
    return this.prisma.nutritionCalendarEntry.update({
      where: { id },
      data: {
        ...(dto.menuId != null && { menuId: dto.menuId }),
        ...(dto.dayContext !== undefined && { dayContext: dto.dayContext ?? null }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
      include: {
        category: { select: { id: true, name: true } },
        menu: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.nutritionCalendarEntry.delete({ where: { id } });
  }
}
