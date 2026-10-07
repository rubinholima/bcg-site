import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_VENUE_SLUG,
  VENUE_CATALOG_BILLING_UNITS,
  VENUE_CATALOG_CATEGORIES,
  type VenueCatalogPackageDto,
  type VenueCatalogPackageItemDto,
  type VenueCatalogServiceDto,
} from './boston-city-hall.constants';

function moneyToString(value: Prisma.Decimal | number | string): string {
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

function parseMoney(value: number | string, field = 'Preço'): Prisma.Decimal {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) {
    throw new BadRequestException(`${field} inválido.`);
  }
  return new Prisma.Decimal(n.toFixed(2));
}

function parseQuantity(value: number | string): Prisma.Decimal {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) {
    throw new BadRequestException('Quantidade inválida.');
  }
  return new Prisma.Decimal(n.toFixed(2));
}

function assertCategory(category: string) {
  if (!VENUE_CATALOG_CATEGORIES.includes(category as (typeof VENUE_CATALOG_CATEGORIES)[number])) {
    throw new BadRequestException(`Categoria inválida: ${category}`);
  }
}

function assertBillingUnit(unit: string) {
  if (!VENUE_CATALOG_BILLING_UNITS.includes(unit as (typeof VENUE_CATALOG_BILLING_UNITS)[number])) {
    throw new BadRequestException(`Unidade de cobrança inválida: ${unit}`);
  }
}

function toServiceDto(row: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  category: string;
  defaultPrice: Prisma.Decimal;
  billingUnit: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): VenueCatalogServiceDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    category: row.category,
    defaultPrice: moneyToString(row.defaultPrice),
    billingUnit: row.billingUnit,
    sortOrder: row.sortOrder,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPackageItemDto(row: {
  id: string;
  serviceId: string;
  quantity: Prisma.Decimal;
  service: { name: string };
}): VenueCatalogPackageItemDto {
  return {
    id: row.id,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    quantity: moneyToString(row.quantity),
  };
}

function toPackageDto(
  row: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    defaultPrice: Prisma.Decimal;
    sortOrder: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      serviceId: string;
      quantity: Prisma.Decimal;
      service: { name: string };
    }>;
  },
): VenueCatalogPackageDto {
  const items = row.items.map(toPackageItemDto);
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    defaultPrice: moneyToString(row.defaultPrice),
    sortOrder: row.sortOrder,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
    itemsCount: items.length,
  };
}

const packageInclude = {
  items: {
    include: { service: { select: { name: true } } },
    orderBy: { id: 'asc' as const },
  },
} as const;

