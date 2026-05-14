import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { INVENTORY_KINDS } from './inventory-kinds';

function parseSquadTags(raw: Prisma.JsonValue | null): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  return raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim());
}

function matchesSquadFilter(productSquadTags: Prisma.JsonValue | null, squadTag: string | undefined): boolean {
  if (!squadTag?.trim()) return true;
  const tags = parseSquadTags(productSquadTags);
  if (!tags || tags.length === 0) return true;
  return tags.includes(squadTag.trim());
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId?: string,
    search?: string,
    inventoryKind?: string,
    squadTag?: string,
  ) {
    const where: Prisma.ProductWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' as const } },
        { sku: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    if (inventoryKind?.trim() && (INVENTORY_KINDS as readonly string[]).includes(inventoryKind.trim())) {
      where.inventoryKind = inventoryKind.trim();
    }
    const rows = await this.prisma.product.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { inventoryKind: 'asc' }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true, categories: true } } },
    });
    const st = squadTag?.trim();
    if (!st) return rows;
    return rows.filter((p) => matchesSquadFilter(p.squadTags, st));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true, categories: true } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async create(dto: CreateProductDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant "${dto.tenantId}" não encontrado`);
    return this.prisma.product.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        sku: dto.sku ?? null,
        unit: dto.unit ?? 'un',
        stockMin: dto.stockMin ?? 0,
        currentStock: dto.currentStock ?? 0,
        inventoryKind: dto.inventoryKind ?? 'geral',
        squadTags:
          dto.squadTags && dto.squadTags.length > 0
            ? dto.squadTags.map((s) => s.trim()).filter(Boolean)
            : Prisma.JsonNull,
      },
      include: { tenant: { select: { id: true, name: true, slug: true, categories: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const data: Prisma.ProductUpdateInput = {};
    if (dto.name != null) data.name = dto.name;
    if (dto.sku !== undefined) data.sku = dto.sku ?? null;
    if (dto.unit !== undefined) data.unit = dto.unit ?? 'un';
    if (dto.stockMin !== undefined) data.stockMin = dto.stockMin;
    if (dto.currentStock !== undefined) data.currentStock = dto.currentStock;
    if (dto.inventoryKind !== undefined) data.inventoryKind = dto.inventoryKind;
    if (dto.squadTags !== undefined) {
      data.squadTags =
        dto.squadTags.length > 0
          ? dto.squadTags.map((s) => s.trim()).filter(Boolean)
          : Prisma.JsonNull;
    }
    return this.prisma.product.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true, categories: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  /** Produtos com currentStock <= stockMin (estoque mínimo). */
  async getStockAlerts(tenantId?: string) {
    const where: Prisma.ProductWhereInput = { stockMin: { gt: 0 } };
    if (tenantId) where.tenantId = tenantId;
    const products = await this.prisma.product.findMany({
      where,
      include: { tenant: { select: { id: true, name: true, slug: true, categories: true } } },
    });
    return products.filter((p) => p.currentStock <= p.stockMin);
  }
}
