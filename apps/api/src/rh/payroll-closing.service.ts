import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FinanceiroLancamentosService } from '../financeiro/financeiro-lancamentos.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYROLL_STATUS,
  canTransitionPayroll,
} from './payroll-workflow.constants';
import { applyRhTenantFilter, assertRhTenantAccess } from './rh-scope.util';
import { RhAuditService } from './rh-audit.service';
import type { RhActor } from './rh-request.util';

@Injectable()
export class PayrollClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeiro: FinanceiroLancamentosService,
    private readonly audit: RhAuditService,
  ) {}

  async findAll(filters: { tenantId?: string; status?: string }, allowed: string[] | null) {
    const where: Prisma.RhPayrollClosingWhereInput = {};
    applyRhTenantFilter(where, allowed, filters.tenantId);
    if (filters.status?.trim()) where.status = filters.status.trim();
    return this.prisma.rhPayrollClosing.findMany({
      where,
      orderBy: [{ referenceMonth: 'desc' }],
      include: {
        tenant: { select: { id: true, name: true } },
        _count: { select: { employeeSnapshots: true, adjustments: true } },
      },
    });
  }

  async findOne(id: string, allowed: string[] | null) {
    const row = await this.prisma.rhPayrollClosing.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        employeeSnapshots: true,
        adjustments: true,
        accountingPackage: true,
        accountingHistory: { orderBy: { createdAt: 'desc' }, take: 30 },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    if (!row) throw new NotFoundException('Fechamento de folha não encontrado.');
    assertRhTenantAccess(allowed, row.tenantId);
    return row;
  }

  async create(
    dto: { tenantId: string; referenceMonth: string; notes?: string },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    assertRhTenantAccess(allowed, dto.tenantId);
    const referenceMonth = new Date(dto.referenceMonth);
    const created = await this.prisma.rhPayrollClosing.create({
      data: {
        tenantId: dto.tenantId,
        referenceMonth,
        status: PAYROLL_STATUS.PREPARING,
        responsibleUserId: actor.userId,
        responsibleName: actor.name,
        notes: dto.notes ?? null,
      },
    });
    await this.prisma.rhPayrollStatusHistory.create({
      data: {
        tenantId: dto.tenantId,
        payrollClosingId: created.id,
        fromStatus: null,
        toStatus: PAYROLL_STATUS.PREPARING,
        actorUserId: actor.userId,
        actorName: actor.name,
      },
    });
    return this.findOne(created.id, allowed);
  }

  async prepareSnapshots(id: string, allowed: string[] | null, actor: RhActor) {
    const closing = await this.findOne(id, allowed);
    const employments = await this.prisma.employment.findMany({
      where: { tenantId: closing.tenantId, status: 'ativo' },
      include: {
        employee: { select: { id: true, name: true, code: true } },
        jobRole: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        compensationItems: { where: { OR: [{ effectiveTo: null }, { effectiveTo: { gte: closing.referenceMonth } }] } },
        salaryRevisions: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
      },
    });
    await this.prisma.$transaction(async (tx) => {
      for (const emp of employments) {
        const snapshot = {
          employee: emp.employee,
          jobRole: emp.jobRole,
          department: emp.department,
          contractType: emp.contractType,
          salaryBase: emp.salaryBase,
          compensationItems: emp.compensationItems,
          salaryRevision: emp.salaryRevisions[0] ?? null,
          capturedAt: new Date().toISOString(),
        };
        await tx.rhPayrollEmployeeSnapshot.upsert({
          where: {
            payrollClosingId_employmentId: {
              payrollClosingId: id,
              employmentId: emp.id,
            },
          },
          create: {
            tenantId: closing.tenantId,
            payrollClosingId: id,
            employmentId: emp.id,
            employeeId: emp.employeeId,
            snapshot,
          },
          update: { snapshot },
        });
      }
    });
    await this.audit.log({
      tenantId: closing.tenantId,
      entityType: 'rh_payroll_closing',
      entityId: id,
      action: 'prepare_snapshots',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return this.findOne(id, allowed);
  }

  async transition(id: string, toStatus: string, allowed: string[] | null, actor: RhActor, notes?: string) {
    const row = await this.findOne(id, allowed);
    if (!canTransitionPayroll(row.status, toStatus)) {
      throw new BadRequestException('Transição de status da folha não permitida.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.rhPayrollClosing.update({ where: { id }, data: { status: toStatus } });
      await tx.rhPayrollStatusHistory.create({
        data: {
          tenantId: row.tenantId,
          payrollClosingId: id,
          fromStatus: row.status,
          toStatus,
          notes: notes ?? null,
          actorUserId: actor.userId,
          actorName: actor.name,
        },
      });
    });
    return this.findOne(id, allowed);
  }

  async createAdjustment(
    id: string,
    dto: {
      employmentId: string;
      adjustmentType: string;
      amount?: number;
      hours?: number;
      days?: number;
      quantity?: number;
      reason?: string;
      notes?: string;
    },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const closing = await this.findOne(id, allowed);
    const employment = await this.prisma.employment.findFirst({
      where: { id: dto.employmentId, tenantId: closing.tenantId },
    });
    if (!employment) throw new NotFoundException('Vínculo não encontrado nesta empresa.');
    return this.prisma.rhPayrollAdjustment.create({
      data: {
        tenantId: closing.tenantId,
        payrollClosingId: id,
        employmentId: dto.employmentId,
        adjustmentType: dto.adjustmentType.trim(),
        amount: dto.amount != null ? new Prisma.Decimal(dto.amount) : null,
        hours: dto.hours != null ? new Prisma.Decimal(dto.hours) : null,
        days: dto.days != null ? new Prisma.Decimal(dto.days) : null,
        quantity: dto.quantity != null ? new Prisma.Decimal(dto.quantity) : null,
        reason: dto.reason ?? null,
        notes: dto.notes ?? null,
        createdByUserId: actor.userId,
        createdByName: actor.name,
      },
    });
  }

  async sendAccountingPackage(
    id: string,
    dto: { recipient?: string; notes?: string },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const closing = await this.findOne(id, allowed);
    const pkg = await this.prisma.rhPayrollAccountingPackage.upsert({
      where: { payrollClosingId: id },
      create: {
        tenantId: closing.tenantId,
        payrollClosingId: id,
        status: 'enviado',
        packageData: {
          snapshots: closing.employeeSnapshots,
          adjustments: closing.adjustments,
        },
      },
      update: {
        status: 'enviado',
        packageData: {
          snapshots: closing.employeeSnapshots,
          adjustments: closing.adjustments,
        },
      },
    });
    await this.prisma.rhPayrollAccountingPackageHistory.create({
      data: {
        tenantId: closing.tenantId,
        payrollClosingId: id,
        packageId: pkg.id,
        action: 'envio',
        sentByUserId: actor.userId,
        sentByName: actor.name,
        sentAt: new Date(),
        recipient: dto.recipient ?? null,
        notes: dto.notes ?? null,
      },
    });
    await this.transition(id, PAYROLL_STATUS.SENT_ACCOUNTING, allowed, actor);
    return this.findOne(id, allowed);
  }

  async returnAccountingPackage(
    id: string,
    dto: { notes?: string; correctionRequired?: boolean },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const closing = await this.findOne(id, allowed);
    const pkg = closing.accountingPackage;
    if (!pkg) throw new BadRequestException('Nenhum pacote contábil registrado.');
    await this.prisma.rhPayrollAccountingPackageHistory.create({
      data: {
        tenantId: closing.tenantId,
        payrollClosingId: id,
        packageId: pkg.id,
        action: 'retorno',
        receivedAt: new Date(),
        receivedByUserId: actor.userId,
        receivedByName: actor.name,
        notes: dto.notes ?? null,
        correctionRequired: dto.correctionRequired ?? false,
      },
    });
    const next = dto.correctionRequired
      ? PAYROLL_STATUS.CORRECTION
      : PAYROLL_STATUS.RETURN_RECEIVED;
    await this.transition(id, next, allowed, actor, dto.notes);
    return this.findOne(id, allowed);
  }

  async handoffFinance(id: string, allowed: string[] | null, actor: RhActor) {
    const closing = await this.findOne(id, allowed);
    const total = closing.adjustments.reduce(
      (acc, adj) => acc + (adj.amount ? Number(adj.amount) : 0),
      0,
    );
    const { lancamento } = await this.financeiro.createOrGetProjection({
      tenantId: closing.tenantId,
      tipo: 'pagar',
      status: 'pendente',
      ownershipKind: 'projection',
      sourceModule: 'rh_payroll',
      sourceType: 'payroll_closing',
      sourceId: closing.id,
      valor: total > 0 ? total : 0.01,
      dueDate: closing.referenceMonth.toISOString(),
      descricao: `Folha ${closing.referenceMonth.toISOString().slice(0, 7)}`,
    });
    await this.prisma.rhPayrollClosing.update({
      where: { id },
      data: {
        financeLancamentoId: lancamento.id as string,
        status: PAYROLL_STATUS.SENT_FINANCE,
      },
    });
    await this.audit.log({
      tenantId: closing.tenantId,
      entityType: 'rh_payroll_closing',
      entityId: id,
      action: 'finance_handoff',
      actorUserId: actor.userId,
      actorName: actor.name,
      metadata: { financeLancamentoId: lancamento.id },
    });
    return this.findOne(id, allowed);
  }
}
