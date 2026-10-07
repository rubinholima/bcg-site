import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarStockService } from './boston-city-hall-bar-stock.service';
import {
  BCH_BAR_CONTAINER_CONSUMPTION_TYPES,
  type BchBarOpenContainerDto,
  type BchBarMovementType,
  type BchBarOpenContainerLedgerDto,
  type BchBarSellingUnitAvailabilityDto,
} from './boston-city-hall-bar.constants';
import {
  BCH_BAR_CONTENT_EMPTY_TOLERANCE,
  expectedPortionsFromRemaining,
  getOriginalContentForPhysicalUnit,
  getPortionContentAmount,
  isWholePhysicalUnitSale,
} from './boston-city-hall-bar-portion.util';

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

const OPEN_CONTAINER_STOCK_REF = 'open_container';

@Injectable()
export class BostonCityHallBarOpenContainerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: BostonCityHallBarStockService,
  ) {}

  private assertConsumptionType(type: string): string {
    if (
      !BCH_BAR_CONTAINER_CONSUMPTION_TYPES.includes(
        type as (typeof BCH_BAR_CONTAINER_CONSUMPTION_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Tipo de consumo inválido.');
    }
    return type;
  }

  private toContainerDto(
    row: {
      id: string;
      productId: string;
      locationId: string;
      status: string;
      contentUnit: string;
      originalContent: Prisma.Decimal;
      remainingContent: Prisma.Decimal;
      openedAt: Date;
      closedAt: Date | null;
      eventId: string | null;
      notes: string | null;
      openedByUserId: string | null;
      product?: { sku: string; name: string };
      location?: { code: string; name: string };
      openedBy?: { name: string | null; username: string } | null;
    },
    portionForDisplay?: Prisma.Decimal | null,
  ): BchBarOpenContainerDto {
    const expectedRemaining =
      portionForDisplay && portionForDisplay.gt(0)
        ? decStr(expectedPortionsFromRemaining(row.remainingContent, portionForDisplay))
        : null;
    return {
      id: row.id,
      productId: row.productId,
      productSku: row.product?.sku ?? '',
      productName: row.product?.name ?? '',
      locationId: row.locationId,
      locationCode: row.location?.code ?? '',
      locationName: row.location?.name ?? '',
      status: row.status,
      contentUnit: row.contentUnit,
      originalContent: decStr(row.originalContent),
      remainingContent: decStr(row.remainingContent),
      expectedPortionsRemaining: expectedRemaining,
      openedAt: row.openedAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
      eventId: row.eventId,
      notes: row.notes,
      openedByUserId: row.openedByUserId,
      openedByName: row.openedBy?.name ?? row.openedBy?.username ?? null,
    };
  }

  private containerInclude = {
    product: { select: { sku: true, name: true } },
    location: { select: { code: true, name: true } },
    openedBy: { select: { name: true, username: true } },
  } as const;

  private ledgerInclude = {
    sellingUnit: { select: { name: true } },
    createdBy: { select: { name: true, username: true } },
  } as const;

  private toLedgerDto(row: {
    id: string;
    openContainerId: string;
    recordType: string;
    consumptionType: string | null;
    quantity: Prisma.Decimal;
    contentDelta: Prisma.Decimal | null;
    remainingAfter: Prisma.Decimal;
    reason: string | null;
    notes: string | null;
    sourceKey: string | null;
    createdAt: Date;
    sellingUnit?: { name: string } | null;
    createdBy?: { name: string | null; username: string } | null;
  }): BchBarOpenContainerLedgerDto {
    return {
      id: row.id,
      openContainerId: row.openContainerId,
      recordType: row.recordType,
      consumptionType: row.consumptionType,
      quantity: decStr(row.quantity),
      contentDelta: row.contentDelta != null ? decStr(row.contentDelta) : null,
      remainingAfter: decStr(row.remainingAfter),
      sellingUnitName: row.sellingUnit?.name ?? null,
      reason: row.reason,
      notes: row.notes,
      sourceKey: row.sourceKey,
      createdByName: row.createdBy?.name ?? row.createdBy?.username ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async loadProductPhysical(tenantId: string, productId: string) {
    const product = await this.prisma.bchBarProduct.findFirst({
      where: { id: productId, tenantId },
      include: { physicalUnit: true },
    });
    if (!product?.physicalUnit) throw new NotFoundException('Produto ou unidade física não encontrado.');
    return { product, physical: product.physicalUnit };
  }

  private async finalizeContainerStatus(
    tx: Prisma.TransactionClient,
    containerId: string,
    remaining: Prisma.Decimal,
    closedByUserId: string | null,
    newStatus?: 'empty' | 'discarded',
  ): Promise<void> {
    if (remaining.lte(BCH_BAR_CONTENT_EMPTY_TOLERANCE)) {
      await tx.bchBarOpenContainer.update({
        where: { id: containerId },
        data: {
          remainingContent: new Prisma.Decimal(0),
          status: newStatus ?? 'empty',
          closedAt: new Date(),
          closedByUserId,
        },
      });
    }
  }

  private async appendLedgerAndReduce(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      container: {
        id: string;
        productId: string;
        locationId: string;
        remainingContent: Prisma.Decimal;
      };
      userId: string | null;
      quantity: Prisma.Decimal;
      recordType: string;
      consumptionType?: string | null;
      sellingUnitId?: string | null;
      eventId?: string | null;
      sourceKey?: string | null;
      reason?: string | null;
      notes?: string | null;
      contentDelta?: Prisma.Decimal | null;
      emptyStatus?: 'empty' | 'discarded';
    },
  ): Promise<{ remaining: Prisma.Decimal; ledgerId: string }> {
    if (input.quantity.gt(input.container.remainingContent)) {
      throw new BadRequestException('Conteúdo insuficiente na garrafa aberta.');
    }
    const remaining = input.container.remainingContent.minus(input.quantity);
    await tx.bchBarOpenContainer.update({
      where: { id: input.container.id },
      data: { remainingContent: remaining },
    });
    const ledger = await tx.bchBarOpenContainerLedger.create({
      data: {
        tenantId: input.tenantId,
        openContainerId: input.container.id,
        productId: input.container.productId,
        locationId: input.container.locationId,
        sellingUnitId: input.sellingUnitId ?? null,
        recordType: input.recordType,
        consumptionType: input.consumptionType ?? null,
        quantity: input.quantity,
        contentDelta: input.contentDelta ?? null,
        remainingAfter: remaining,
        eventId: input.eventId ?? null,
        sourceKey: input.sourceKey ?? null,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        createdByUserId: input.userId,
      },
    });
    await this.finalizeContainerStatus(
      tx,
      input.container.id,
      remaining,
      input.userId,
      input.emptyStatus,
    );
    return { remaining, ledgerId: ledger.id };
  }

  async openContainer(
    tenantId: string,
    userId: string | null,
    input: {
      productId: string;
      locationId: string;
      eventId?: string | null;
      notes?: string | null;
    },
  ): Promise<BchBarOpenContainerDto> {
    const { product, physical } = await this.loadProductPhysical(tenantId, input.productId);
    const location = await this.prisma.bchBarInventoryLocation.findFirst({
      where: { id: input.locationId, tenantId },
    });
    if (!location?.active) throw new NotFoundException('Local não encontrado ou inativo.');

    const { amount, unit } = getOriginalContentForPhysicalUnit(physical);

    const container = await this.prisma.$transaction(async (tx) => {
      const movement = await this.stock.applyMovementInTransaction(tx, tenantId, userId, {
        productId: input.productId,
        locationId: input.locationId,
        movementType: 'internal_use',
        direction: 'out',
        quantity: new Prisma.Decimal(1),
        unitBasis: physical.unitType,
        eventId: input.eventId,
        referenceType: OPEN_CONTAINER_STOCK_REF,
        reason: 'Abertura de unidade para consumo por porção',
        notes: input.notes,
      });

      return tx.bchBarOpenContainer.create({
        data: {
          tenantId,
          productId: input.productId,
          locationId: input.locationId,
          physicalUnitId: physical.id,
          eventId: input.eventId ?? null,
          status: 'open',
          contentUnit: unit,
          originalContent: amount,
          remainingContent: amount,
          openedByUserId: userId,
          openStockMovementId: movement.id,
          notes: input.notes?.trim() || null,
        },
        include: this.containerInclude,
      });
    });

    return this.toContainerDto(container, null);
  }

  async listOpenContainers(
    tenantId: string,
    filters?: { productId?: string; locationId?: string; status?: string },
  ): Promise<BchBarOpenContainerDto[]> {
    const rows = await this.prisma.bchBarOpenContainer.findMany({
      where: {
        tenantId,
        ...(filters?.productId ? { productId: filters.productId } : {}),
        ...(filters?.locationId ? { locationId: filters.locationId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: this.containerInclude,
      orderBy: [{ locationId: 'asc' }, { openedAt: 'asc' }],
    });
    return rows.map((r) => this.toContainerDto(r, null));
  }

  async listContainerHistory(
    tenantId: string,
    containerId: string,
  ): Promise<BchBarOpenContainerLedgerDto[]> {
    const container = await this.prisma.bchBarOpenContainer.findFirst({
      where: { id: containerId, tenantId },
    });
    if (!container) throw new NotFoundException('Garrafa aberta não encontrada.');
    const rows = await this.prisma.bchBarOpenContainerLedger.findMany({
      where: { tenantId, openContainerId: containerId },
      include: this.ledgerInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toLedgerDto(r));
  }

  async discardRemaining(
    tenantId: string,
    userId: string | null,
    containerId: string,
    input?: { notes?: string | null },
  ): Promise<BchBarOpenContainerDto> {
    const container = await this.prisma.bchBarOpenContainer.findFirst({
      where: { id: containerId, tenantId, status: 'open' },
      include: this.containerInclude,
    });
    if (!container) throw new NotFoundException('Garrafa aberta não encontrada ou já encerrada.');
    if (container.remainingContent.lte(BCH_BAR_CONTENT_EMPTY_TOLERANCE)) {
      throw new BadRequestException('Não há conteúdo restante para descartar.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.appendLedgerAndReduce(tx, {
        tenantId,
        container,
        userId,
        quantity: container.remainingContent,
        recordType: 'discard',
        consumptionType: 'spill_waste',
        notes: input?.notes,
        emptyStatus: 'discarded',
      });
    });

    const updated = await this.prisma.bchBarOpenContainer.findFirst({
      where: { id: containerId },
      include: this.containerInclude,
    });
    return this.toContainerDto(updated!, null);
  }

  async adjustContainerContent(
    tenantId: string,
    userId: string | null,
    containerId: string,
    input: { newRemaining: number | string; reason?: string | null },
  ): Promise<BchBarOpenContainerDto> {
    const container = await this.prisma.bchBarOpenContainer.findFirst({
      where: { id: containerId, tenantId, status: 'open' },
      include: this.containerInclude,
    });
    if (!container) throw new NotFoundException('Garrafa aberta não encontrada ou já encerrada.');

    const target = parseNonNegativeDecimal(input.newRemaining, 'Conteúdo restante');
    if (target.gt(container.originalContent)) {
      throw new BadRequestException('Conteúdo não pode exceder o original da abertura.');
    }
    const delta = target.minus(container.remainingContent);
    if (delta.isZero()) {
      return this.toContainerDto(container, null);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bchBarOpenContainer.update({
        where: { id: containerId },
        data: { remainingContent: target },
      });
      await tx.bchBarOpenContainerLedger.create({
        data: {
          tenantId,
          openContainerId: containerId,
          productId: container.productId,
          locationId: container.locationId,
          recordType: 'manual_adjustment',
          consumptionType: 'manual_adjustment',
          quantity: delta.abs(),
          contentDelta: delta,
          remainingAfter: target,
          reason: input.reason?.trim() || 'Ajuste de conteúdo estimado',
          createdByUserId: userId,
        },
      });
      await this.finalizeContainerStatus(tx, containerId, target, userId);
    });

    const updated = await this.prisma.bchBarOpenContainer.findFirst({
      where: { id: containerId },
      include: this.containerInclude,
    });
    return this.toContainerDto(updated!, null);
  }

  private async openContainerInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string | null,
    productId: string,
    locationId: string,
    physical: { id: string; unitType: string; volumeMl: number | null; quantityBasis: Prisma.Decimal },
    eventId?: string | null,
  ) {
    const { amount, unit } = getOriginalContentForPhysicalUnit(physical);
    const movement = await this.stock.applyMovementInTransaction(tx, tenantId, userId, {
      productId,
      locationId,
      movementType: 'internal_use',
      direction: 'out',
      quantity: new Prisma.Decimal(1),
      unitBasis: physical.unitType,
      eventId,
      referenceType: OPEN_CONTAINER_STOCK_REF,
      reason: 'Abertura automática para consumo por porção',
    });
    return tx.bchBarOpenContainer.create({
      data: {
        tenantId,
        productId,
        locationId,
        physicalUnitId: physical.id,
        eventId: eventId ?? null,
        status: 'open',
        contentUnit: unit,
        originalContent: amount,
        remainingContent: amount,
        openedByUserId: userId,
        openStockMovementId: movement.id,
      },
    });
  }

  private async pickOpenContainerFifo(
    tx: Prisma.TransactionClient,
    tenantId: string,
    productId: string,
    locationId: string,
    need: Prisma.Decimal,
  ) {
    const candidates = await tx.bchBarOpenContainer.findMany({
      where: {
        tenantId,
        productId,
        locationId,
        status: 'open',
        remainingContent: { gte: need },
      },
      orderBy: { openedAt: 'asc' },
      take: 1,
    });
    return candidates[0] ?? null;
  }

  async consumeSellingUnit(
    tenantId: string,
    userId: string | null,
    input: {
      sellingUnitId: string;
      locationId: string;
      consumptionType?: string;
      eventId?: string | null;
      sourceKey?: string | null;
      portions?: number | string;
    },
  ): Promise<{
    mode: 'whole_unit_stock' | 'open_container';
    stockMovementId?: string;
    openContainerLedgerId?: string;
    containerId?: string;
  }> {
    const consumptionType = this.assertConsumptionType(input.consumptionType ?? 'sale');
    const portions = input.portions != null ? parsePositiveDecimal(input.portions, 'Porções') : new Prisma.Decimal(1);

    if (input.sourceKey?.trim()) {
      const dup = await this.prisma.bchBarOpenContainerLedger.findFirst({
        where: { tenantId, sourceKey: input.sourceKey.trim() },
      });
      if (dup) {
        return {
          mode: 'open_container',
          openContainerLedgerId: dup.id,
          containerId: dup.openContainerId,
        };
      }
      const dupStock = await this.prisma.bchBarStockMovement.findFirst({
        where: { tenantId, sourceKey: input.sourceKey.trim() },
      });
      if (dupStock) {
        return { mode: 'whole_unit_stock', stockMovementId: dupStock.id };
      }
    }

    const sellingUnit = await this.prisma.bchBarSellingUnit.findFirst({
      where: { id: input.sellingUnitId, tenantId },
      include: { product: { include: { physicalUnit: true } } },
    });
    if (!sellingUnit?.product.physicalUnit) {
      throw new NotFoundException('Unidade de venda ou produto não encontrado.');
    }
    if (!sellingUnit.active || !sellingUnit.product.active) {
      throw new BadRequestException('Unidade de venda ou produto inativo.');
    }

    const physical = sellingUnit.product.physicalUnit;
    const productId = sellingUnit.productId;

    if (isWholePhysicalUnitSale(sellingUnit)) {
      const qty = sellingUnit.physicalUnitsConsumedPerSale.mul(portions);
      const movement = await this.stock.createManualMovement(tenantId, userId, {
        productId,
        locationId: input.locationId,
        movementType: consumptionType as BchBarMovementType,
        direction: 'out',
        quantity: decStr(qty),
        eventId: input.eventId,
        sourceKey: input.sourceKey?.trim() || null,
        reason: 'Consumo unidade física inteira',
      });
      return { mode: 'whole_unit_stock', stockMovementId: movement.id };
    }

    const portionAmount = getPortionContentAmount(sellingUnit, physical).mul(portions);

    const result = await this.prisma.$transaction(async (tx) => {
      let container = await this.pickOpenContainerFifo(
        tx,
        tenantId,
        productId,
        input.locationId,
        portionAmount,
      );

      if (!container) {
        const balance = await tx.bchBarStockBalance.findUnique({
          where: {
            productId_locationId: { productId, locationId: input.locationId },
          },
        });
        const closedQty = balance?.quantityOnHand ?? new Prisma.Decimal(0);
        if (closedQty.lt(1)) {
          throw new BadRequestException('Estoque insuficiente (fechado e aberto).');
        }
        container = await this.openContainerInTx(
          tx,
          tenantId,
          userId,
          productId,
          input.locationId,
          physical,
          input.eventId,
        );
      }

      if (container.remainingContent.lt(portionAmount)) {
        throw new BadRequestException('Conteúdo insuficiente após abertura.');
      }

      const { ledgerId } = await this.appendLedgerAndReduce(tx, {
        tenantId,
        container,
        userId,
        quantity: portionAmount,
        recordType: 'consumption',
        consumptionType,
        sellingUnitId: sellingUnit.id,
        eventId: input.eventId,
        sourceKey: input.sourceKey?.trim() || null,
      });

      return { containerId: container.id, ledgerId };
    });

    return {
      mode: 'open_container',
      openContainerLedgerId: result.ledgerId,
      containerId: result.containerId,
    };
  }

  async getSellingUnitAvailability(
    tenantId: string,
    sellingUnitId: string,
    locationId: string,
  ): Promise<BchBarSellingUnitAvailabilityDto> {
    const sellingUnit = await this.prisma.bchBarSellingUnit.findFirst({
      where: { id: sellingUnitId, tenantId },
      include: { product: { include: { physicalUnit: true } } },
    });
    if (!sellingUnit?.product.physicalUnit) {
      throw new NotFoundException('Unidade de venda não encontrada.');
    }
    const physical = sellingUnit.product.physicalUnit;
    const balance = await this.prisma.bchBarStockBalance.findUnique({
      where: {
        productId_locationId: {
          productId: sellingUnit.productId,
          locationId,
        },
      },
    });
    const closedUnits = balance?.quantityOnHand ?? new Prisma.Decimal(0);

    if (isWholePhysicalUnitSale(sellingUnit)) {
      const perSale = sellingUnit.physicalUnitsConsumedPerSale;
      const fulfillable = perSale.gt(0) ? closedUnits.div(perSale).floor() : new Prisma.Decimal(0);
      return {
        sellingUnitId,
        locationId,
        mode: 'whole_unit',
        fulfillableUnits: decStr(fulfillable),
        closedPhysicalUnits: decStr(closedUnits),
        openRemainingContent: '0',
        contentUnit: null,
        portionSize: null,
      };
    }

    const portion = getPortionContentAmount(sellingUnit, physical);
    const orig = getOriginalContentForPhysicalUnit(physical);
    const portionsPerClosed =
      sellingUnit.expectedPortionsPerPhysical ??
      (portion.gt(0) ? orig.amount.div(portion).floor() : new Prisma.Decimal(0));

    const openRows = await this.prisma.bchBarOpenContainer.findMany({
      where: {
        tenantId,
        productId: sellingUnit.productId,
        locationId,
        status: 'open',
      },
      select: { remainingContent: true },
    });
    let openSum = new Prisma.Decimal(0);
    for (const r of openRows) openSum = openSum.plus(r.remainingContent);

    const fromClosed = closedUnits.mul(portionsPerClosed);
    const fromOpen = portion.gt(0) ? openSum.div(portion).floor() : new Prisma.Decimal(0);
    const total = fromClosed.plus(fromOpen);

    return {
      sellingUnitId,
      locationId,
      mode: 'portion',
      fulfillableUnits: decStr(total),
      closedPhysicalUnits: decStr(closedUnits),
      openRemainingContent: decStr(openSum),
      contentUnit: orig.unit,
      portionSize: decStr(portion),
    };
  }
}
