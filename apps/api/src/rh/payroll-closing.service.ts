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
import { RhAthleteMovementService } from './rh-athlete-movement.service';
import { enrichPayrollSnapshotWithResponsibility } from './rh-athlete-payroll-snapshot.util';
import type { RhActor } from './rh-request.util';

@Injectable()
export class PayrollClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeiro: FinanceiroLancamentosService,
    private readonly audit: RhAuditService,
    private readonly athleteMovement: RhAthleteMovementService,
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
        let snapshot: Record<string, unknown> = {
          employee: emp.employee,
          jobRole: emp.jobRole,
          department: emp.department,
          contractType: emp.contractType,
          salaryBase: emp.salaryBase,
          compensationItems: emp.compensationItems,
          salaryRevision: emp.salaryRevisions[0] ?? null,
          capturedAt: new Date().toISOString(),
        };
        const salaryBase = emp.salaryBase ?? 0;
        const responsibility = await this.athleteMovement.enrichSalaryForSnapshot(
          emp.id,
          closing.referenceMonth,
          salaryBase,
        );
        if (responsibility) {
          snapshot = enrichPayrollSnapshotWithResponsibility(snapshot, {
            contractualSalary: salaryBase,
            mode: responsibility.mode,
            ourPercentage: responsibility.ourPercentage,
            otherPercentage: responsibility.otherPercentage,
            impactType: 'loan',
          });
        }
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
            snapshot: snapshot as Prisma.InputJsonValue,
          },
          update: { snapshot: snapshot as Prisma.InputJsonValue },
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

  async listOccurrencesForMonth(id: string, allowed: string[] | null) {
    const closing = await this.findOne(id, allowed);
    const monthStart = new Date(closing.referenceMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    return this.prisma.rhTimeOccurrence.findMany({
      where: {
        tenantId: closing.tenantId,
        occurrenceDate: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { occurrenceDate: 'asc' },
      take: 500,
    });
  }

  async listDocuments(id: string, allowed: string[] | null) {
    const closing = await this.findOne(id, allowed);
    return this.prisma.rhPayrollDocument.findMany({
      where: { payrollClosingId: id, tenantId: closing.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFinanceStatus(id: string, allowed: string[] | null) {
    const closing = await this.findOne(id, allowed);
    if (!closing.financeLancamentoId) {
      return { linked: false as const, status: null, id: null };
    }
    const lanc = await this.prisma.financeiroLancamento.findFirst({
      where: { id: closing.financeLancamentoId, tenantId: closing.tenantId },
      select: { id: true, status: true, valor: true, dueDate: true },
    });
    return {
      linked: true as const,
      id: lanc?.id ?? closing.financeLancamentoId,
      status: lanc?.status ?? null,
      valor: lanc?.valor != null ? Number(lanc.valor) : null,
      dueDate: lanc?.dueDate ?? null,
    };
  }

  async updateAdjustment(
    closingId: string,
    adjustmentId: string,
    dto: Partial<{
      adjustmentType: string;
      amount: number;
      hours: number;
      days: number;
      quantity: number;
      reason: string;
      notes: string;
    }>,
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const closing = await this.findOne(closingId, allowed);
    const adj = await this.prisma.rhPayrollAdjustment.findFirst({
      where: { id: adjustmentId, payrollClosingId: closingId, tenantId: closing.tenantId },
    });
    if (!adj) throw new NotFoundException('Ajuste não encontrado.');
    return this.prisma.rhPayrollAdjustment.update({
      where: { id: adjustmentId },
      data: {
        adjustmentType: dto.adjustmentType?.trim() ?? adj.adjustmentType,
        amount: dto.amount != null ? new Prisma.Decimal(dto.amount) : adj.amount,
        hours: dto.hours != null ? new Prisma.Decimal(dto.hours) : adj.hours,
        days: dto.days != null ? new Prisma.Decimal(dto.days) : adj.days,
        quantity: dto.quantity != null ? new Prisma.Decimal(dto.quantity) : adj.quantity,
        reason: dto.reason !== undefined ? dto.reason : adj.reason,
        notes: dto.notes !== undefined ? dto.notes : adj.notes,
      },
    });
  }

  async deleteAdjustment(closingId: string, adjustmentId: string, allowed: string[] | null) {
    const closing = await this.findOne(closingId, allowed);
    const adj = await this.prisma.rhPayrollAdjustment.findFirst({
      where: { id: adjustmentId, payrollClosingId: closingId, tenantId: closing.tenantId },
    });
    if (!adj) throw new NotFoundException('Ajuste não encontrado.');
    await this.prisma.rhPayrollAdjustment.delete({ where: { id: adjustmentId } });
    return { ok: true };
  }

  async prepareAccountingSend(id: string, allowed: string[] | null, actor: RhActor) {
    await this.transition(id, PAYROLL_STATUS.READY_ACCOUNTING, allowed, actor);
    return this.findOne(id, allowed);
  }

  async requestAccountingCorrection(id: string, allowed: string[] | null, actor: RhActor, notes?: string) {
    return this.transition(id, PAYROLL_STATUS.CORRECTION, allowed, actor, notes);
  }

  async approveAccountingReturn(id: string, allowed: string[] | null, actor: RhActor, notes?: string) {
    await this.transition(id, PAYROLL_STATUS.RH_APPROVED, allowed, actor, notes);
    return this.findOne(id, allowed);
  }

  async resendAccounting(id: string, allowed: string[] | null, actor: RhActor, dto: { recipient?: string; notes?: string }) {
    return this.sendAccountingPackage(id, dto, allowed, actor);
  }

  async getSnapshotComposition(closingId: string, snapshotId: string, allowed: string[] | null) {
    const closing = await this.findOne(closingId, allowed);
    const snapshot = closing.employeeSnapshots.find((s) => s.id === snapshotId);
    if (!snapshot) throw new NotFoundException('Snapshot do colaborador não encontrado.');
    const adjustments = closing.adjustments.filter((a) => a.employmentId === snapshot.employmentId);
    const snap = (snapshot.snapshot ?? {}) as Record<string, unknown>;
    const salaryBase = Number(snap.salaryBase ?? 0);
    const ourPayrollAmount = Number(
      (snap.athleteMovement as { ourPayrollAmount?: number } | undefined)?.ourPayrollAmount ?? salaryBase,
    );
    const items = (snap.compensationItems as Array<{ type?: string; amount?: number | string }> | undefined) ?? [];
    const benefitsTotal = items.reduce((acc, item) => acc + Number(item.amount ?? 0), 0);
    const adjustmentsTotal = adjustments.reduce((acc, adj) => acc + (adj.amount ? Number(adj.amount) : 0), 0);
    const estimatedTotal = ourPayrollAmount + benefitsTotal + adjustmentsTotal;
    return {
      closingId,
      snapshotId,
      employmentId: snapshot.employmentId,
      employeeId: snapshot.employeeId,
      snapshot: snap,
      adjustments,
      composition: {
        salaryBase,
        benefitsTotal,
        ourPayrollAmount,
        adjustmentsTotal,
        estimatedTotal,
      },
    };
  }
}
