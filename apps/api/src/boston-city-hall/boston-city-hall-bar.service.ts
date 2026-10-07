import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import {
  BCH_BAR_CENTRAL_LOCATION_CODE,
  BCH_BAR_LOCATION_KINDS,
  BCH_BAR_PHYSICAL_UNIT_TYPES,
  BCH_BAR_PRODUCT_CATEGORIES,
  type BchBarInventoryLocationDto,
  type BchBarPhysicalUnitDto,
  type BchBarProductDto,
  type BchBarSellingUnitDto,
  type BchBarSellingUnitPriceDto,
} from './boston-city-hall-bar.constants';

function decStr(v: Prisma.Decimal | number): string {
  if (v instanceof Prisma.Decimal) return v.toFixed(4).replace(/\.?0+$/, '') || '0';
  return new Prisma.Decimal(v).toFixed(4).replace(/\.?0+$/, '') || '0';
}

function moneyStr(v: Prisma.Decimal | number): string {
  if (v instanceof Prisma.Decimal) return v.toFixed(2);
  return new Prisma.Decimal(v).toFixed(2);
}

function parsePositiveDecimal(value: number | string, field: string): Prisma.Decimal {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException(`${field} inválido.`);
  return new Prisma.Decimal(n);
}

function parseNonNegativeDecimal(value: number | string, field: string): Prisma.Decimal {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${field} inválido.`);
  return new Prisma.Decimal(n);
}

@Injectable()
export class BostonCityHallBarService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveBchTenantId(): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: BCH_VENUE_SLUG },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Boston City Hall não encontrado.');
    return tenant.id;
  }

  private assertTenantRow(tenantId: string, rowTenantId: string): void {
    if (tenantId !== rowTenantId) throw new ForbiddenException('Acesso negado.');
  }

  async ensureCentralLocation(tenantId: string): Promise<BchBarInventoryLocationDto> {
    const existing = await this.prisma.bchBarInventoryLocation.findFirst({
      where: { tenantId, code: BCH_BAR_CENTRAL_LOCATION_CODE },
    });
    if (existing) return this.toLocationDto(existing);
    const created = await this.prisma.bchBarInventoryLocation.create({
      data: {
        tenantId,
        code: BCH_BAR_CENTRAL_LOCATION_CODE,
        name: 'Estoque central',
        kind: 'central',
        sortOrder: 0,
      },
    });
    return this.toLocationDto(created);
  }

  private toPhysicalUnitDto(row: {
    id: string;
    unitType: string;
    label: string | null;
    volumeMl: number | null;
    quantityBasis: Prisma.Decimal;
  }): BchBarPhysicalUnitDto {
    return {
      id: row.id,
      unitType: row.unitType,
      label: row.label,
      volumeMl: row.volumeMl,
      quantityBasis: decStr(row.quantityBasis),
    };
  }

  private toProductDto(
    row: {
      id: string;
      sku: string;
      name: string;
      category: string;
      description: string | null;
      imageUrl: string | null;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
      physicalUnit?: {
        id: string;
        unitType: string;
        label: string | null;
        volumeMl: number | null;
        quantityBasis: Prisma.Decimal;
      } | null;
    },
  ): BchBarProductDto {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      description: row.description,
      imageUrl: row.imageUrl,
      active: row.active,
      physicalUnit: row.physicalUnit ? this.toPhysicalUnitDto(row.physicalUnit) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toLocationDto(row: {
    id: string;
    code: string;
    name: string;
    kind: string;
    eventId: string | null;
    active: boolean;
    sortOrder: number;
  }): BchBarInventoryLocationDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      kind: row.kind,
      eventId: row.eventId,
      active: row.active,
      sortOrder: row.sortOrder,
    };
  }

  async listProducts(tenantId: string): Promise<BchBarProductDto[]> {
    const rows = await this.prisma.bchBarProduct.findMany({
      where: { tenantId },
      include: { physicalUnit: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.toProductDto(r));
  }

  async getProduct(tenantId: string, id: string): Promise<BchBarProductDto> {
    const row = await this.prisma.bchBarProduct.findFirst({
      where: { id, tenantId },
      include: { physicalUnit: true },
    });
    if (!row) throw new NotFoundException('Produto não encontrado.');
    return this.toProductDto(row);
  }

  async createProduct(
    tenantId: string,
    input: {
      sku: string;
      name: string;
      category: string;
      description?: string;
      imageUrl?: string;
      active?: boolean;
      physicalUnit: {
        unitType: string;
        label?: string;
        volumeMl?: number;
        quantityBasis?: number | string;
      };
    },
  ): Promise<BchBarProductDto> {
    const sku = input.sku.trim();
    const name = input.name.trim();
    if (!sku || !name) throw new BadRequestException('SKU e nome são obrigatórios.');
    if (!BCH_BAR_PRODUCT_CATEGORIES.includes(input.category as (typeof BCH_BAR_PRODUCT_CATEGORIES)[number])) {
      throw new BadRequestException('Categoria inválida.');
    }
    if (!BCH_BAR_PHYSICAL_UNIT_TYPES.includes(input.physicalUnit.unitType as (typeof BCH_BAR_PHYSICAL_UNIT_TYPES)[number])) {
      throw new BadRequestException('Tipo de unidade física inválido.');
    }
    const qtyBasis = input.physicalUnit.quantityBasis != null
      ? parsePositiveDecimal(input.physicalUnit.quantityBasis, 'Base da unidade física')
      : new Prisma.Decimal(1);

    const created = await this.prisma.$transaction(async (tx) => {
      const product = await tx.bchBarProduct.create({
        data: {
          tenantId,
          sku,
          name,
          category: input.category,
          description: input.description?.trim() || null,
          imageUrl: input.imageUrl?.trim() || null,
          active: input.active ?? true,
        },
      });
      await tx.bchBarProductPhysicalUnit.create({
        data: {
          tenantId,
          productId: product.id,
          unitType: input.physicalUnit.unitType,
          label: input.physicalUnit.label?.trim() || null,
          volumeMl: input.physicalUnit.volumeMl ?? null,
          quantityBasis: qtyBasis,
        },
      });
      return tx.bchBarProduct.findFirst({
        where: { id: product.id },
        include: { physicalUnit: true },
      });
    });
    if (!created) throw new NotFoundException('Produto não criado.');
    return this.toProductDto(created);
  }

  async updateProduct(
    tenantId: string,
    id: string,
    input: Partial<{
      sku: string;
      name: string;
      category: string;
      description: string | null;
      imageUrl: string | null;
      active: boolean;
      physicalUnit: {
        unitType: string;
        label?: string | null;
        volumeMl?: number | null;
        quantityBasis?: number | string;
      };
    }>,
  ): Promise<BchBarProductDto> {
    const existing = await this.prisma.bchBarProduct.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Produto não encontrado.');

    if (input.category && !BCH_BAR_PRODUCT_CATEGORIES.includes(input.category as (typeof BCH_BAR_PRODUCT_CATEGORIES)[number])) {
      throw new BadRequestException('Categoria inválida.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bchBarProduct.update({
        where: { id },
        data: {
          ...(input.sku != null ? { sku: input.sku.trim() } : {}),
          ...(input.name != null ? { name: input.name.trim() } : {}),
          ...(input.category != null ? { category: input.category } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      if (input.physicalUnit) {
        if (
          !BCH_BAR_PHYSICAL_UNIT_TYPES.includes(
            input.physicalUnit.unitType as (typeof BCH_BAR_PHYSICAL_UNIT_TYPES)[number],
          )
        ) {
          throw new BadRequestException('Tipo de unidade física inválido.');
        }
        const qtyBasis =
          input.physicalUnit.quantityBasis != null
            ? parsePositiveDecimal(input.physicalUnit.quantityBasis, 'Base da unidade física')
            : undefined;
        await tx.bchBarProductPhysicalUnit.upsert({
          where: { productId: id },
          create: {
            tenantId,
            productId: id,
            unitType: input.physicalUnit.unitType,
            label: input.physicalUnit.label?.trim() || null,
            volumeMl: input.physicalUnit.volumeMl ?? null,
            quantityBasis: qtyBasis ?? new Prisma.Decimal(1),
          },
          update: {
            unitType: input.physicalUnit.unitType,
            label: input.physicalUnit.label?.trim() || null,
            volumeMl: input.physicalUnit.volumeMl ?? null,
            ...(qtyBasis ? { quantityBasis: qtyBasis } : {}),
          },
        });
      }
    });

    return this.getProduct(tenantId, id);
  }

  private async assertProductActiveForCatalog(tenantId: string, productId: string): Promise<void> {
    const product = await this.prisma.bchBarProduct.findFirst({
      where: { id: productId, tenantId },
      select: { active: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (!product.active) {
      throw new BadRequestException('Produto inativo não pode receber nova configuração de catálogo.');
    }
  }

  async listSellingUnits(tenantId: string, productId?: string): Promise<BchBarSellingUnitDto[]> {
    const rows = await this.prisma.bchBarSellingUnit.findMany({
      where: { tenantId, ...(productId ? { productId } : {}) },
      include: { product: { select: { name: true, active: true } } },
      orderBy: [{ productId: 'asc' }, { sortOrder: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      productActive: r.product.active,
      name: r.name,
      active: r.active,
      sortOrder: r.sortOrder,
      portionAmount: r.portionAmount != null ? decStr(r.portionAmount) : null,
      portionUnit: r.portionUnit,
      physicalUnitsConsumedPerSale: decStr(r.physicalUnitsConsumedPerSale),
      expectedPortionsPerPhysical:
        r.expectedPortionsPerPhysical != null ? decStr(r.expectedPortionsPerPhysical) : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async createSellingUnit(
    tenantId: string,
    productId: string,
    input: {
      name: string;
      active?: boolean;
      sortOrder?: number;
      portionAmount?: number | string | null;
      portionUnit?: string | null;
      physicalUnitsConsumedPerSale: number | string;
      expectedPortionsPerPhysical?: number | string | null;
    },
  ): Promise<BchBarSellingUnitDto> {
    await this.assertProductActiveForCatalog(tenantId, productId);
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Nome da unidade de venda é obrigatório.');

    const consumed = parsePositiveDecimal(
      input.physicalUnitsConsumedPerSale,
      'Consumo de unidade física por venda',
    );
    if (consumed.greaterThan(1)) {
      throw new BadRequestException('Consumo por venda não pode exceder 1 unidade física.');
    }

    let expected: Prisma.Decimal | null = null;
    if (input.expectedPortionsPerPhysical != null && input.expectedPortionsPerPhysical !== '') {
      expected = parsePositiveDecimal(input.expectedPortionsPerPhysical, 'Rendimento esperado');
    } else if (consumed.lessThan(1)) {
      expected = new Prisma.Decimal(1).div(consumed);
    }

    const row = await this.prisma.bchBarSellingUnit.create({
      data: {
        tenantId,
        productId,
        name,
        active: input.active ?? true,
        sortOrder: input.sortOrder ?? 0,
        portionAmount:
          input.portionAmount != null && input.portionAmount !== ''
            ? parsePositiveDecimal(input.portionAmount, 'Porção')
            : null,
        portionUnit: input.portionUnit?.trim() || null,
        physicalUnitsConsumedPerSale: consumed,
        expectedPortionsPerPhysical: expected,
      },
      include: { product: { select: { name: true, active: true } } },
    });

    return {
      id: row.id,
      productId: row.productId,
      productName: row.product.name,
      productActive: row.product.active,
      name: row.name,
      active: row.active,
      sortOrder: row.sortOrder,
      portionAmount: row.portionAmount != null ? decStr(row.portionAmount) : null,
      portionUnit: row.portionUnit,
      physicalUnitsConsumedPerSale: decStr(row.physicalUnitsConsumedPerSale),
      expectedPortionsPerPhysical:
        row.expectedPortionsPerPhysical != null ? decStr(row.expectedPortionsPerPhysical) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateSellingUnit(
    tenantId: string,
    id: string,
    input: Partial<{
      name: string;
      active: boolean;
      sortOrder: number;
      portionAmount: number | string | null;
      portionUnit: string | null;
      physicalUnitsConsumedPerSale: number | string;
      expectedPortionsPerPhysical: number | string | null;
    }>,
  ): Promise<BchBarSellingUnitDto> {
    const existing = await this.prisma.bchBarSellingUnit.findFirst({
      where: { id, tenantId },
      include: { product: true },
    });
    if (!existing) throw new NotFoundException('Unidade de venda não encontrada.');

    if (input.active === true && !existing.product.active) {
      throw new BadRequestException('Não é possível ativar unidade de venda de produto inativo.');
    }

    const consumed =
      input.physicalUnitsConsumedPerSale != null
        ? parsePositiveDecimal(input.physicalUnitsConsumedPerSale, 'Consumo por venda')
        : undefined;

    const row = await this.prisma.bchBarSellingUnit.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name.trim() } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.portionUnit !== undefined ? { portionUnit: input.portionUnit?.trim() || null } : {}),
        ...(input.portionAmount !== undefined
          ? {
              portionAmount:
                input.portionAmount != null && input.portionAmount !== ''
                  ? parsePositiveDecimal(input.portionAmount, 'Porção')
                  : null,
            }
          : {}),
        ...(consumed ? { physicalUnitsConsumedPerSale: consumed } : {}),
        ...(input.expectedPortionsPerPhysical !== undefined
          ? {
              expectedPortionsPerPhysical:
                input.expectedPortionsPerPhysical != null && input.expectedPortionsPerPhysical !== ''
                  ? parsePositiveDecimal(input.expectedPortionsPerPhysical, 'Rendimento')
                  : null,
            }
          : {}),
      },
      include: { product: { select: { name: true, active: true } } },
    });

    return {
      id: row.id,
      productId: row.productId,
      productName: row.product.name,
      productActive: row.product.active,
      name: row.name,
      active: row.active,
      sortOrder: row.sortOrder,
      portionAmount: row.portionAmount != null ? decStr(row.portionAmount) : null,
      portionUnit: row.portionUnit,
      physicalUnitsConsumedPerSale: decStr(row.physicalUnitsConsumedPerSale),
      expectedPortionsPerPhysical:
        row.expectedPortionsPerPhysical != null ? decStr(row.expectedPortionsPerPhysical) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listPrices(tenantId: string, sellingUnitId?: string): Promise<BchBarSellingUnitPriceDto[]> {
    const rows = await this.prisma.bchBarSellingUnitPrice.findMany({
      where: { tenantId, ...(sellingUnitId ? { sellingUnitId } : {}) },
      include: { sellingUnit: { select: { name: true, active: true, product: { select: { active: true } } } } },
      orderBy: [{ sellingUnitId: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      sellingUnitId: r.sellingUnitId,
      sellingUnitName: r.sellingUnit.name,
      price: moneyStr(r.price),
      currency: r.currency,
      active: r.active,
      validFrom: r.validFrom?.toISOString() ?? null,
      validTo: r.validTo?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async createPrice(
    tenantId: string,
    sellingUnitId: string,
    input: {
      price: number | string;
      currency: string;
      active?: boolean;
      validFrom?: string | null;
      validTo?: string | null;
    },
  ): Promise<BchBarSellingUnitPriceDto> {
    const unit = await this.prisma.bchBarSellingUnit.findFirst({
      where: { id: sellingUnitId, tenantId },
      include: { product: { select: { active: true } } },
    });
    if (!unit) throw new NotFoundException('Unidade de venda não encontrada.');
    if (!unit.product.active || !unit.active) {
      throw new BadRequestException('Preço só pode ser cadastrado para unidade de venda ativa de produto ativo.');
    }

    const currency = input.currency.trim().toUpperCase();
    if (currency.length !== 3) throw new BadRequestException('Moeda ISO inválida.');

    const row = await this.prisma.bchBarSellingUnitPrice.create({
      data: {
        tenantId,
        sellingUnitId,
        price: parseNonNegativeDecimal(input.price, 'Preço'),
        currency,
        active: input.active ?? true,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validTo: input.validTo ? new Date(input.validTo) : null,
      },
      include: { sellingUnit: { select: { name: true } } },
    });

    return {
      id: row.id,
      sellingUnitId: row.sellingUnitId,
      sellingUnitName: row.sellingUnit.name,
      price: moneyStr(row.price),
      currency: row.currency,
      active: row.active,
      validFrom: row.validFrom?.toISOString() ?? null,
      validTo: row.validTo?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updatePrice(
    tenantId: string,
    id: string,
    input: Partial<{
      price: number | string;
      currency: string;
      active: boolean;
      validFrom: string | null;
      validTo: string | null;
    }>,
  ): Promise<BchBarSellingUnitPriceDto> {
    const existing = await this.prisma.bchBarSellingUnitPrice.findFirst({
      where: { id, tenantId },
      include: { sellingUnit: { include: { product: true } } },
    });
    if (!existing) throw new NotFoundException('Preço não encontrado.');

    if (input.active === true && (!existing.sellingUnit.active || !existing.sellingUnit.product.active)) {
      throw new BadRequestException('Não é possível ativar preço de unidade/produto inativo.');
    }

    const row = await this.prisma.bchBarSellingUnitPrice.update({
      where: { id },
      data: {
        ...(input.price != null ? { price: parseNonNegativeDecimal(input.price, 'Preço') } : {}),
        ...(input.currency != null ? { currency: input.currency.trim().toUpperCase() } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.validFrom !== undefined ? { validFrom: input.validFrom ? new Date(input.validFrom) : null } : {}),
        ...(input.validTo !== undefined ? { validTo: input.validTo ? new Date(input.validTo) : null } : {}),
      },
      include: { sellingUnit: { select: { name: true } } },
    });

    return {
      id: row.id,
      sellingUnitId: row.sellingUnitId,
      sellingUnitName: row.sellingUnit.name,
      price: moneyStr(row.price),
      currency: row.currency,
      active: row.active,
      validFrom: row.validFrom?.toISOString() ?? null,
      validTo: row.validTo?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listLocations(tenantId: string): Promise<BchBarInventoryLocationDto[]> {
    await this.ensureCentralLocation(tenantId);
    const rows = await this.prisma.bchBarInventoryLocation.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.toLocationDto(r));
  }

  /** Catálogo ativo para futuro POS — produto, unidade de venda e preço ativos. */
  getActiveCatalogConfiguration(
    tenantId: string,
    sellingUnitId: string,
  ): Promise<{ ok: boolean }> {
    return this.prisma.bchBarSellingUnit
      .findFirst({
        where: {
          id: sellingUnitId,
          tenantId,
          active: true,
          product: { active: true },
          prices: { some: { active: true } },
        },
      })
      .then((r) => ({ ok: Boolean(r) }));
  }
}
