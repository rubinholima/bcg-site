import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroJsonStringArray, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InventoryCategoriesService } from './inventory-categories.service';
import { computeEntryPricing, decimalToNumber, toDecimal } from './product-pricing.util';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryCategories: InventoryCategoriesService,
  ) {}

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
    if (inventoryKind?.trim()) {
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

    const initialQty = dto.initialQuantity ?? 0;
    const initialPrice = dto.initialUnitPrice;
    if (initialQty > 0 && (initialPrice == null || initialPrice < 0)) {
      throw new BadRequestException('Informe o preço de entrada quando houver quantidade inicial');
    }

    const kind = dto.inventoryKind ?? 'uso_consumo';
    await this.inventoryCategories.assertValidKind(dto.tenantId, kind);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId: dto.tenantId,
          name: cadastroUpperRequired(dto.name),
          sku: cadastroUpper(dto.sku),
          unit: dto.unit ?? 'un',
          stockMin: dto.stockMin ?? 0,
          currentStock: 0,
          inventoryKind: kind,
          squadTags:
            dto.squadTags && dto.squadTags.length > 0
              ? (cadastroJsonStringArray(dto.squadTags) as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
        include: { tenant: { select: { id: true, name: true, slug: true, categories: true } } },
      });

      if (initialQty > 0 && initialPrice != null) {
        const pricing = computeEntryPricing(0, null, initialQty, initialPrice);
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: initialQty,
            type: 'adjustment',
            unitPrice: toDecimal(initialPrice),
            notes: 'Cadastro inicial do produto',
          },
        });
        return tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: pricing.newStock,
            purchasePrice: toDecimal(pricing.purchasePrice),
            currentPrice: toDecimal(pricing.currentPrice),
            averagePrice: toDecimal(pricing.averagePrice),
          },
          include: { tenant: { select: { id: true, name: true, slug: true, categories: true } } },
        });
      }

      return product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);
    const data: Prisma.ProductUpdateInput = {};
    if (dto.name != null) data.name = cadastroUpperRequired(dto.name);
    if (dto.sku !== undefined) data.sku = cadastroUpper(dto.sku);
    if (dto.unit !== undefined) data.unit = dto.unit ?? 'un';
    if (dto.stockMin !== undefined) data.stockMin = dto.stockMin;
    if (dto.inventoryKind !== undefined) {
      await this.inventoryCategories.assertValidKind(existing.tenantId, dto.inventoryKind);
      data.inventoryKind = dto.inventoryKind;
    }
    if (dto.squadTags !== undefined) {
      data.squadTags =
        dto.squadTags.length > 0
          ? (cadastroJsonStringArray(dto.squadTags) as Prisma.InputJsonValue)
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

  /** Usado pelo serviço de movimentação após entrada com preço. */
  applyEntryPricing(
    product: { currentStock: number; averagePrice: Prisma.Decimal | null },
    entryQty: number,
    unitPrice: number,
  ) {
    return computeEntryPricing(
      product.currentStock,
      decimalToNumber(product.averagePrice),
      entryQty,
      unitPrice,
    );
  }
}
