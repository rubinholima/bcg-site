import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';

const SCHEDULE_PRESETS = [
  'setup',
  'soundcheck',
  'doors_open',
  'event_start',
  'event_end',
  'teardown',
  'custom',
] as const;

@Injectable()
export class BostonCityHallEventPlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bar: BostonCityHallBarService,
  ) {}

  private async tenantId(): Promise<string> {
    return this.bar.resolveBchTenantId();
  }

  private async assertEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    return event;
  }

  async listSchedule(eventId: string) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    return this.prisma.bchEventScheduleItem.findMany({
      where: { tenantId, eventId: eventId.trim() },
      orderBy: [{ startsAt: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createSchedule(
    eventId: string,
    body: {
      itemType: string;
      title: string;
      startsAt: string;
      endsAt?: string | null;
      locationLabel?: string | null;
      responsibleName?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const itemType = SCHEDULE_PRESETS.includes(body.itemType as (typeof SCHEDULE_PRESETS)[number])
      ? body.itemType
      : 'custom';
    return this.prisma.bchEventScheduleItem.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        itemType,
        title: body.title.trim(),
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        locationLabel: body.locationLabel?.trim() || null,
        responsibleName: body.responsibleName?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });
  }

  async seedDefaultSchedule(eventId: string) {
    const tenantId = await this.tenantId();
    const event = await this.assertEvent(tenantId, eventId);
    const existing = await this.prisma.bchEventScheduleItem.count({
      where: { tenantId, eventId: event.id },
    });
    if (existing > 0) return { seeded: false, count: existing };
    if (!event.startDate) return { seeded: false, count: 0 };
    const start = event.startDate;
    const end = event.endDate ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const items = [
      { itemType: 'setup', title: 'Montagem', offsetHours: -4 },
      { itemType: 'doors_open', title: 'Abertura do salão', offsetHours: -1 },
      { itemType: 'event_start', title: 'Início do evento', offsetHours: 0 },
      { itemType: 'event_end', title: 'Término do evento', offsetHours: (end.getTime() - start.getTime()) / 3600000 },
      { itemType: 'teardown', title: 'Desmontagem', offsetHours: (end.getTime() - start.getTime()) / 3600000 + 1 },
    ];
    await this.prisma.bchEventScheduleItem.createMany({
      data: items.map((it, i) => ({
        tenantId,
        eventId: event.id,
        itemType: it.itemType,
        title: it.title,
        startsAt: new Date(start.getTime() + it.offsetHours * 3600000),
        endsAt: null,
        sortOrder: i,
        status: 'planned',
      })),
    });
    return { seeded: true, count: items.length };
  }

  async listStaff(eventId: string) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    return this.prisma.bchEventStaffAssignment.findMany({
      where: { tenantId, eventId: eventId.trim() },
      include: {
        employee: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ plannedStartAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createStaff(
    eventId: string,
    body: {
      employeeId?: string | null;
      userId?: string | null;
      contractorName?: string | null;
      supplierId?: string | null;
      roleLabel: string;
      responsibility?: string | null;
      locationLabel?: string | null;
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
      rateType?: string | null;
      rateAmount?: number | string | null;
      rateCurrency?: string | null;
      plannedCost?: number | string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const dec = (v: number | string | null | undefined) =>
      v == null || v === '' ? null : new Prisma.Decimal(String(v));
    return this.prisma.bchEventStaffAssignment.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        employeeId: body.employeeId?.trim() || null,
        userId: body.userId?.trim() || null,
        contractorName: body.contractorName?.trim() || null,
        supplierId: body.supplierId?.trim() || null,
        roleLabel: body.roleLabel.trim(),
        responsibility: body.responsibility?.trim() || null,
        locationLabel: body.locationLabel?.trim() || null,
        plannedStartAt: body.plannedStartAt ? new Date(body.plannedStartAt) : null,
        plannedEndAt: body.plannedEndAt ? new Date(body.plannedEndAt) : null,
        rateType: body.rateType?.trim() || null,
        rateAmount: dec(body.rateAmount),
        rateCurrency: body.rateCurrency?.trim() || null,
        plannedCost: dec(body.plannedCost),
        status: 'planned',
        notes: body.notes?.trim() || null,
      },
    });
  }

  async listServiceCommitments(eventId: string) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    return this.prisma.bchEventServiceCommitment.findMany({
      where: { tenantId, eventId: eventId.trim() },
      include: {
        catalogService: { select: { id: true, name: true, category: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createServiceCommitment(
    eventId: string,
    body: {
      catalogServiceId?: string | null;
      supplierId?: string | null;
      description: string;
      quantity?: number | string | null;
      unitLabel?: string | null;
      contractedAmount?: number | string | null;
      plannedCost?: number | string | null;
      currency?: string;
      responsibleName?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const dec = (v: number | string | null | undefined) =>
      v == null || v === '' ? null : new Prisma.Decimal(String(v));
    return this.prisma.bchEventServiceCommitment.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        catalogServiceId: body.catalogServiceId?.trim() || null,
        supplierId: body.supplierId?.trim() || null,
        description: body.description.trim(),
        quantity: dec(body.quantity),
        unitLabel: body.unitLabel?.trim() || null,
        contractedAmount: dec(body.contractedAmount),
        plannedCost: dec(body.plannedCost),
        currency: body.currency?.trim() || 'BRL',
        responsibleName: body.responsibleName?.trim() || null,
        operationalStatus: 'planned',
        notes: body.notes?.trim() || null,
      },
    });
  }
}
