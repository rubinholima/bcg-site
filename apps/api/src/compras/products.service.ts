import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, search?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' as const } },
        { sku: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
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
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.name != null) data.name = dto.name;
    if (dto.sku !== undefined) data.sku = dto.sku ?? null;
    if (dto.unit !== undefined) data.unit = dto.unit ?? 'un';
    if (dto.stockMin !== undefined) data.stockMin = dto.stockMin;
    if (dto.currentStock !== undefined) data.currentStock = dto.currentStock;
    return this.prisma.product.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  /** Produtos com currentStock <= stockMin (estoque mínimo). */
  async getStockAlerts(tenantId?: string) {
    const where: Record<string, unknown> = { stockMin: { gt: 0 } };
    if (tenantId) where.tenantId = tenantId;
    const products = await this.prisma.product.findMany({
      where,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    return products.filter((p) => p.currentStock <= p.stockMin);
  }
}
