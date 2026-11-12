import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RhAuditService } from './rh-audit.service';
import type { RhActor } from './rh-request.util';
import { applyRhTenantFilter, assertRhTenantAccess } from './rh-scope.util';

@Injectable()
export class RhEpiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: RhAuditService,
  ) {}

  async listCatalog(tenantId: string | undefined, allowed: string[] | null) {
    const where: Prisma.RhEpiCatalogItemWhereInput = {};
    applyRhTenantFilter(where, allowed, tenantId);
    return this.prisma.rhEpiCatalogItem.findMany({ where, orderBy: { name: 'asc' } });
  }

  async upsertCatalogItem(
    dto: {
      id?: string;
      tenantId: string;
      code: string;
      name: string;
      description?: string;
      category?: string;
      unit?: string;
      active?: boolean;
      validityNotes?: string;
      replacementInfo?: string;
      notes?: string;
    },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    assertRhTenantAccess(allowed, dto.tenantId);
    const data = {
      code: dto.code.trim(),
      name: dto.name.trim(),
      description: dto.description ?? null,
      category: dto.category ?? null,
      unit: dto.unit ?? null,
      active: dto.active ?? true,
      validityNotes: dto.validityNotes ?? null,
      replacementInfo: dto.replacementInfo ?? null,
      notes: dto.notes ?? null,
    };
    const row = dto.id
      ? await this.prisma.rhEpiCatalogItem.update({ where: { id: dto.id }, data })
      : await this.prisma.rhEpiCatalogItem.create({ data: { tenantId: dto.tenantId, ...data } });
    await this.audit.log({
      tenantId: dto.tenantId,
      entityType: 'rh_epi_catalog',
      entityId: row.id,
      action: dto.id ? 'updated' : 'created',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return row;
  }

  async listRequirementGroups(tenantId: string | undefined, allowed: string[] | null) {
    const where: Prisma.RhEpiRequirementGroupWhereInput = { active: true };
    applyRhTenantFilter(where, allowed, tenantId);
    return this.prisma.rhEpiRequirementGroup.findMany({
      where,
      include: { items: { include: { catalogItem: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async createRequirementGroup(
    dto: {
      tenantId: string;
      name: string;
      scopeType: string;
      departmentId?: string;
      jobRoleId?: string;
      workCategory?: string;
      effectiveFrom: string;
      effectiveTo?: string | null;
      items: Array<{ catalogItemId: string; quantity?: number; required?: boolean }>;
    },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    assertRhTenantAccess(allowed, dto.tenantId);
    const group = await this.prisma.rhEpiRequirementGroup.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name.trim(),
        scopeType: dto.scopeType.trim(),
        departmentId: dto.departmentId ?? null,
        jobRoleId: dto.jobRoleId ?? null,
        workCategory: dto.workCategory ?? null,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        items: {
          create: dto.items.map((i, idx) => ({
            tenantId: dto.tenantId,
            catalogItemId: i.catalogItemId,
            quantity: i.quantity != null ? new Prisma.Decimal(i.quantity) : null,
            required: i.required ?? true,
            sortOrder: idx,
          })),
        },
      },
      include: { items: { include: { catalogItem: true } } },
    });
    await this.audit.log({
      tenantId: dto.tenantId,
      entityType: 'rh_epi_requirement_group',
      entityId: group.id,
      action: 'created',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return group;
  }

  async createDelivery(
    dto: {
      employeeId: string;
      employmentId?: string;
      catalogItemId: string;
      quantity: number;
      deliveryDate: string;
      status?: string;
      notes?: string;
      expectedReturnAt?: string | null;
    },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');
    assertRhTenantAccess(allowed, employee.tenantId);
    const delivery = await this.prisma.rhEpiDelivery.create({
      data: {
        tenantId: employee.tenantId,
        employeeId: dto.employeeId,
        employmentId: dto.employmentId ?? null,
        catalogItemId: dto.catalogItemId,
        quantity: new Prisma.Decimal(dto.quantity),
        deliveryDate: new Date(dto.deliveryDate),
        status: dto.status?.trim() || 'ENTREGUE',
        notes: dto.notes ?? null,
        expectedReturnAt: dto.expectedReturnAt ? new Date(dto.expectedReturnAt) : null,
        deliveredByUserId: actor.userId,
        deliveredByName: actor.name,
      },
      include: { catalogItem: true },
    });
    await this.prisma.rhEpiAcknowledgement.create({
      data: { tenantId: employee.tenantId, deliveryId: delivery.id, status: 'pendente' },
    });
    await this.audit.log({
      tenantId: employee.tenantId,
      entityType: 'rh_epi_delivery',
      entityId: delivery.id,
      action: 'delivered',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return delivery;
  }

  async acknowledgeDelivery(deliveryId: string, allowed: string[] | null, actor: RhActor) {
    const delivery = await this.prisma.rhEpiDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Entrega não encontrada.');
    assertRhTenantAccess(allowed, delivery.tenantId);
    const ack = await this.prisma.rhEpiAcknowledgement.updateMany({
      where: { deliveryId },
      data: { status: 'reconhecido', acknowledgedAt: new Date(), method: 'interno' },
    });
    if (!ack.count) throw new BadRequestException('Ciência não encontrada.');
    await this.audit.log({
      tenantId: delivery.tenantId,
      entityType: 'rh_epi_acknowledgement',
      entityId: deliveryId,
      action: 'acknowledged',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return { ok: true };
  }

  async listDeliveries(tenantId: string | undefined, allowed: string[] | null) {
    const where: Prisma.RhEpiDeliveryWhereInput = {};
    applyRhTenantFilter(where, allowed, tenantId);
    return this.prisma.rhEpiDelivery.findMany({
      where,
      orderBy: { deliveryDate: 'desc' },
      include: {
        catalogItem: true,
        employee: { select: { id: true, name: true, code: true } },
        acknowledgements: true,
      },
      take: 300,
    });
  }

  async updateDeliveryStatus(
    deliveryId: string,
    dto: { status: string; notes?: string },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const delivery = await this.prisma.rhEpiDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Entrega não encontrada.');
    assertRhTenantAccess(allowed, delivery.tenantId);
    const updated = await this.prisma.rhEpiDelivery.update({
      where: { id: deliveryId },
      data: {
        status: dto.status.trim(),
        notes: dto.notes !== undefined ? dto.notes : delivery.notes,
      },
      include: { catalogItem: true, employee: { select: { id: true, name: true } } },
    });
    await this.audit.log({
      tenantId: delivery.tenantId,
      entityType: 'rh_epi_delivery',
      entityId: deliveryId,
      action: `status_${dto.status.trim()}`,
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return updated;
  }

  async employeeEpiSummary(employeeId: string, allowed: string[] | null) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employments: { where: { status: 'ativo' }, take: 1, include: { jobRole: true, department: true } },
      },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');
    assertRhTenantAccess(allowed, employee.tenantId);
    const employment = employee.employments[0];
    const deliveries = await this.prisma.rhEpiDelivery.findMany({
      where: { employeeId },
      include: { catalogItem: true, acknowledgements: true },
      orderBy: { deliveryDate: 'desc' },
      take: 50,
    });
    const reqWhere: Prisma.RhEpiRequirementGroupWhereInput = {
      tenantId: employee.tenantId,
      active: true,
      OR: [
        employment?.departmentId ? { departmentId: employment.departmentId } : {},
        employment?.jobRoleId ? { jobRoleId: employment.jobRoleId } : {},
        { scopeType: 'geral' },
      ],
    };
    const requiredGroups = await this.prisma.rhEpiRequirementGroup.findMany({
      where: reqWhere,
      include: { items: { include: { catalogItem: true } } },
    });
    const deliveredIds = new Set(deliveries.map((d) => d.catalogItemId));
    const missing = requiredGroups
      .flatMap((g) => g.items)
      .filter((i) => i.required && !deliveredIds.has(i.catalogItemId))
      .map((i) => i.catalogItem);
    return { deliveries, requiredGroups, missing };
  }
}