@Injectable()
export class BostonCityHallCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant do venue "${venueSlug}" não encontrado.`);
    }
    return tenant.id;
  }

  async listCatalogServices(filters: {
    q?: string;
    category?: string;
    active?: 'true' | 'false' | 'all';
  } = {}): Promise<VenueCatalogServiceDto[]> {
    const tenantId = await this.resolveTenantId();
    const where: Prisma.VenueCatalogServiceWhereInput = { tenantId };

    if (filters.category?.trim()) {
      assertCategory(filters.category.trim());
      where.category = filters.category.trim();
    }

    const active = filters.active ?? 'all';
    if (active === 'true') where.active = true;
    if (active === 'false') where.active = false;

    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.venueCatalogService.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toServiceDto);
  }

  async getCatalogService(id: string): Promise<VenueCatalogServiceDto> {
    const tenantId = await this.resolveTenantId();
    const row = await this.prisma.venueCatalogService.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Serviço não encontrado');
    return toServiceDto(row);
  }

  async createCatalogService(dto: {
    name: string;
    description?: string;
    category: string;
    defaultPrice: number | string;
    billingUnit: string;
    sortOrder?: number;
    active?: boolean;
  }): Promise<VenueCatalogServiceDto> {
    const tenantId = await this.resolveTenantId();
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Nome do serviço é obrigatório');
    assertCategory(dto.category.trim());
    assertBillingUnit(dto.billingUnit.trim());

    const row = await this.prisma.venueCatalogService.create({
      data: {
        tenantId,
        name,
        description: dto.description?.trim() || null,
        category: dto.category.trim(),
        defaultPrice: parseMoney(dto.defaultPrice),
        billingUnit: dto.billingUnit.trim(),
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
    return toServiceDto(row);
  }

  async updateCatalogService(
    id: string,
    dto: Partial<{
      name: string;
      description: string | null;
      category: string;
      defaultPrice: number | string;
      billingUnit: string;
      sortOrder: number;
      active: boolean;
    }>,
  ): Promise<VenueCatalogServiceDto> {
    const tenantId = await this.resolveTenantId();
    const existing = await this.prisma.venueCatalogService.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Serviço não encontrado');

    const data: Prisma.VenueCatalogServiceUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome do serviço é obrigatório');
      data.name = name;
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.category !== undefined) {
      assertCategory(dto.category.trim());
      data.category = dto.category.trim();
    }
    if (dto.defaultPrice !== undefined) data.defaultPrice = parseMoney(dto.defaultPrice);
    if (dto.billingUnit !== undefined) {
      assertBillingUnit(dto.billingUnit.trim());
      data.billingUnit = dto.billingUnit.trim();
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) data.active = dto.active;

    const row = await this.prisma.venueCatalogService.update({ where: { id }, data });
    return toServiceDto(row);
  }

  async listCatalogPackages(filters: {
    q?: string;
    active?: 'true' | 'false' | 'all';
  } = {}): Promise<VenueCatalogPackageDto[]> {
    const tenantId = await this.resolveTenantId();
    const where: Prisma.VenueCatalogPackageWhereInput = { tenantId };

    const active = filters.active ?? 'all';
    if (active === 'true') where.active = true;
    if (active === 'false') where.active = false;

    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.venueCatalogPackage.findMany({
      where,
      include: packageInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toPackageDto);
  }

  async getCatalogPackage(id: string): Promise<VenueCatalogPackageDto> {
    const tenantId = await this.resolveTenantId();
    const row = await this.prisma.venueCatalogPackage.findFirst({
      where: { id, tenantId },
      include: packageInclude,
    });
    if (!row) throw new NotFoundException('Pacote não encontrado');
    return toPackageDto(row);
  }

  async createCatalogPackage(dto: {
    name: string;
    description?: string;
    defaultPrice: number | string;
    sortOrder?: number;
    active?: boolean;
    items?: Array<{ serviceId: string; quantity: number | string }>;
  }): Promise<VenueCatalogPackageDto> {
    const tenantId = await this.resolveTenantId();
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Nome do pacote é obrigatório');

    const items = dto.items ?? [];
    await this.validatePackageItems(tenantId, items);

    const row = await this.prisma.$transaction(async (tx) => {
      const pkg = await tx.venueCatalogPackage.create({
        data: {
          tenantId,
          name,
          description: dto.description?.trim() || null,
          defaultPrice: parseMoney(dto.defaultPrice, 'Preço do pacote'),
          sortOrder: dto.sortOrder ?? 0,
          active: dto.active ?? true,
        },
      });
      if (items.length > 0) {
        await tx.venueCatalogPackageItem.createMany({
          data: items.map((it) => ({
            packageId: pkg.id,
            serviceId: it.serviceId,
            quantity: parseQuantity(it.quantity),
          })),
        });
      }
      return tx.venueCatalogPackage.findUniqueOrThrow({
        where: { id: pkg.id },
        include: packageInclude,
      });
    });

    return toPackageDto(row);
  }

  async updateCatalogPackage(
    id: string,
    dto: Partial<{
      name: string;
      description: string | null;
      defaultPrice: number | string;
      sortOrder: number;
      active: boolean;
      items: Array<{ serviceId: string; quantity: number | string }>;
    }>,
  ): Promise<VenueCatalogPackageDto> {
    const tenantId = await this.resolveTenantId();
    const existing = await this.prisma.venueCatalogPackage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Pacote não encontrado');

    if (dto.items !== undefined) {
      await this.validatePackageItems(tenantId, dto.items);
    }

    const data: Prisma.VenueCatalogPackageUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome do pacote é obrigatório');
      data.name = name;
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.defaultPrice !== undefined) {
      data.defaultPrice = parseMoney(dto.defaultPrice, 'Preço do pacote');
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) data.active = dto.active;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.venueCatalogPackage.update({ where: { id }, data });

      if (dto.items !== undefined) {
        await tx.venueCatalogPackageItem.deleteMany({ where: { packageId: id } });
        if (dto.items.length > 0) {
          await tx.venueCatalogPackageItem.createMany({
            data: dto.items.map((it) => ({
              packageId: id,
              serviceId: it.serviceId,
              quantity: parseQuantity(it.quantity),
            })),
          });
        }
      }

      return tx.venueCatalogPackage.findUniqueOrThrow({
        where: { id },
        include: packageInclude,
      });
    });

    return toPackageDto(row);
  }

  private async validatePackageItems(
    tenantId: string,
    items: Array<{ serviceId: string; quantity: number | string }>,
  ) {
    const ids = [...new Set(items.map((i) => i.serviceId))];
    if (ids.length !== items.length) {
      throw new BadRequestException('Serviço duplicado no pacote.');
    }
    if (ids.length === 0) return;
    const count = await this.prisma.venueCatalogService.count({
      where: { tenantId, id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new BadRequestException('Um ou mais serviços são inválidos para este tenant.');
    }
  }
}
