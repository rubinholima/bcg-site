import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionCategoryDto } from './dto/create-nutrition-category.dto';
import { UpdateNutritionCategoryDto } from './dto/update-nutrition-category.dto';

/** Categorias de jogos (Sub-9 até Sub-20, Principal, Feminino) — mesma lista do cadastro/futebol */
const SYSTEM_CATEGORIES = [
  { value: 'principal', labelPT: 'Principal', labelEN: 'First Team' },
  { value: 'sub20', labelPT: 'Sub-20', labelEN: 'U-20' },
  { value: 'sub17', labelPT: 'Sub-17', labelEN: 'U-17' },
  { value: 'sub15', labelPT: 'Sub-15', labelEN: 'U-15' },
  { value: 'sub13', labelPT: 'Sub-13', labelEN: 'U-13' },
  { value: 'sub11', labelPT: 'Sub-11', labelEN: 'U-11' },
  { value: 'sub9', labelPT: 'Sub-9', labelEN: 'U-9' },
  { value: 'feminino', labelPT: 'Feminino', labelEN: "Women's" },
] as const;

@Injectable()
export class NutritionCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    let list = await this.prisma.nutritionCategory.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (tenantId && list.length === 0) {
      await this.ensureSystemCategoriesForTenant(tenantId);
      list = await this.prisma.nutritionCategory.findMany({
        where: { tenantId },
        orderBy: [{ name: 'asc' }],
        include: { tenant: { select: { id: true, name: true, slug: true } } },
      });
    }
    return list;
  }

  private async ensureSystemCategoriesForTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return;
    for (const cat of SYSTEM_CATEGORIES) {
      const existing = await this.prisma.nutritionCategory.findFirst({
        where: { tenantId, code: cat.value },
      });
      if (!existing) {
        await this.prisma.nutritionCategory.create({
          data: {
            tenantId,
            code: cat.value,
            name: cat.labelPT,
          },
        });
      }
    }
  }

  async findOne(id: string) {
    const cat = await this.prisma.nutritionCategory.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  async create(dto: CreateNutritionCategoryDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return this.prisma.nutritionCategory.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        code: dto.code ?? null,
        dailyCaloriesTarget: dto.dailyCaloriesTarget ?? null,
        notes: dto.notes ?? null,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateNutritionCategoryDto) {
    await this.findOne(id);
    return this.prisma.nutritionCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code ?? null }),
        ...(dto.dailyCaloriesTarget !== undefined && { dailyCaloriesTarget: dto.dailyCaloriesTarget ?? null }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.nutritionCategory.delete({ where: { id } });
  }
}
