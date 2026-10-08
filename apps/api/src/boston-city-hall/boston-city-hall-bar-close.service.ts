import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarEventInventoryService } from './boston-city-hall-bar-event-inventory.service';
import { BostonCityHallBarReportsService } from './boston-city-hall-bar-reports.service';
import { BCH_BAR_CONTENT_EMPTY_TOLERANCE } from './boston-city-hall-bar-portion.util';
import type { BchBarCloseDto } from './boston-city-hall-bar-close.constants';

@Injectable()
export class BostonCityHallBarCloseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventInventory: BostonCityHallBarEventInventoryService,
    private readonly reports: BostonCityHallBarReportsService,
  ) {}

  private async mapClose(row: {
    id: string;
    eventId: string;
    eventInventoryId: string;
    locationId: string;
    status: string;
    closedAt: Date | null;
    warnings: unknown;
    notes: string | null;
    snapshot: unknown;
    event?: { name: string } | null;
    location?: { name: string } | null;
    closedBy?: { name: string | null } | null;
  }): Promise<BchBarCloseDto> {
    const warnings = Array.isArray(row.warnings)
      ? (row.warnings as string[])
      : row.warnings
        ? [String(row.warnings)]
        : [];
    return {
      id: row.id,
      eventId: row.eventId,
      eventTitle: row.event?.name ?? null,
      eventInventoryId: row.eventInventoryId,
      locationId: row.locationId,
      locationName: row.location?.name ?? '',
      status: row.status,
      closedAt: row.closedAt?.toISOString() ?? null,
      closedByName: row.closedBy?.name ?? null,
      warnings,
      notes: row.notes,
      snapshot: (row.snapshot as Record<string, unknown>) ?? null,
    };
  }

  private include() {
    return {
      event: { select: { name: true } },
      location: { select: { name: true } },
      closedBy: { select: { name: true } },
    } as const;
  }

  async listCloses(tenantId: string, eventId?: string): Promise<BchBarCloseDto[]> {
    const rows = await this.prisma.bchBarClose.findMany({
      where: { tenantId, ...(eventId?.trim() ? { eventId: eventId.trim() } : {}) },
      include: this.include(),
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return Promise.all(rows.map((r) => this.mapClose(r)));
  }

  async getClose(tenantId: string, id: string): Promise<BchBarCloseDto> {
    const row = await this.prisma.bchBarClose.findFirst({
      where: { id, tenantId },
      include: this.include(),
    });
    if (!row) throw new NotFoundException('Fechamento não encontrado.');
    return this.mapClose(row);
  }

  private async buildSnapshot(tenantId: string, eventInventoryId: string) {
    const inv = await this.prisma.bchBarEventInventory.findFirst({
      where: { id: eventInventoryId, tenantId },
    });
    if (!inv) throw new NotFoundException('Estoque de evento não encontrado.');

    const inventorySummary = await this.eventInventory.getSummary(tenantId, eventInventoryId);
    const eventReport = await this.reports.getEventReport(tenantId, inv.eventId);

    const openContainers = await this.prisma.bchBarOpenContainer.findMany({
      where: { tenantId, locationId: inv.locationId, status: 'open' },
      select: { id: true, productId: true, remainingContent: true, status: true },
    });

    const latestCount = await this.prisma.bchBarPhysicalCount.findFirst({
      where: { tenantId, locationId: inv.locationId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      include: { items: true },
    });

    let physicalCountSummary: Record<string, unknown> | null = null;
    if (latestCount) {
      physicalCountSummary = {
        countId: latestCount.id,
        completedAt: latestCount.completedAt?.toISOString() ?? null,
        items: latestCount.items.map((i) => ({
          productId: i.productId,
          expectedQuantity: i.expectedQuantity.toString(),
          countedQuantity: i.countedQuantity?.toString() ?? null,
          divergenceQuantity: i.divergenceQuantity?.toString() ?? null,
          reason: i.reason,
        })),
      };
    }

    return {
      generatedAt: new Date().toISOString(),
      eventInventoryId,
      eventId: inv.eventId,
      locationId: inv.locationId,
      inventorySummary,
      eventReport,
      openContainers: openContainers.map((c) => ({
        id: c.id,
        productId: c.productId,
        remainingContent: c.remainingContent.toString(),
        status: c.status,
      })),
      physicalCountSummary,
    };
  }

  private async collectWarnings(tenantId: string, locationId: string): Promise<string[]> {
    const warnings: string[] = [];
    const completed = await this.prisma.bchBarPhysicalCount.findFirst({
      where: { tenantId, locationId, status: 'completed' },
    });
    if (!completed) {
      warnings.push('Nenhuma contagem física concluída associada a este fechamento.');
    }
    return warnings;
  }

  async createOrRefreshDraft(
    tenantId: string,
    userId: string | null,
    input: { eventInventoryId: string; notes?: string | null },
  ): Promise<BchBarCloseDto> {
    const inv = await this.prisma.bchBarEventInventory.findFirst({
      where: { id: input.eventInventoryId, tenantId },
    });
    if (!inv) throw new NotFoundException('Estoque de evento não encontrado.');

    const existing = await this.prisma.bchBarClose.findFirst({
      where: { tenantId, eventInventoryId: inv.id },
    });
    if (existing?.status === 'finalized') {
      throw new BadRequestException('Fechamento já finalizado.');
    }

    const snapshot = await this.buildSnapshot(tenantId, inv.id);
    const warnings = await this.collectWarnings(tenantId, inv.locationId);

    const row = existing
      ? await this.prisma.bchBarClose.update({
          where: { id: existing.id },
          data: {
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            warnings: warnings as unknown as Prisma.InputJsonValue,
            notes: input.notes?.trim() ?? existing.notes,
          },
          include: this.include(),
        })
      : await this.prisma.bchBarClose.create({
          data: {
            tenantId,
            eventId: inv.eventId,
            eventInventoryId: inv.id,
            locationId: inv.locationId,
            status: 'draft',
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            warnings: warnings as unknown as Prisma.InputJsonValue,
            notes: input.notes?.trim() || null,
          },
          include: this.include(),
        });

    return this.mapClose(row);
  }

  async finalizeClose(tenantId: string, userId: string | null, closeId: string): Promise<BchBarCloseDto> {
    const row = await this.prisma.bchBarClose.findFirst({
      where: { id: closeId, tenantId },
      include: this.include(),
    });
    if (!row) throw new NotFoundException('Fechamento não encontrado.');
    if (row.status === 'finalized') return this.mapClose(row);

    const inv = await this.prisma.bchBarEventInventory.findFirst({
      where: { id: row.eventInventoryId, tenantId },
    });
    if (!inv || inv.status !== 'closed') {
      throw new BadRequestException('O estoque de evento precisa estar fechado antes do fechamento operacional.');
    }

    const tol = BCH_BAR_CONTENT_EMPTY_TOLERANCE;
    const open = await this.prisma.bchBarOpenContainer.findMany({
      where: { tenantId, locationId: row.locationId, status: 'open' },
    });
    for (const c of open) {
      if (c.remainingContent.gt(tol)) {
        throw new BadRequestException('Garrafas abertas pendentes impedem o fechamento operacional.');
      }
    }

    const activeCount = await this.prisma.bchBarPhysicalCount.findFirst({
      where: {
        tenantId,
        locationId: row.locationId,
        status: { in: ['draft', 'in_progress'] },
      },
    });
    if (activeCount) {
      throw new BadRequestException('Existe contagem física em andamento para este local.');
    }

    const snapshot = await this.buildSnapshot(tenantId, row.eventInventoryId);
    const warnings = await this.collectWarnings(tenantId, row.locationId);

    const updated = await this.prisma.bchBarClose.update({
      where: { id: closeId },
      data: {
        status: 'finalized',
        closedAt: new Date(),
        closedByUserId: userId,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        warnings: warnings as unknown as Prisma.InputJsonValue,
      },
      include: this.include(),
    });

    return this.mapClose(updated);
  }
}
