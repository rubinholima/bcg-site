import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';
import { INVENTORY_KIND_LABELS } from './inventory-kinds';
import { slugifyInventoryCategory } from './inventory-category-slug.util';

@Injectable()
export class InventoryCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    const where = tenantId
      ? { OR: [{ isSystem: true }, { tenantId }] }
      : { OR: [{ isSystem: true }, { tenantId: { not: null } }] };

    return this.prisma.inventoryCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.inventoryCategory.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Categoria não encontrada');
    return row;
  }

  async getSlugsForTenant(tenantId: string): Promise<Set<string>> {
    const rows = await this.findAll(tenantId);
    return new Set(rows.map((r) => r.slug));
  }

  async assertValidKind(tenantId: string, slug: string) {
    const allowed = await this.getSlugsForTenant(tenantId);
    if (!allowed.has(slug)) {
      throw new BadRequestException('Categoria de produto inválida para este clube');
    }
  }

  labelForSlug(slug: string): string {
    return INVENTORY_KIND_LABELS[slug] ?? slug.replace(/_/g, ' ');
  }

  private async uniqueSlugForTenant(tenantId: string, base: string): Promise<string> {
    let slug = base;
    let n = 2;
    while (true) {
      const clashSystem = await this.prisma.inventoryCategory.findFirst({
        where: { isSystem: true, slug },
      });
      const clashTenant = await this.prisma.inventoryCategory.findFirst({
        where: { tenantId, slug, isSystem: false },
      });
      if (!clashSystem && !clashTenant) return slug;
      slug = `${base}_${n}`;
      n += 1;
    }
  }

  async create(dto: CreateInventoryCategoryDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Clube/empresa não encontrado');

    const baseSlug = slugifyInventoryCategory(dto.slug?.trim() || dto.name);
    const slug = await this.uniqueSlugForTenant(dto.tenantId, baseSlug);

    return this.prisma.inventoryCategory.create({
      data: {
        tenantId: dto.tenantId,
        slug,
        name: cadastroUpperRequired(dto.name),
        sortOrder: dto.sortOrder ?? 500,
        isSystem: false,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateInventoryCategoryDto) {
    const row = await this.findOne(id);
    if (row.isSystem) throw new BadRequestException('Categorias do sistema não podem ser editadas');
    return this.prisma.inventoryCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (row.isSystem) throw new BadRequestException('Categorias do sistema não podem ser excluídas');

    const productCount = await this.prisma.product.count({
      where: {
        inventoryKind: row.slug,
        ...(row.tenantId ? { tenantId: row.tenantId } : {}),
      },
    });
    if (productCount > 0) {
      throw new BadRequestException('Categoria possui produtos vinculados. Altere os produtos antes de excluir.');
    }

    await this.prisma.inventoryCategory.delete({ where: { id } });
  }
}
