import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarStockService } from './boston-city-hall-bar-stock.service';
import {
  BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_REASONS,
  BCH_BAR_PHYSICAL_COUNT_REF_TYPE,
  BCH_BAR_PHYSICAL_COUNT_STATUSES,
  bchBarPhysicalCountItemSourceKey,
  type BchBarPhysicalCountDto,
  type BchBarPhysicalCountItemDto,
  type BchBarPhysicalCountTotalsDto,
} from './boston-city-hall-bar-physical-count.constants';

function decStr(v: Prisma.Decimal | number | null | undefined): string {
  if (v == null) return '0';
  const d = v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
  return d.toFixed(4).replace(/\.?0+$/, '') || '0';
}

function parseNonNegativeDecimal(value: number | string, field: string): Prisma.Decimal {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${field} inválido.`);
  return new Prisma.Decimal(n);
}

function assertReason(reason: string | null | undefined): string | null {
  const r = reason?.trim();
  if (!r) return null;
  if (!BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_REASONS.includes(r as (typeof BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_REASONS)[number])) {
    throw new BadRequestException('Motivo de divergência inválido.');
  }
  return r;
}

type CountRow = Prisma.BchBarPhysicalCountGetPayload<{
  include: {
    location: { select: { code: true; name: true; kind: true; eventId: true } };
    event: { select: { name: true } };
    startedBy: { select: { name: true } };
    completedBy: { select: { name: true } };
    items: {
      include: {
        product: { select: { sku: true; name: true } };
      };
    };
  };
}>;

@Injectable()
export class BostonCityHallBarPhysicalCountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: BostonCityHallBarStockService,
  ) {}

  private includeCount() {
    return {
      location: { select: { code: true, name: true, kind: true, eventId: true } },
      event: { select: { name: true } },
      startedBy: { select: { name: true } },
      completedBy: { select: { name: true } },
      items: {
        include: { product: { select: { sku: true, name: true } } },
        orderBy: { product: { name: 'asc' } },
      },
    } as const;
  }

  private async loadCount(tenantId: string, id: string): Promise<CountRow> {
    const row = await this.prisma.bchBarPhysicalCount.findFirst({
      where: { id, tenantId },
      include: this.includeCount(),
    });
    if (!row) throw new NotFoundException('Contagem física não encontrada.');
    return row;
  }

  private assertEditable(status: string) {
    if (status !== 'draft' && status !== 'in_progress') {
      throw new BadRequestException('Contagem não pode ser alterada neste status.');
    }
  }

  private async validateLocation(
    tenantId: string,
    locationId: string,
    eventId?: string | null,
  ): Promise<{ id: string; eventId: string | null; kind: string }> {
    const location = await this.prisma.bchBarInventoryLocation.findFirst({
      where: { id: locationId, tenantId, active: true },
    });
    if (!location) throw new NotFoundException('Local não encontrado.');
    if (location.kind === 'event_bar') {
      if (!location.eventId) {
        throw new BadRequestException('Local event_bar sem evento associado.');
      }
      if (eventId?.trim() && eventId.trim() !== location.eventId) {
        throw new BadRequestException('eventId não corresponde ao local do bar.');
      }
      return { id: location.id, eventId: location.eventId, kind: location.kind };
    }
    if (eventId?.trim()) {
      throw new BadRequestException('eventId só se aplica a locais event_bar.');
    }
    return { id: location.id, eventId: null, kind: location.kind };
  }

  private computeTotals(items: CountRow['items']): BchBarPhysicalCountTotalsDto {
    const expectedByUnit: Record<string, Prisma.Decimal> = {};
    const countedByUnit: Record<string, Prisma.Decimal> = {};
    const positiveByUnit: Record<string, Prisma.Decimal> = {};
    const negativeByUnit: Record<string, Prisma.Decimal> = {};
    let productsCounted = 0;
    let productsWithDivergence = 0;

    for (const item of items) {
      const unit = item.unitBasis ?? 'unit';
      expectedByUnit[unit] = (expectedByUnit[unit] ?? new Prisma.Decimal(0)).plus(item.expectedQuantity);
      if (item.countedQuantity != null) {
        productsCounted += 1;
        countedByUnit[unit] = (countedByUnit[unit] ?? new Prisma.Decimal(0)).plus(item.countedQuantity);
      }
      if (item.divergenceQuantity != null && !item.divergenceQuantity.isZero()) {
        productsWithDivergence += 1;
        if (item.divergenceQuantity.gt(0)) {
          positiveByUnit[unit] = (positiveByUnit[unit] ?? new Prisma.Decimal(0)).plus(item.divergenceQuantity);
        } else {
          negativeByUnit[unit] = (negativeByUnit[unit] ?? new Prisma.Decimal(0)).plus(item.divergenceQuantity.abs());
        }
      }
    }

    const mapDec = (m: Record<string, Prisma.Decimal>) =>
      Object.fromEntries(Object.entries(m).map(([k, v]) => [k, decStr(v)]));

    return {
      productsInSession: items.length,
      productsCounted,
      productsWithDivergence,
      expectedByUnit: mapDec(expectedByUnit),
      countedByUnit: mapDec(countedByUnit),
      positiveDivergenceByUnit: mapDec(positiveByUnit),
      negativeDivergenceByUnit: mapDec(negativeByUnit),
    };
  }

  private mapItem(item: CountRow['items'][number]): BchBarPhysicalCountItemDto {
    return {
      id: item.id,
      productId: item.productId,
      productSku: item.product.sku,
      productName: item.product.name,
      expectedQuantity: decStr(item.expectedQuantity),
      countedQuantity: item.countedQuantity != null ? decStr(item.countedQuantity) : null,
      divergenceQuantity: item.divergenceQuantity != null ? decStr(item.divergenceQuantity) : null,
      unitBasis: item.unitBasis,
      reason: item.reason,
      notes: item.notes,
      adjustedMovementId: item.adjustedMovementId,
      countedAt: item.countedAt?.toISOString() ?? null,
    };
  }

  private async openContainersForLocation(tenantId: string, locationId: string) {
    const rows = await this.prisma.bchBarOpenContainer.findMany({
      where: { tenantId, locationId, status: 'open' },
      include: { product: { select: { name: true } } },
      orderBy: { openedAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      remainingContent: decStr(r.remainingContent),
      contentUnit: r.contentUnit,
      status: r.status,
    }));
  }

  private async toDto(row: CountRow): Promise<BchBarPhysicalCountDto> {
    const openContainers = await this.openContainersForLocation(row.tenantId, row.locationId);
    return {
      id: row.id,
      locationId: row.locationId,
      locationCode: row.location.code,
      locationName: row.location.name,
      eventId: row.eventId,
      eventTitle: row.event?.name ?? null,
      status: row.status,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      startedByName: row.startedBy?.name ?? null,
      completedByName: row.completedBy?.name ?? null,
      notes: row.notes,
      items: row.items.map((i) => this.mapItem(i)),
      openContainers,
      totals: this.computeTotals(row.items),
    };
  }

  async listPhysicalCounts(
    tenantId: string,
    query: { locationId?: string; eventId?: string; status?: string },
  ): Promise<BchBarPhysicalCountDto[]> {
    const where: Prisma.BchBarPhysicalCountWhereInput = { tenantId };
    if (query.locationId?.trim()) where.locationId = query.locationId.trim();
    if (query.eventId?.trim()) where.eventId = query.eventId.trim();
    if (query.status?.trim()) {
      if (!BCH_BAR_PHYSICAL_COUNT_STATUSES.includes(query.status as (typeof BCH_BAR_PHYSICAL_COUNT_STATUSES)[number])) {
        throw new BadRequestException('Status inválido.');
      }
      where.status = query.status.trim();
    }
    const rows = await this.prisma.bchBarPhysicalCount.findMany({
      where,
      include: this.includeCount(),
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return Promise.all(rows.map((r) => this.toDto(r)));
  }

  async createPhysicalCount(
    tenantId: string,
    userId: string | null,
    input: { locationId: string; eventId?: string | null; notes?: string | null },
  ): Promise<BchBarPhysicalCountDto> {
    const loc = await this.validateLocation(tenantId, input.locationId, input.eventId);
    const row = await this.prisma.bchBarPhysicalCount.create({
      data: {
        tenantId,
        locationId: loc.id,
        eventId: loc.eventId,
        status: 'draft',
        notes: input.notes?.trim() || null,
      },
      include: this.includeCount(),
    });
    return this.toDto(row);
  }

  async startPhysicalCount(tenantId: string, userId: string | null, countId: string): Promise<BchBarPhysicalCountDto> {
    const existing = await this.loadCount(tenantId, countId);
    if (existing.status !== 'draft') {
      throw new BadRequestException('Só contagens em rascunho podem ser iniciadas.');
    }
    if (existing.items.length > 0) {
      throw new BadRequestException('Contagem já possui itens.');
    }

    const balances = await this.prisma.bchBarStockBalance.findMany({
      where: {
        tenantId,
        locationId: existing.locationId,
        quantityOnHand: { gt: 0 },
      },
      include: {
        product: { include: { physicalUnit: true } },
      },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const bal of balances) {
        if (!bal.product.active) continue;
        await tx.bchBarPhysicalCountItem.create({
          data: {
            countId,
            productId: bal.productId,
            expectedQuantity: bal.quantityOnHand,
            unitBasis: bal.product.physicalUnit?.unitType ?? null,
          },
        });
      }
      await tx.bchBarPhysicalCount.update({
        where: { id: countId },
        data: {
          status: 'in_progress',
          startedAt: new Date(),
          startedByUserId: userId,
        },
      });
    });

    return this.getPhysicalCount(tenantId, countId);
  }

  async getPhysicalCount(tenantId: string, countId: string): Promise<BchBarPhysicalCountDto> {
    const row = await this.loadCount(tenantId, countId);
    return this.toDto(row);
  }

  async addCountItem(
    tenantId: string,
    userId: string | null,
    countId: string,
    input: { productId: string },
  ): Promise<BchBarPhysicalCountDto> {
    const count = await this.loadCount(tenantId, countId);
    this.assertEditable(count.status);

    const product = await this.prisma.bchBarProduct.findFirst({
      where: { id: input.productId, tenantId, active: true },
      include: { physicalUnit: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const dup = count.items.find((i) => i.productId === product.id);
    if (dup) throw new BadRequestException('Produto já está na contagem.');

    const balance = await this.prisma.bchBarStockBalance.findUnique({
      where: {
        productId_locationId: { productId: product.id, locationId: count.locationId },
      },
    });
    const expected = balance?.quantityOnHand ?? new Prisma.Decimal(0);

    await this.prisma.bchBarPhysicalCountItem.create({
      data: {
        countId,
        productId: product.id,
        expectedQuantity: expected,
        unitBasis: product.physicalUnit?.unitType ?? null,
      },
    });

    return this.getPhysicalCount(tenantId, countId);
  }

  async updateCountItem(
    tenantId: string,
    userId: string | null,
    countId: string,
    itemId: string,
    input: {
      countedQuantity: number | string;
      reason?: string | null;
      notes?: string | null;
    },
  ): Promise<BchBarPhysicalCountDto> {
    const count = await this.loadCount(tenantId, countId);
    this.assertEditable(count.status);
    if (count.status === 'draft') {
      throw new BadRequestException('Inicie a contagem antes de registrar quantidades.');
    }

    const item = count.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item da contagem não encontrado.');

    const counted = parseNonNegativeDecimal(input.countedQuantity, 'Quantidade contada');
    const divergence = counted.minus(item.expectedQuantity);
    const reason = assertReason(input.reason);

    await this.prisma.bchBarPhysicalCountItem.update({
      where: { id: itemId },
      data: {
        countedQuantity: counted,
        divergenceQuantity: divergence,
        reason,
        notes: input.notes?.trim() || null,
        countedByUserId: userId,
        countedAt: new Date(),
      },
    });

    return this.getPhysicalCount(tenantId, countId);
  }

  async completePhysicalCount(
    tenantId: string,
    userId: string | null,
    countId: string,
  ): Promise<BchBarPhysicalCountDto> {
    const count = await this.loadCount(tenantId, countId);
    if (count.status === 'completed') {
      return this.toDto(count);
    }
    if (count.status !== 'in_progress') {
      throw new BadRequestException('Só contagens em andamento podem ser concluídas.');
    }

    for (const item of count.items) {
      if (item.countedQuantity == null) {
        throw new BadRequestException(
          `Informe a quantidade contada para ${item.product.name} (use 0 se não houver estoque).`,
        );
      }
      if (item.divergenceQuantity && !item.divergenceQuantity.isZero() && !item.reason?.trim()) {
        throw new BadRequestException(`Informe o motivo da divergência para ${item.product.name}.`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of count.items) {
        const div = item.divergenceQuantity ?? new Prisma.Decimal(0);
        if (div.isZero()) continue;

        if (item.adjustedMovementId) continue;

        const sourceKey = bchBarPhysicalCountItemSourceKey(countId, item.id);
        const existingMove = await tx.bchBarStockMovement.findFirst({
          where: { tenantId, sourceKey },
        });
        if (existingMove) {
          await tx.bchBarPhysicalCountItem.update({
            where: { id: item.id },
            data: { adjustedMovementId: existingMove.id },
          });
          continue;
        }

        const direction = div.gt(0) ? ('in' as const) : ('out' as const);
        const qty = div.abs();

        const movement = await this.stock.applyMovementInTransaction(tx, tenantId, userId, {
          productId: item.productId,
          locationId: count.locationId,
          movementType: 'physical_count_adjustment',
          direction,
          quantity: qty,
          unitBasis: item.unitBasis,
          eventId: count.eventId,
          referenceType: BCH_BAR_PHYSICAL_COUNT_REF_TYPE,
          referenceId: item.id,
          sourceKey,
          reason: item.reason,
          notes: item.notes,
        });

        await tx.bchBarPhysicalCountItem.update({
          where: { id: item.id },
          data: { adjustedMovementId: movement.id },
        });
      }

      await tx.bchBarPhysicalCount.update({
        where: { id: countId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedByUserId: userId,
        },
      });
    });

    return this.getPhysicalCount(tenantId, countId);
  }

  async cancelPhysicalCount(
    tenantId: string,
    userId: string | null,
    countId: string,
  ): Promise<BchBarPhysicalCountDto> {
    const count = await this.loadCount(tenantId, countId);
    if (count.status === 'completed') {
      throw new BadRequestException('Contagem concluída não pode ser cancelada.');
    }
    if (count.status === 'cancelled') {
      return this.toDto(count);
    }
    if (count.status !== 'draft' && count.status !== 'in_progress') {
      throw new BadRequestException('Status inválido para cancelamento.');
    }

    await this.prisma.bchBarPhysicalCount.update({
      where: { id: countId },
      data: { status: 'cancelled' },
    });

    return this.getPhysicalCount(tenantId, countId);
  }

  /** Metadados operacionais para estoque de evento (Fase 4.5). */
  async latestCompletedMetadata(
    tenantId: string,
    locationId: string,
  ): Promise<{ completedAt: string | null; productsWithDivergence: number }> {
    const row = await this.prisma.bchBarPhysicalCount.findFirst({
      where: { tenantId, locationId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      include: {
        items: { select: { divergenceQuantity: true } },
      },
    });
    if (!row) return { completedAt: null, productsWithDivergence: 0 };
    let n = 0;
    for (const i of row.items) {
      if (i.divergenceQuantity && !i.divergenceQuantity.isZero()) n += 1;
    }
    return {
      completedAt: row.completedAt?.toISOString() ?? null,
      productsWithDivergence: n,
    };
  }
}
