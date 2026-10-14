import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type BchEventStaffAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';
import { BostonCityHallOperationalRolesService } from './boston-city-hall-operational-roles.service';
import {
  computeStaffActualCost,
  computeStaffPlannedCost,
  decOrNull,
} from './boston-city-hall-staff-cost.util';

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
    private readonly operationalRoles: BostonCityHallOperationalRolesService,
  ) {}

  private assertPersonSource(body: {
    employeeId?: string | null;
    userId?: string | null;
    contractorName?: string | null;
    supplierId?: string | null;
  }) {
    const n = [
      body.employeeId?.trim(),
      body.userId?.trim(),
      body.contractorName?.trim(),
      body.supplierId?.trim(),
    ].filter(Boolean).length;
    if (n !== 1) {
      throw new BadRequestException(
        'Selecione exatamente uma origem: colaborador RH, contratado avulso ou fornecedor.',
      );
    }
  }

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
      responsibleTeamMemberId?: string | null;
      status?: string;
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
        responsibleTeamMemberId: body.responsibleTeamMemberId?.trim() || null,
        status: body.status?.trim() || 'planned',
        notes: body.notes?.trim() || null,
      },
    });
  }

  async updateScheduleItem(
    eventId: string,
    itemId: string,
    body: Partial<{
      itemType: string;
      title: string;
      startsAt: string;
      endsAt: string | null;
      locationLabel: string | null;
      responsibleName: string | null;
      responsibleTeamMemberId: string | null;
      status: string;
      notes: string | null;
    }>,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const row = await this.prisma.bchEventScheduleItem.findFirst({
      where: { id: itemId, tenantId, eventId: eventId.trim() },
    });
    if (!row) throw new NotFoundException('Marco não encontrado.');
    if (row.status === 'cancelled') throw new BadRequestException('Marco cancelado.');
    return this.prisma.bchEventScheduleItem.update({
      where: { id: itemId },
      data: {
        ...(body.itemType !== undefined ? { itemType: body.itemType.trim() } : {}),
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.startsAt !== undefined ? { startsAt: new Date(body.startsAt) } : {}),
        ...(body.endsAt !== undefined ? { endsAt: body.endsAt ? new Date(body.endsAt) : null } : {}),
        ...(body.locationLabel !== undefined ? { locationLabel: body.locationLabel?.trim() || null } : {}),
        ...(body.responsibleName !== undefined ? { responsibleName: body.responsibleName?.trim() || null } : {}),
        ...(body.responsibleTeamMemberId !== undefined
          ? { responsibleTeamMemberId: body.responsibleTeamMemberId?.trim() || null }
          : {}),
        ...(body.status !== undefined ? { status: body.status.trim() } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    });
  }

  async cancelScheduleItem(eventId: string, itemId: string) {
    return this.updateScheduleItem(eventId, itemId, { status: 'cancelled' });
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

  private personKey(a: Pick<BchEventStaffAssignment, 'employeeId' | 'userId' | 'contractorName' | 'supplierId'>) {
    return [a.employeeId ?? '', a.userId ?? '', a.contractorName ?? '', a.supplierId ?? ''].join('|');
  }

  async backfillTeamMembers(eventId: string) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const assignments = await this.prisma.bchEventStaffAssignment.findMany({
      where: { tenantId, eventId: eventId.trim(), teamMemberId: null },
    });
    let linked = 0;
    for (const a of assignments) {
      const key = this.personKey(a);
      let member = await this.prisma.bchEventTeamMember.findFirst({
        where: {
          tenantId,
          eventId: eventId.trim(),
          employeeId: a.employeeId,
          userId: a.userId,
          contractorName: a.contractorName,
          supplierId: a.supplierId,
        },
      });
      if (!member) {
        member = await this.prisma.bchEventTeamMember.create({
          data: {
            tenantId,
            eventId: eventId.trim(),
            employeeId: a.employeeId,
            userId: a.userId,
            contractorName: a.contractorName,
            supplierId: a.supplierId,
            roleLabel: a.roleLabel,
            areaLabel: a.locationLabel,
            responsibility: a.responsibility,
            status: a.status === 'cancelled' ? 'inactive' : 'active',
          },
        });
      }
      await this.prisma.bchEventStaffAssignment.update({
        where: { id: a.id },
        data: { teamMemberId: member.id },
      });
      linked += 1;
      void key;
    }
    return { linked };
  }

  async listTeamMembers(eventId: string) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    await this.backfillTeamMembers(eventId);
    return this.prisma.bchEventTeamMember.findMany({
      where: { tenantId, eventId: eventId.trim() },
      include: {
        employee: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true } },
        operationalRole: { select: { id: true, code: true, name: true } },
        supervisor: { select: { id: true, roleLabel: true, contractorName: true, employee: { select: { name: true } } } },
        shifts: {
          where: { status: { not: 'cancelled' } },
          orderBy: [{ plannedStartAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ roleLabel: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createTeamMember(
    eventId: string,
    body: {
      employeeId?: string | null;
      userId?: string | null;
      contractorName?: string | null;
      supplierId?: string | null;
      operationalRoleId?: string | null;
      roleLabel: string;
      areaLabel?: string | null;
      responsibility?: string | null;
      supervisorId?: string | null;
      notes?: string | null;
      initialShift?: {
        rateType?: string | null;
        rateAmount?: number | string | null;
        rateCurrency?: string | null;
        plannedQuantity?: number | string | null;
        plannedStartAt?: string | null;
        plannedEndAt?: string | null;
        paymentStatus?: string | null;
      } | null;
    },
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    if (!body.roleLabel?.trim() && !body.operationalRoleId?.trim()) {
      throw new BadRequestException('Função operacional é obrigatória.');
    }
    this.assertPersonSource(body);
    const roleLabel = await this.operationalRoles.resolveRoleLabel(
      tenantId,
      body.operationalRoleId,
      body.roleLabel || 'Função',
    );
    const member = await this.prisma.bchEventTeamMember.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        employeeId: body.employeeId?.trim() || null,
        userId: body.userId?.trim() || null,
        contractorName: body.contractorName?.trim() || null,
        supplierId: body.supplierId?.trim() || null,
        operationalRoleId: body.operationalRoleId?.trim() || null,
        roleLabel,
        areaLabel: body.areaLabel?.trim() || null,
        responsibility: body.responsibility?.trim() || null,
        supervisorId: body.supervisorId?.trim() || null,
        notes: body.notes?.trim() || null,
        status: 'active',
      },
    });
    if (body.initialShift?.rateAmount != null && body.initialShift.rateAmount !== '') {
      await this.createStaffShift(eventId, member.id, {
        operationalRoleId: body.operationalRoleId,
        rateType: body.initialShift.rateType,
        rateAmount: body.initialShift.rateAmount,
        rateCurrency: body.initialShift.rateCurrency,
        plannedQuantity: body.initialShift.plannedQuantity,
        plannedStartAt: body.initialShift.plannedStartAt,
        plannedEndAt: body.initialShift.plannedEndAt,
        paymentStatus: body.initialShift.paymentStatus ?? 'planned',
      });
    }
    return this.prisma.bchEventTeamMember.findFirst({
      where: { id: member.id },
      include: {
        employee: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true } },
        operationalRole: { select: { id: true, code: true, name: true } },
        supervisor: { select: { id: true, roleLabel: true, contractorName: true, employee: { select: { name: true } } } },
        shifts: { where: { status: { not: 'cancelled' } }, orderBy: [{ plannedStartAt: 'asc' }] },
      },
    });
  }

  async updateTeamMember(
    eventId: string,
    memberId: string,
    body: Partial<{
      roleLabel: string;
      operationalRoleId: string | null;
      areaLabel: string | null;
      responsibility: string | null;
      supervisorId: string | null;
      status: string;
      notes: string | null;
    }>,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const row = await this.prisma.bchEventTeamMember.findFirst({
      where: { id: memberId, tenantId, eventId: eventId.trim() },
    });
    if (!row) throw new NotFoundException('Membro não encontrado.');
    let roleLabel = body.roleLabel;
    if (body.operationalRoleId !== undefined || body.roleLabel !== undefined) {
      roleLabel = await this.operationalRoles.resolveRoleLabel(
        tenantId,
        body.operationalRoleId !== undefined ? body.operationalRoleId : row.operationalRoleId,
        body.roleLabel ?? row.roleLabel,
      );
    }
    return this.prisma.bchEventTeamMember.update({
      where: { id: memberId },
      data: {
        ...(body.operationalRoleId !== undefined
          ? { operationalRoleId: body.operationalRoleId?.trim() || null }
          : {}),
        ...(roleLabel !== undefined ? { roleLabel } : {}),
        ...(body.areaLabel !== undefined ? { areaLabel: body.areaLabel?.trim() || null } : {}),
        ...(body.responsibility !== undefined ? { responsibility: body.responsibility?.trim() || null } : {}),
        ...(body.supervisorId !== undefined ? { supervisorId: body.supervisorId?.trim() || null } : {}),
        ...(body.status !== undefined ? { status: body.status.trim() } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    });
  }

  async createStaffShift(
    eventId: string,
    teamMemberId: string,
    body: Omit<Parameters<BostonCityHallEventPlanningService['createStaff']>[1], 'employeeId' | 'userId' | 'contractorName' | 'supplierId' | 'roleLabel' | 'responsibility' | 'locationLabel'> & {
      roleLabel?: string;
      locationLabel?: string | null;
      operationalRoleId?: string | null;
    },
  ) {
    const tenantId = await this.tenantId();
    const member = await this.prisma.bchEventTeamMember.findFirst({
      where: { id: teamMemberId.trim(), tenantId, eventId: eventId.trim() },
    });
    if (!member) throw new NotFoundException('Membro da equipe não encontrado.');
    return this.createStaff(eventId, {
      teamMemberId: member.id,
      employeeId: member.employeeId,
      userId: member.userId,
      contractorName: member.contractorName,
      supplierId: member.supplierId,
      operationalRoleId: body.operationalRoleId?.trim() || member.operationalRoleId,
      roleLabel: body.roleLabel?.trim() || member.roleLabel,
      responsibility: member.responsibility,
      locationLabel: body.locationLabel?.trim() || member.areaLabel,
      plannedStartAt: body.plannedStartAt,
      plannedEndAt: body.plannedEndAt,
      rateType: body.rateType,
      rateAmount: body.rateAmount,
      rateCurrency: body.rateCurrency,
      plannedQuantity: body.plannedQuantity,
      actualQuantity: body.actualQuantity,
      plannedCost: body.plannedCost,
      actualCost: body.actualCost,
      paymentStatus: body.paymentStatus,
      notes: body.notes,
    });
  }

  async listOperationalTasks(eventId: string) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    return this.prisma.bchEventOperationalTask.findMany({
      where: { tenantId, eventId: eventId.trim() },
      include: {
        ownerTeamMember: {
          select: { id: true, roleLabel: true, employee: { select: { name: true } }, contractorName: true },
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createOperationalTask(
    eventId: string,
    body: {
      title: string;
      ownerTeamMemberId?: string | null;
      dueAt?: string | null;
      status?: string;
      priority?: string;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    return this.prisma.bchEventOperationalTask.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        title: body.title.trim(),
        ownerTeamMemberId: body.ownerTeamMemberId?.trim() || null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        status: body.status?.trim() || 'open',
        priority: body.priority?.trim() || 'normal',
        notes: body.notes?.trim() || null,
      },
    });
  }

  async cancelOperationalTask(eventId: string, taskId: string) {
    return this.updateOperationalTask(eventId, taskId, { status: 'cancelled' });
  }

  async updateOperationalTask(
    eventId: string,
    taskId: string,
    body: Partial<{
      title: string;
      ownerTeamMemberId: string | null;
      dueAt: string | null;
      status: string;
      priority: string;
      notes: string | null;
    }>,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const row = await this.prisma.bchEventOperationalTask.findFirst({
      where: { id: taskId, tenantId, eventId: eventId.trim() },
    });
    if (!row) throw new NotFoundException('Tarefa não encontrada.');
    return this.prisma.bchEventOperationalTask.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.ownerTeamMemberId !== undefined ? { ownerTeamMemberId: body.ownerTeamMemberId?.trim() || null } : {}),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
        ...(body.status !== undefined ? { status: body.status.trim() } : {}),
        ...(body.priority !== undefined ? { priority: body.priority.trim() } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    });
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
      teamMemberId?: string | null;
      employeeId?: string | null;
      userId?: string | null;
      contractorName?: string | null;
      supplierId?: string | null;
      operationalRoleId?: string | null;
      roleLabel: string;
      responsibility?: string | null;
      locationLabel?: string | null;
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
      actualStartAt?: string | null;
      actualEndAt?: string | null;
      rateType?: string | null;
      rateAmount?: number | string | null;
      rateCurrency?: string | null;
      plannedQuantity?: number | string | null;
      actualQuantity?: number | string | null;
      plannedCost?: number | string | null;
      actualCost?: number | string | null;
      paymentStatus?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const plannedStartAt = body.plannedStartAt ? new Date(body.plannedStartAt) : null;
    const plannedEndAt = body.plannedEndAt ? new Date(body.plannedEndAt) : null;
    const actualStartAt = body.actualStartAt ? new Date(body.actualStartAt) : null;
    const actualEndAt = body.actualEndAt ? new Date(body.actualEndAt) : null;
    const rateType = body.rateType?.trim() || null;
    const rateAmount = decOrNull(body.rateAmount);
    const plannedQuantity = decOrNull(body.plannedQuantity);
    const actualQuantity = decOrNull(body.actualQuantity);
    let plannedCost = decOrNull(body.plannedCost);
    if (plannedCost == null && rateAmount) {
      plannedCost = computeStaffPlannedCost({
        rateType,
        rateAmount,
        plannedQuantity,
        plannedStartAt,
        plannedEndAt,
      });
    }
    let actualCost = decOrNull(body.actualCost);
    if (actualCost == null && rateAmount && (actualStartAt || actualEndAt || actualQuantity)) {
      actualCost = computeStaffActualCost({
        rateType,
        rateAmount,
        plannedQuantity,
        actualQuantity,
        plannedStartAt,
        plannedEndAt,
        actualStartAt,
        actualEndAt,
      });
    }
    const roleLabel = await this.operationalRoles.resolveRoleLabel(
      tenantId,
      body.operationalRoleId,
      body.roleLabel,
    );
    return this.prisma.bchEventStaffAssignment.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        teamMemberId: body.teamMemberId?.trim() || null,
        employeeId: body.employeeId?.trim() || null,
        userId: body.userId?.trim() || null,
        contractorName: body.contractorName?.trim() || null,
        supplierId: body.supplierId?.trim() || null,
        operationalRoleId: body.operationalRoleId?.trim() || null,
        roleLabel,
        responsibility: body.responsibility?.trim() || null,
        locationLabel: body.locationLabel?.trim() || null,
        plannedStartAt,
        plannedEndAt,
        actualStartAt,
        actualEndAt,
        rateType,
        rateAmount,
        rateCurrency: body.rateCurrency?.trim()?.toUpperCase() || null,
        plannedQuantity,
        actualQuantity,
        plannedCost,
        actualCost,
        paymentStatus: body.paymentStatus?.trim() || 'planned',
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

  async searchEmployees(q: string, limit = 15) {
    const tenantId = await this.tenantId();
    const term = q.trim();
    if (term.length < 1) return [];
    const rows = await this.prisma.employee.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        employments: {
          where: { status: 'ativo' },
          orderBy: { startDate: 'desc' },
          take: 1,
          select: {
            jobRole: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
      take: Math.min(limit, 30),
      orderBy: { name: 'asc' },
    });
    return rows.map((e) => ({
      id: e.id,
      name: e.name,
      code: e.code,
      jobRoleName: e.employments[0]?.jobRole?.name ?? null,
      departmentName: e.employments[0]?.department?.name ?? null,
    }));
  }

  async searchSuppliers(q: string, limit = 15) {
    const tenantId = await this.tenantId();
    const term = q.trim();
    if (term.length < 1) return [];
    return this.prisma.supplier.findMany({
      where: {
        tenantId,
        name: { contains: term, mode: 'insensitive' },
      },
      select: { id: true, name: true },
      take: Math.min(limit, 30),
      orderBy: { name: 'asc' },
    });
  }

  async updateStaffAssignment(
    eventId: string,
    assignmentId: string,
    body: Partial<{
      employeeId: string | null;
      contractorName: string | null;
      supplierId: string | null;
      roleLabel: string;
      responsibility: string | null;
      locationLabel: string | null;
      plannedStartAt: string | null;
      plannedEndAt: string | null;
      actualStartAt: string | null;
      actualEndAt: string | null;
      operationalRoleId: string | null;
      rateType: string | null;
      rateAmount: number | string | null;
      rateCurrency: string | null;
      plannedQuantity: number | string | null;
      actualQuantity: number | string | null;
      plannedCost: number | string | null;
      actualCost: number | string | null;
      paymentStatus: string | null;
      status: string;
      notes: string | null;
    }>,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const row = await this.prisma.bchEventStaffAssignment.findFirst({
      where: { id: assignmentId, tenantId, eventId: eventId.trim() },
    });
    if (!row) throw new NotFoundException('Turno não encontrado.');
    if (row.status === 'cancelled') throw new BadRequestException('Turno cancelado não pode ser editado.');
    const plannedStartAt =
      body.plannedStartAt !== undefined
        ? body.plannedStartAt
          ? new Date(body.plannedStartAt)
          : null
        : row.plannedStartAt;
    const plannedEndAt =
      body.plannedEndAt !== undefined
        ? body.plannedEndAt
          ? new Date(body.plannedEndAt)
          : null
        : row.plannedEndAt;
    const actualStartAt =
      body.actualStartAt !== undefined
        ? body.actualStartAt
          ? new Date(body.actualStartAt)
          : null
        : row.actualStartAt;
    const actualEndAt =
      body.actualEndAt !== undefined
        ? body.actualEndAt
          ? new Date(body.actualEndAt)
          : null
        : row.actualEndAt;
    const rateType = body.rateType !== undefined ? body.rateType?.trim() || null : row.rateType;
    const rateAmount = body.rateAmount !== undefined ? decOrNull(body.rateAmount) : row.rateAmount;
    const plannedQuantity =
      body.plannedQuantity !== undefined ? decOrNull(body.plannedQuantity) : row.plannedQuantity;
    const actualQuantity =
      body.actualQuantity !== undefined ? decOrNull(body.actualQuantity) : row.actualQuantity;
    let plannedCost = body.plannedCost !== undefined ? decOrNull(body.plannedCost) : row.plannedCost;
    if (plannedCost == null && rateAmount) {
      plannedCost = computeStaffPlannedCost({
        rateType,
        rateAmount,
        plannedQuantity,
        plannedStartAt,
        plannedEndAt,
      });
    }
    let actualCost = body.actualCost !== undefined ? decOrNull(body.actualCost) : row.actualCost;
    if (actualCost == null && rateAmount && (actualStartAt || actualEndAt || actualQuantity)) {
      actualCost = computeStaffActualCost({
        rateType,
        rateAmount,
        plannedQuantity,
        actualQuantity,
        plannedStartAt,
        plannedEndAt,
        actualStartAt,
        actualEndAt,
      });
    }
    let roleLabel = body.roleLabel;
    if (body.operationalRoleId !== undefined || body.roleLabel !== undefined) {
      roleLabel = await this.operationalRoles.resolveRoleLabel(
        tenantId,
        body.operationalRoleId !== undefined ? body.operationalRoleId : row.operationalRoleId,
        body.roleLabel ?? row.roleLabel,
      );
    }
    return this.prisma.bchEventStaffAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(body.employeeId !== undefined ? { employeeId: body.employeeId?.trim() || null } : {}),
        ...(body.contractorName !== undefined ? { contractorName: body.contractorName?.trim() || null } : {}),
        ...(body.supplierId !== undefined ? { supplierId: body.supplierId?.trim() || null } : {}),
        ...(body.operationalRoleId !== undefined
          ? { operationalRoleId: body.operationalRoleId?.trim() || null }
          : {}),
        ...(roleLabel !== undefined ? { roleLabel } : {}),
        ...(body.responsibility !== undefined ? { responsibility: body.responsibility?.trim() || null } : {}),
        ...(body.locationLabel !== undefined ? { locationLabel: body.locationLabel?.trim() || null } : {}),
        ...(body.plannedStartAt !== undefined ? { plannedStartAt } : {}),
        ...(body.plannedEndAt !== undefined ? { plannedEndAt } : {}),
        ...(body.actualStartAt !== undefined ? { actualStartAt } : {}),
        ...(body.actualEndAt !== undefined ? { actualEndAt } : {}),
        ...(body.rateType !== undefined ? { rateType } : {}),
        ...(body.rateAmount !== undefined ? { rateAmount } : {}),
        ...(body.rateCurrency !== undefined ? { rateCurrency: body.rateCurrency?.trim()?.toUpperCase() || null } : {}),
        ...(body.plannedQuantity !== undefined ? { plannedQuantity } : {}),
        ...(body.actualQuantity !== undefined ? { actualQuantity } : {}),
        ...(body.plannedCost !== undefined || plannedCost !== row.plannedCost ? { plannedCost } : {}),
        ...(body.actualCost !== undefined || actualCost !== row.actualCost ? { actualCost } : {}),
        ...(body.paymentStatus !== undefined ? { paymentStatus: body.paymentStatus?.trim() || null } : {}),
        ...(body.status !== undefined ? { status: body.status.trim() } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    });
  }

  async cancelStaffAssignment(eventId: string, assignmentId: string) {
    return this.updateStaffAssignment(eventId, assignmentId, { status: 'cancelled' });
  }

  async updateServiceCommitment(
    eventId: string,
    commitmentId: string,
    body: Partial<{
      catalogServiceId: string | null;
      supplierId: string | null;
      description: string;
      quantity: number | string | null;
      plannedCost: number | string | null;
      actualCost: number | string | null;
      contractedAmount: number | string | null;
      operationalStatus: string;
      responsibleName: string | null;
      notes: string | null;
    }>,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const row = await this.prisma.bchEventServiceCommitment.findFirst({
      where: { id: commitmentId, tenantId, eventId: eventId.trim() },
    });
    if (!row) throw new NotFoundException('Serviço não encontrado.');
    if (row.operationalStatus === 'cancelled') {
      throw new BadRequestException('Serviço cancelado não pode ser editado.');
    }
    return this.prisma.bchEventServiceCommitment.update({
      where: { id: commitmentId },
      data: {
        ...(body.catalogServiceId !== undefined ? { catalogServiceId: body.catalogServiceId?.trim() || null } : {}),
        ...(body.supplierId !== undefined ? { supplierId: body.supplierId?.trim() || null } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() } : {}),
        ...(body.quantity !== undefined ? { quantity: decOrNull(body.quantity) } : {}),
        ...(body.plannedCost !== undefined ? { plannedCost: decOrNull(body.plannedCost) } : {}),
        ...(body.actualCost !== undefined ? { actualCost: decOrNull(body.actualCost) } : {}),
        ...(body.contractedAmount !== undefined ? { contractedAmount: decOrNull(body.contractedAmount) } : {}),
        ...(body.operationalStatus !== undefined ? { operationalStatus: body.operationalStatus.trim() } : {}),
        ...(body.responsibleName !== undefined ? { responsibleName: body.responsibleName?.trim() || null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    });
  }

  async cancelServiceCommitment(eventId: string, commitmentId: string) {
    return this.updateServiceCommitment(eventId, commitmentId, { operationalStatus: 'cancelled' });
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
