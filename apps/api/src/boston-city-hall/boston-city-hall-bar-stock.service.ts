import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_BAR_MOVEMENT_TYPE_DIRECTION,
  BCH_BAR_MOVEMENT_TYPES,
  BCH_BAR_STOCK_ADJUSTMENT_KINDS,
  BCH_BAR_STOCK_DIRECTIONS,
  type BchBarMovementType,
  type BchBarStockBalanceDto,
  type BchBarStockDirection,
  type BchBarStockMovementDto,
} from './boston-city-hall-bar.constants';

function decStr(v: Prisma.Decimal | number): string {
  if (v instanceof Prisma.Decimal) return v.toFixed(4).replace(/\.?0+$/, '') || '0';
  return new Prisma.Decimal(v).toFixed(4).replace(/\.?0+$/, '') || '0';
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

type MovementRow = {
  id: string;
  tenantId: string;
  productId: string;
  locationId: string;
  movementType: string;
  direction: string;
  quantity: Prisma.Decimal;
  unitBasis: string | null;
  eventId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  sourceKey: string | null;
  transferGroupId: string | null;
  reversesMovementId: string | null;
  reason: string | null;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  product?: { sku: string; name: string };
  location?: { code: string; name: string };
  createdBy?: { name: string | null; username: string } | null;
};

@Injectable()
export class BostonCityHallBarStockService {
  constructor(private readonly prisma: PrismaService) {}

  private assertMovementType(type: string): BchBarMovementType {
    if (!BCH_BAR_MOVEMENT_TYPES.includes(type as BchBarMovementType)) {
      throw new BadRequestException('Tipo de movimentação inválido.');
    }
    return type as BchBarMovementType;
  }

  private assertDirection(direction: string): BchBarStockDirection {
    if (!BCH_BAR_STOCK_DIRECTIONS.includes(direction as BchBarStockDirection)) {
      throw new BadRequestException('Direção inválida.');
    }
    return direction as BchBarStockDirection;
  }

  private resolveDirectionForType(
    movementType: BchBarMovementType,
    direction: BchBarStockDirection,
  ): BchBarStockDirection {
    const rule = BCH_BAR_MOVEMENT_TYPE_DIRECTION[movementType];
    if (rule === 'both') return direction;
    if (rule !== direction) {
      throw new BadRequestException(`Tipo ${movementType} exige direção ${rule === 'in' ? 'entrada' : 'saída'}.`);
    }
    return direction;
  }

  private toMovementDto(row: MovementRow): BchBarStockMovementDto {
    return {
      id: row.id,
      productId: row.productId,
      productSku: row.product?.sku ?? '',
      productName: row.product?.name ?? '',
      locationId: row.locationId,
      locationCode: row.location?.code ?? '',
      locationName: row.location?.name ?? '',
      movementType: row.movementType,
      direction: row.direction as BchBarStockDirection,
      quantity: decStr(row.quantity),
      unitBasis: row.unitBasis,
      eventId: row.eventId,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      sourceKey: row.sourceKey,
      transferGroupId: row.transferGroupId,
      reversesMovementId: row.reversesMovementId,
      reason: row.reason,
      notes: row.notes,
      createdByUserId: row.createdByUserId,
      createdByName: row.createdBy?.name ?? row.createdBy?.username ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private movementInclude = {
    product: { select: { sku: true, name: true } },
    location: { select: { code: true, name: true } },
    createdBy: { select: { name: true, username: true } },
  } as const;

  private async validateStockContext(
    tenantId: string,
    productId: string,
    locationId: string,
    eventId?: string | null,
  ): Promise<{ unitBasis: string | null }> {
    const product = await this.prisma.bchBarProduct.findFirst({
      where: { id: productId, tenantId },
      include: { physicalUnit: { select: { unitType: true } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const location = await this.prisma.bchBarInventoryLocation.findFirst({
      where: { id: locationId, tenantId },
    });
    if (!location) throw new NotFoundException('Local não encontrado.');
    if (!location.active) throw new BadRequestException('Local inativo.');

    if (eventId) {
      const event = await this.prisma.event.findFirst({
        where: { id: eventId, tenantId },
        select: { id: true },
      });
      if (!event) throw new NotFoundException('Evento não encontrado para este tenant.');
    }

    return { unitBasis: product.physicalUnit?.unitType ?? null };
  }

  /** Aplica movimentação + saldo na mesma transação (uso interno e testável). */
  async applyMovementInTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string | null,
    input: {
      productId: string;
      locationId: string;
      movementType: BchBarMovementType;
      direction: BchBarStockDirection;
      quantity: Prisma.Decimal;
      unitBasis?: string | null;
      eventId?: string | null;
      referenceType?: string | null;
      referenceId?: string | null;
      sourceKey?: string | null;
      transferGroupId?: string | null;
      reversesMovementId?: string | null;
      reason?: string | null;
      notes?: string | null;
    },
  ): Promise<MovementRow> {
    const signedDelta =
      input.direction === 'in' ? input.quantity : input.quantity.neg();

    const existingBalance = await tx.bchBarStockBalance.findUnique({
      where: {
        productId_locationId: {
          productId: input.productId,
          locationId: input.locationId,
        },
      },
    });
    const current = existingBalance?.quantityOnHand ?? new Prisma.Decimal(0);
    const next = current.plus(signedDelta);
    if (next.lessThan(0)) {
      throw new BadRequestException('Estoque insuficiente para esta saída.');
    }

    const movement = await tx.bchBarStockMovement.create({
      data: {
        tenantId,
        productId: input.productId,
        locationId: input.locationId,
        movementType: input.movementType,
        direction: input.direction,
        quantity: input.quantity,
        unitBasis: input.unitBasis ?? null,
        eventId: input.eventId ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        sourceKey: input.sourceKey ?? null,
        transferGroupId: input.transferGroupId ?? null,
        reversesMovementId: input.reversesMovementId ?? null,
        reason: input.reason?.trim() || null,
        notes: input.notes?.trim() || null,
        createdByUserId: userId,
      },
      include: this.movementInclude,
    });

    await tx.bchBarStockBalance.upsert({
      where: {
        productId_locationId: {
          productId: input.productId,
          locationId: input.locationId,
        },
      },
      create: {
        tenantId,
        productId: input.productId,
        locationId: input.locationId,
        quantityOnHand: next,
      },
      update: { quantityOnHand: next },
    });

    return movement;
  }

  async createManualMovement(
    tenantId: string,
    userId: string | null,
    input: {
      productId: string;
      locationId: string;
      movementType: string;
      direction: string;
      quantity: number | string;
      eventId?: string | null;
      referenceType?: string | null;
      referenceId?: string | null;
      sourceKey?: string | null;
      reason?: string | null;
      notes?: string | null;
    },
  ): Promise<BchBarStockMovementDto> {
    const movementType = this.assertMovementType(input.movementType);
    const direction = this.resolveDirectionForType(
      movementType,
      this.assertDirection(input.direction),
    );
    const quantity = parsePositiveDecimal(input.quantity, 'Quantidade');

    if (input.sourceKey?.trim()) {
      const existing = await this.prisma.bchBarStockMovement.findFirst({
        where: { tenantId, sourceKey: input.sourceKey.trim() },
        include: this.movementInclude,
      });
      if (existing) return this.toMovementDto(existing);
    }

    const { unitBasis } = await this.validateStockContext(
      tenantId,
      input.productId,
      input.locationId,
      input.eventId,
    );

    const row = await this.prisma.$transaction((tx) =>
      this.applyMovementInTransaction(tx, tenantId, userId, {
        productId: input.productId,
        locationId: input.locationId,
        movementType,
        direction,
        quantity,
        unitBasis,
        eventId: input.eventId,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        sourceKey: input.sourceKey?.trim() || null,
        reason: input.reason,
        notes: input.notes,
      }),
    );

    return this.toMovementDto(row);
  }

  async adjustStockToTarget(
    tenantId: string,
    userId: string | null,
    input: {
      productId: string;
      locationId: string;
      targetQuantity: number | string;
      adjustmentKind?: string;
      reason?: string | null;
      notes?: string | null;
    },
  ): Promise<{ balance: BchBarStockBalanceDto; movement: BchBarStockMovementDto | null }> {
    const target = parseNonNegativeDecimal(input.targetQuantity, 'Quantidade alvo');
    const { unitBasis } = await this.validateStockContext(
      tenantId,
      input.productId,
      input.locationId,
    );

    const balanceRow = await this.prisma.bchBarStockBalance.findUnique({
      where: {
        productId_locationId: {
          productId: input.productId,
          locationId: input.locationId,
        },
      },
    });
    const current = balanceRow?.quantityOnHand ?? new Prisma.Decimal(0);
    const delta = target.minus(current);

    if (delta.isZero()) {
      const balances = await this.listStockBalances(tenantId, input.locationId);
      const bal = balances.find(
        (b) => b.productId === input.productId && b.locationId === input.locationId,
      );
      if (bal) return { balance: bal, movement: null };
      return {
        balance: {
          id: balanceRow?.id ?? '',
          productId: input.productId,
          productSku: '',
          productName: '',
          physicalUnitType: unitBasis,
          locationId: input.locationId,
          locationCode: '',
          locationName: '',
          quantityOnHand: decStr(target),
          updatedAt: new Date().toISOString(),
          latestMovementAt: null,
        },
        movement: null,
      };
    }

    const movementCount = await this.prisma.bchBarStockMovement.count({
      where: { tenantId, productId: input.productId, locationId: input.locationId },
    });

    let movementType: BchBarMovementType;
    if (movementCount === 0 && target.greaterThan(0)) {
      movementType = 'initial_balance';
    } else {
      const kind = input.adjustmentKind?.trim() || 'manual_adjustment';
      if (
        !BCH_BAR_STOCK_ADJUSTMENT_KINDS.includes(
          kind as (typeof BCH_BAR_STOCK_ADJUSTMENT_KINDS)[number],
        )
      ) {
        throw new BadRequestException('Tipo de ajuste inválido.');
      }
      movementType =
        movementCount === 0 && kind === 'initial_balance'
          ? 'initial_balance'
          : (kind as BchBarMovementType);
      if (movementType === 'initial_balance' && movementCount > 0) {
        throw new BadRequestException('Saldo inicial só na primeira configuração do local.');
      }
    }

    const direction: BchBarStockDirection = delta.greaterThan(0) ? 'in' : 'out';
    const quantity = delta.abs();

    const row = await this.prisma.$transaction((tx) =>
      this.applyMovementInTransaction(tx, tenantId, userId, {
        productId: input.productId,
        locationId: input.locationId,
        movementType,
        direction,
        quantity,
        unitBasis,
        reason: input.reason ?? (movementType === 'initial_balance' ? 'Saldo inicial' : 'Ajuste de estoque'),
        notes: input.notes,
      }),
    );

    const balances = await this.listStockBalances(tenantId, input.locationId);
    const balance =
      balances.find(
        (b) => b.productId === input.productId && b.locationId === input.locationId,
      ) ?? (await this.listStockBalances(tenantId)).find((b) => b.productId === input.productId)!;

    return { balance, movement: this.toMovementDto(row) };
  }

  async transferStock(
    tenantId: string,
    userId: string | null,
    input: {
      productId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: number | string;
      eventId?: string | null;
      sourceKey?: string | null;
      notes?: string | null;
    },
  ): Promise<{ transferGroupId: string; outMovement: BchBarStockMovementDto; inMovement: BchBarStockMovementDto }> {
    if (input.fromLocationId === input.toLocationId) {
      throw new BadRequestException('Origem e destino devem ser diferentes.');
    }
    const quantity = parsePositiveDecimal(input.quantity, 'Quantidade');

    const baseKey = input.sourceKey?.trim();
    if (baseKey) {
      const existingOut = await this.prisma.bchBarStockMovement.findFirst({
        where: { tenantId, sourceKey: `${baseKey}:out` },
        include: this.movementInclude,
      });
      const existingIn = await this.prisma.bchBarStockMovement.findFirst({
        where: { tenantId, sourceKey: `${baseKey}:in` },
        include: this.movementInclude,
      });
      if (existingOut && existingIn) {
        return {
          transferGroupId: existingOut.transferGroupId ?? '',
          outMovement: this.toMovementDto(existingOut),
          inMovement: this.toMovementDto(existingIn),
        };
      }
    }

    const { unitBasis } = await this.validateStockContext(
      tenantId,
      input.productId,
      input.fromLocationId,
      input.eventId,
    );
    await this.validateStockContext(tenantId, input.productId, input.toLocationId, input.eventId);

    const transferGroupId = randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
      const outRow = await this.applyMovementInTransaction(tx, tenantId, userId, {
        productId: input.productId,
        locationId: input.fromLocationId,
        movementType: 'transfer_out',
        direction: 'out',
        quantity,
        unitBasis,
        eventId: input.eventId,
        transferGroupId,
        sourceKey: baseKey ? `${baseKey}:out` : null,
        notes: input.notes,
      });
      const inRow = await this.applyMovementInTransaction(tx, tenantId, userId, {
        productId: input.productId,
        locationId: input.toLocationId,
        movementType: 'transfer_in',
        direction: 'in',
        quantity,
        unitBasis,
        eventId: input.eventId,
        transferGroupId,
        sourceKey: baseKey ? `${baseKey}:in` : null,
        notes: input.notes,
      });
      return { outRow, inRow };
    });

    return {
      transferGroupId,
      outMovement: this.toMovementDto(result.outRow),
      inMovement: this.toMovementDto(result.inRow),
    };
  }

  async reverseMovement(
    tenantId: string,
    userId: string | null,
    movementId: string,
    notes?: string | null,
  ): Promise<BchBarStockMovementDto> {
    const original = await this.prisma.bchBarStockMovement.findFirst({
      where: { id: movementId, tenantId },
    });
    if (!original) throw new NotFoundException('Movimentação não encontrada.');

    const alreadyReversed = await this.prisma.bchBarStockMovement.findFirst({
      where: { tenantId, reversesMovementId: movementId },
    });
    if (alreadyReversed) {
      throw new BadRequestException('Esta movimentação já foi estornada.');
    }

    const oppositeDirection: BchBarStockDirection =
      original.direction === 'in' ? 'out' : 'in';

    const row = await this.prisma.$transaction((tx) =>
      this.applyMovementInTransaction(tx, tenantId, userId, {
        productId: original.productId,
        locationId: original.locationId,
        movementType: 'manual_adjustment',
        direction: oppositeDirection,
        quantity: original.quantity,
        unitBasis: original.unitBasis,
        eventId: original.eventId,
        referenceType: 'reversal',
        referenceId: original.id,
        reversesMovementId: original.id,
        reason: 'Estorno de movimentação',
        notes: notes?.trim() || original.notes,
      }),
    );

    return this.toMovementDto(row);
  }

  async listMovements(
    tenantId: string,
    filters: {
      productId?: string;
      locationId?: string;
      movementType?: string;
      eventId?: string;
      from?: string;
      to?: string;
      limit?: number;
    },
  ): Promise<BchBarStockMovementDto[]> {
    const where: Prisma.BchBarStockMovementWhereInput = {
      tenantId,
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.movementType ? { movementType: filters.movementType } : {}),
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
    };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);

    const rows = await this.prisma.bchBarStockMovement.findMany({
      where,
      include: this.movementInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((r) => this.toMovementDto(r));
  }

  async listStockBalances(tenantId: string, locationId?: string): Promise<BchBarStockBalanceDto[]> {
    const rows = await this.prisma.bchBarStockBalance.findMany({
      where: { tenantId, ...(locationId ? { locationId } : {}) },
      include: {
        product: {
          select: {
            sku: true,
            name: true,
            physicalUnit: { select: { unitType: true } },
          },
        },
        location: { select: { code: true, name: true } },
      },
      orderBy: [{ locationId: 'asc' }, { product: { name: 'asc' } }],
    });

    const latestRows = await this.prisma.bchBarStockMovement.groupBy({
      by: ['productId', 'locationId'],
      where: { tenantId, ...(locationId ? { locationId } : {}) },
      _max: { createdAt: true },
    });
    const latestMap = new Map(
      latestRows.map((r) => [`${r.productId}:${r.locationId}`, r._max.createdAt]),
    );

    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productSku: r.product.sku,
      productName: r.product.name,
      physicalUnitType: r.product.physicalUnit?.unitType ?? null,
      locationId: r.locationId,
      locationCode: r.location.code,
      locationName: r.location.name,
      quantityOnHand: decStr(r.quantityOnHand),
      updatedAt: r.updatedAt.toISOString(),
      latestMovementAt:
        latestMap.get(`${r.productId}:${r.locationId}`)?.toISOString() ?? null,
    }));
  }
}
