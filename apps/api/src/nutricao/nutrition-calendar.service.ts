import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionCalendarEntryDto } from './dto/create-nutrition-calendar-entry.dto';
import { UpdateNutritionCalendarEntryDto } from './dto/update-nutrition-calendar-entry.dto';
import { RepeatNutritionCalendarDto } from './dto/repeat-nutrition-calendar.dto';
import {
  addDaysToDateKey,
  parseDateOnlyBrazil,
  weekdayBrazil,
} from '../common/brazil-time.util';

@Injectable()
export class NutritionCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeDateKey(value: string): string {
    const key = value.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      throw new BadRequestException('Data inválida');
    }
    return key;
  }

  private resolveTargetDateKeys(
    sourceDate: string,
    repeatWeekdays?: number[],
    repeatUntilDate?: string,
  ): string[] {
    const keys = new Set<string>([sourceDate]);
    if (!repeatWeekdays?.length || !repeatUntilDate?.trim()) {
      return [sourceDate];
    }
    const until = this.normalizeDateKey(repeatUntilDate);
    if (until < sourceDate) {
      throw new BadRequestException('A data limite deve ser igual ou posterior à data base.');
    }
    const weekdays = [...new Set(repeatWeekdays.filter((d) => d >= 0 && d <= 6))];
    if (weekdays.length === 0) {
      throw new BadRequestException('Selecione ao menos um dia da semana para repetir.');
    }

    let cursor = sourceDate;
    while (cursor <= until) {
      if (weekdays.includes(weekdayBrazil(cursor))) {
        keys.add(cursor);
      }
      cursor = addDaysToDateKey(cursor, 1);
    }
    return [...keys].sort();
  }

  private async resolveCategoryIds(tenantId: string, categoryId?: string, applyToAll?: boolean) {
    if (applyToAll) {
      const rows = await this.prisma.nutritionCategory.findMany({
        where: { tenantId },
        select: { id: true },
        orderBy: { name: 'asc' },
      });
      if (rows.length === 0) {
        throw new BadRequestException('Nenhuma categoria de nutrição cadastrada para este clube.');
      }
      return rows.map((r) => r.id);
    }
    if (!categoryId?.trim()) {
      throw new BadRequestException('Informe a categoria ou marque todas as categorias.');
    }
    const category = await this.prisma.nutritionCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.tenantId !== tenantId) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return [categoryId];
  }

  private async upsertEntry(input: {
    tenantId: string;
    categoryId: string;
    dateKey: string;
    menuId: string;
    dayContext?: string | null;
    notes?: string | null;
  }) {
    const date = parseDateOnlyBrazil(input.dateKey);
    return this.prisma.nutritionCalendarEntry.upsert({
      where: {
        tenantId_categoryId_date: {
          tenantId: input.tenantId,
          categoryId: input.categoryId,
          date,
        },
      },
      create: {
        tenantId: input.tenantId,
        categoryId: input.categoryId,
        date,
        menuId: input.menuId,
        dayContext: input.dayContext ?? null,
        notes: input.notes ?? null,
      },
      update: {
        menuId: input.menuId,
        dayContext: input.dayContext ?? null,
        notes: input.notes ?? null,
      },
      include: {
        category: { select: { id: true, name: true } },
        menu: { select: { id: true, name: true } },
      },
    });
  }

  async findForTenant(tenantId: string, categoryId?: string, startDate?: string, endDate?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (categoryId) where.categoryId = categoryId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = parseDateOnlyBrazil(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = parseDateOnlyBrazil(endDate);
    }
    return this.prisma.nutritionCalendarEntry.findMany({
      where,
      orderBy: [{ date: 'asc' }, { category: { name: 'asc' } }],
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

    const menu = await this.prisma.nutritionMenu.findUnique({ where: { id: dto.menuId } });
    if (!menu || menu.tenantId !== dto.tenantId) throw new NotFoundException('Cardápio não encontrado');

    const sourceDate = this.normalizeDateKey(dto.date);
    const categoryIds = await this.resolveCategoryIds(
      dto.tenantId,
      dto.categoryId,
      dto.applyToAllCategories,
    );
    const dateKeys = this.resolveTargetDateKeys(
      sourceDate,
      dto.repeatWeekdays,
      dto.repeatUntilDate,
    );

    const entries: Awaited<ReturnType<typeof this.upsertEntry>>[] = [];
    for (const dateKey of dateKeys) {
      for (const categoryId of categoryIds) {
        entries.push(
          await this.upsertEntry({
            tenantId: dto.tenantId,
            categoryId,
            dateKey,
            menuId: dto.menuId,
            dayContext: dto.dayContext ?? null,
            notes: dto.notes ?? null,
          }),
        );
      }
    }

    return {
      created: entries.length,
      targetDays: dateKeys.length,
      categories: categoryIds.length,
      entries,
    };
  }

  async repeatFromSourceDay(dto: RepeatNutritionCalendarDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const sourceDate = this.normalizeDateKey(dto.sourceDate);
    const untilDate = this.normalizeDateKey(dto.untilDate);
    if (untilDate < sourceDate) {
      throw new BadRequestException('A data limite deve ser igual ou posterior à data base.');
    }

    const weekdays = [...new Set(dto.weekdays.filter((d) => d >= 0 && d <= 6))];
    if (weekdays.length === 0) {
      throw new BadRequestException('Selecione ao menos um dia da semana.');
    }

    const sourceDayStart = parseDateOnlyBrazil(sourceDate);
    const sourceDayEnd = new Date(`${sourceDate}T23:59:59-03:00`);

    const sources = await this.prisma.nutritionCalendarEntry.findMany({
      where: {
        tenantId: dto.tenantId,
        date: { gte: sourceDayStart, lte: sourceDayEnd },
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        menu: { select: { id: true, name: true } },
      },
    });

    if (sources.length === 0) {
      throw new BadRequestException('Nenhum cardápio cadastrado na data base.');
    }

    const targetDateKeys: string[] = [];
    let cursor = sourceDate;
    while (cursor <= untilDate) {
      if (cursor !== sourceDate && weekdays.includes(weekdayBrazil(cursor))) {
        targetDateKeys.push(cursor);
      }
      cursor = addDaysToDateKey(cursor, 1);
    }

    if (targetDateKeys.length === 0) {
      throw new BadRequestException(
        'Nenhum dia alvo no período. Ajuste os dias da semana ou a data limite.',
      );
    }

    let created = 0;
    const entries: Awaited<ReturnType<typeof this.upsertEntry>>[] = [];
    for (const dateKey of targetDateKeys) {
      for (const source of sources) {
        entries.push(
          await this.upsertEntry({
            tenantId: dto.tenantId,
            categoryId: source.categoryId,
            dateKey,
            menuId: source.menuId,
            dayContext: source.dayContext,
            notes: source.notes,
          }),
        );
        created += 1;
      }
    }

    return {
      created,
      sourceCount: sources.length,
      targetDays: targetDateKeys.length,
      entries,
    };
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
