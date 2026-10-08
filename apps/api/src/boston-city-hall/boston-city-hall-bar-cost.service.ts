import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  getOriginalContentForPhysicalUnit,
  getPortionContentAmount,
  isWholePhysicalUnitSale,
} from './boston-city-hall-bar-portion.util';

export type BchBarProductCostDto = {
  id: string;
  productId: string;
  physicalUnitId: string | null;
  amount: string;
  currency: string;
  validFrom: string;
  validTo: string | null;
  notes: string | null;
};

function decStr(v: Prisma.Decimal): string {
  return v.toFixed(4).replace(/\.?0+$/, '') || '0';
}

function parseCostAmount(value: number | string): Prisma.Decimal {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw new BadRequestException('Custo inválido.');
  return new Prisma.Decimal(n);
}

@Injectable()
export class BostonCityHallBarCostService {
  constructor(private readonly prisma: PrismaService) {}

  /** Custo vigente: maior validFrom entre registros válidos na data (sem ambiguidade). */
  async resolveProductCost(
    tenantId: string,
    productId: string,
    at: Date,
  ): Promise<{ id: string; amount: Prisma.Decimal; currency: string } | null> {
    const rows = await this.prisma.bchBarProductCost.findMany({
      where: {
        tenantId,
        productId,
        validFrom: { lte: at },
        OR: [{ validTo: null }, { validTo: { gte: at } }],
      },
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
      take: 1,
    });
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, amount: row.amount, currency: row.currency };
  }

  async computeExpectedUnitCost(
    tenantId: string,
    productId: string,
    sellingUnitId: string,
    at: Date,
  ): Promise<{ unitCost: Prisma.Decimal; currency: string } | null> {
    const cost = await this.resolveProductCost(tenantId, productId, at);
    if (!cost) return null;

    const sellingUnit = await this.prisma.bchBarSellingUnit.findFirst({
      where: { id: sellingUnitId, tenantId, productId },
    });
    if (!sellingUnit) throw new NotFoundException('Unidade de venda não encontrada.');

    const product = await this.prisma.bchBarProduct.findFirst({
      where: { id: productId, tenantId },
      include: { physicalUnit: true },
    });
    if (!product?.physicalUnit) return null;

    const physical = product.physicalUnit;
    const physicalLike = {
      volumeMl: physical.volumeMl,
      quantityBasis: physical.quantityBasis,
    };
    const sellingLike = {
      portionAmount: sellingUnit.portionAmount,
      portionUnit: sellingUnit.portionUnit,
      physicalUnitsConsumedPerSale: sellingUnit.physicalUnitsConsumedPerSale,
      expectedPortionsPerPhysical: sellingUnit.expectedPortionsPerPhysical,
    };

    let unitCost: Prisma.Decimal;
    if (isWholePhysicalUnitSale(sellingLike)) {
      unitCost = cost.amount.mul(sellingUnit.physicalUnitsConsumedPerSale);
    } else if (sellingUnit.expectedPortionsPerPhysical?.gt(0)) {
      unitCost = cost.amount.div(sellingUnit.expectedPortionsPerPhysical);
    } else {
      const orig = getOriginalContentForPhysicalUnit(physicalLike);
      const portion = getPortionContentAmount(sellingLike, physicalLike);
      if (orig.amount.lte(0)) return null;
      unitCost = cost.amount.mul(portion).div(orig.amount);
    }

    return { unitCost, currency: cost.currency };
  }

  async computeLineCostSnapshot(
    tenantId: string,
    productId: string,
    sellingUnitId: string,
    quantity: Prisma.Decimal,
    at: Date,
  ): Promise<{ unitCostSnapshot: Prisma.Decimal; lineCostSnapshot: Prisma.Decimal } | null> {
    const unit = await this.computeExpectedUnitCost(tenantId, productId, sellingUnitId, at);
    if (!unit) return null;
    return {
      unitCostSnapshot: unit.unitCost,
      lineCostSnapshot: unit.unitCost.mul(quantity),
    };
  }

  async listProductCosts(tenantId: string, productId: string): Promise<BchBarProductCostDto[]> {
    const product = await this.prisma.bchBarProduct.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    const rows = await this.prisma.bchBarProductCost.findMany({
      where: { tenantId, productId },
      orderBy: { validFrom: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      physicalUnitId: r.physicalUnitId,
      amount: decStr(r.amount),
      currency: r.currency,
      validFrom: r.validFrom.toISOString(),
      validTo: r.validTo?.toISOString() ?? null,
      notes: r.notes,
    }));
  }

  async createProductCost(
    tenantId: string,
    productId: string,
    input: {
      amount: number | string;
      currency?: string;
      validFrom?: string | null;
      validTo?: string | null;
      notes?: string | null;
    },
  ): Promise<BchBarProductCostDto> {
    const product = await this.prisma.bchBarProduct.findFirst({
      where: { id: productId, tenantId },
      include: { physicalUnit: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const row = await this.prisma.bchBarProductCost.create({
      data: {
        tenantId,
        productId,
        physicalUnitId: product.physicalUnit?.id ?? null,
        amount: parseCostAmount(input.amount),
        currency: input.currency?.trim() || 'BRL',
        validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
        validTo: input.validTo ? new Date(input.validTo) : null,
        notes: input.notes?.trim() || null,
      },
    });
    return {
      id: row.id,
      productId: row.productId,
      physicalUnitId: row.physicalUnitId,
      amount: decStr(row.amount),
      currency: row.currency,
      validFrom: row.validFrom.toISOString(),
      validTo: row.validTo?.toISOString() ?? null,
      notes: row.notes,
    };
  }
}
