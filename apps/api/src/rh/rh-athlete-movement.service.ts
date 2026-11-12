import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PlayerNegotiation, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RhAuditService } from './rh-audit.service';
import { RhNotificationService } from './rh-notification.service';
import {
  computeOurPayrollAmount,
  normalizeSalaryResponsibilityMode,
  validateSalaryResponsibilityPercentages,
} from './rh-athlete-salary-responsibility.util';
import type { RhActor } from './rh-request.util';
import { assertRhTenantAccess } from './rh-scope.util';

const RELEVANT_TYPES = new Set(['loan', 'transfer_permanent', 'mixed', 'partial_rights']);

@Injectable()
export class RhAthleteMovementService {
  private readonly log = new Logger(RhAthleteMovementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: RhNotificationService,
    private readonly audit: RhAuditService,
  ) {}

  async handleNegotiationUpsert(negotiation: PlayerNegotiation): Promise<void> {
    if (!RELEVANT_TYPES.has(negotiation.negotiationType)) return;
    const employee = await this.prisma.employee.findFirst({
      where: { playerId: negotiation.playerId, tenantId: negotiation.tenantId },
      include: {
        employments: { where: { status: 'ativo' }, orderBy: { startDate: 'desc' }, take: 1 },
      },
    });
    if (!employee) return;

    const employment = employee.employments[0];
    const impactType = this.mapImpactType(negotiation);

    const impactExisting = await this.prisma.rhAthletePayrollImpact.findFirst({
      where: { playerNegotiationId: negotiation.id },
    });
  const impactData = {
      employeeId: employee.id,
      employmentId: employment?.id,
      impactType,
      status: negotiation.status === 'effective' ? 'ativo' : 'pendente',
      effectiveFrom: negotiation.effectiveFrom,
      effectiveUntil: negotiation.effectiveUntil ?? negotiation.loanEndDate,
      metadata: { negotiationStatus: negotiation.status } as Prisma.InputJsonValue,
    };
    if (impactExisting) {
      await this.prisma.rhAthletePayrollImpact.update({
        where: { id: impactExisting.id },
        data: impactData,
      });
    } else {
      await this.prisma.rhAthletePayrollImpact.create({
        data: {
          tenantId: negotiation.tenantId,
          playerId: negotiation.playerId,
          playerNegotiationId: negotiation.id,
          ...impactData,
        },
      });
    }

    if (negotiation.status === 'effective' || negotiation.status === 'agreed') {
      await this.ensurePendingAction(negotiation, employee.id, employment?.id, impactType);
      await this.notifyDeduped(negotiation, impactType, employee.name);
    }

    if (negotiation.negotiationType === 'loan' && negotiation.status === 'expired') {
      await this.handleLoanReturn(negotiation, employee.id, employment?.id);
    }
  }

  private mapImpactType(n: PlayerNegotiation): string {
    if (n.negotiationType === 'loan') return 'loan';
    if (n.negotiationType === 'transfer_permanent' || n.negotiationType === 'partial_rights') {
      return 'transfer';
    }
    return 'mixed';
  }

  private async ensurePendingAction(
    negotiation: PlayerNegotiation,
    employeeId: string,
    employmentId: string | undefined,
    impactType: string,
  ) {
    const title =
      impactType === 'loan'
        ? 'Revisar impacto RH — empréstimo de atleta'
        : impactType === 'transfer'
          ? 'Revisar vínculo — transferência/venda de atleta'
          : 'Revisar movimentação de atleta';
    const existing = await this.prisma.rhAthleteHrPendingAction.findFirst({
      where: {
        playerNegotiationId: negotiation.id,
        status: 'pendente',
        actionType: impactType === 'transfer' ? 'employment_review' : 'payroll_impact',
      },
    });
    if (existing) return;
    await this.prisma.rhAthleteHrPendingAction.create({
      data: {
        tenantId: negotiation.tenantId,
        playerId: negotiation.playerId,
        employeeId,
        employmentId,
        playerNegotiationId: negotiation.id,
        actionType: impactType === 'transfer' ? 'employment_review' : 'payroll_impact',
        title,
        notes: negotiation.counterpartyName,
        dueAt: negotiation.loanEndDate ?? negotiation.effectiveUntil,
      },
    });
  }

  private async handleLoanReturn(
    negotiation: PlayerNegotiation,
    employeeId: string,
    employmentId: string | undefined,
  ) {
    await this.prisma.rhAthleteHrPendingAction.create({
      data: {
        tenantId: negotiation.tenantId,
        playerId: negotiation.playerId,
        employeeId,
        employmentId,
        playerNegotiationId: negotiation.id,
        actionType: 'loan_return_review',
        title: 'Retorno de empréstimo — revisar folha e vínculo',
        dueAt: new Date(),
      },
    });
    await this.notifyDeduped(negotiation, 'loan_return', undefined);
  }

  private async notifyDeduped(
    negotiation: PlayerNegotiation,
    kind: string,
    employeeName?: string,
  ) {
    const dedupKey = `${kind}:${negotiation.id}:${negotiation.status}`;
    try {
      await this.prisma.rhAthleteMovementNotificationDedup.create({
        data: {
          tenantId: negotiation.tenantId,
          dedupKey,
          playerNegotiationId: negotiation.id,
        },
      });
    } catch {
      return;
    }
    const label = employeeName ? ` (${employeeName})` : '';
    await this.notifications.notifyRhEvent({
      tenantId: negotiation.tenantId,
      title: 'RH — movimentação de atleta',
      message: `Nova ação pendente para negociação ${negotiation.negotiationType}${label}.`,
      type: 'warning',
    });
  }

  async createSalaryResponsibility(
    dto: {
      employmentId: string;
      playerNegotiationId?: string;
      mode: string;
      ourPercentage?: number;
      otherPercentage?: number;
      effectiveFrom: string;
      effectiveUntil?: string | null;
      notes?: string;
      documentRef?: string;
    },
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: dto.employmentId },
      include: { employee: true },
    });
    if (!employment) throw new BadRequestException('Vínculo não encontrado.');
    assertRhTenantAccess(allowed, employment.tenantId);

    const mode = normalizeSalaryResponsibilityMode(dto.mode);
    const { our, other } = validateSalaryResponsibilityPercentages(
      mode,
      dto.ourPercentage,
      dto.otherPercentage,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.playerNegotiationId) {
        await tx.rhAthleteSalaryResponsibility.updateMany({
          where: {
            employmentId: dto.employmentId,
            playerNegotiationId: dto.playerNegotiationId,
            active: true,
          },
          data: { active: false, effectiveUntil: new Date(dto.effectiveFrom) },
        });
      }
      return tx.rhAthleteSalaryResponsibility.create({
        data: {
          tenantId: employment.tenantId,
          employmentId: dto.employmentId,
          playerNegotiationId: dto.playerNegotiationId ?? null,
          mode,
          ourPercentage: new Prisma.Decimal(our),
          otherPercentage: new Prisma.Decimal(other),
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
          notes: dto.notes ?? null,
          documentRef: dto.documentRef ?? null,
        },
      });
    });

    await this.prisma.rhAthleteSalaryResponsibilityHistory.create({
      data: {
        tenantId: employment.tenantId,
        responsibilityId: created.id,
        action: 'created',
        snapshot: {
          mode,
          ourPercentage: our,
          otherPercentage: other,
          effectiveFrom: dto.effectiveFrom,
        },
        actorUserId: actor.userId,
        actorName: actor.name,
      },
    });

    await this.audit.log({
      tenantId: employment.tenantId,
      entityType: 'rh_athlete_salary_responsibility',
      entityId: created.id,
      action: 'created',
      actorUserId: actor.userId,
      actorName: actor.name,
      metadata: { mode, ourPercentage: our, otherPercentage: other },
    });

    return created;
  }

  async acknowledgePendingAction(
    actionId: string,
    allowed: string[] | null,
    actor: RhActor,
  ) {
    const row = await this.prisma.rhAthleteHrPendingAction.findUnique({ where: { id: actionId } });
    if (!row) throw new BadRequestException('Ação não encontrada.');
    assertRhTenantAccess(allowed, row.tenantId);
    const updated = await this.prisma.rhAthleteHrPendingAction.update({
      where: { id: actionId },
      data: {
        status: 'concluido',
        acknowledgedAt: new Date(),
        acknowledgedByUserId: actor.userId,
        acknowledgedByName: actor.name,
      },
    });
    await this.audit.log({
      tenantId: row.tenantId,
      entityType: 'rh_athlete_pending_action',
      entityId: actionId,
      action: 'acknowledged',
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return updated;
  }

  async resolveActiveResponsibilityForEmployment(
    employmentId: string,
    onDate: Date,
  ): Promise<{
    mode: string;
    ourPercentage: number;
    otherPercentage: number;
  } | null> {
    const row = await this.prisma.rhAthleteSalaryResponsibility.findFirst({
      where: {
        employmentId,
        active: true,
        effectiveFrom: { lte: onDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: onDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!row) return null;
    return {
      mode: row.mode,
      ourPercentage: row.ourPercentage ? Number(row.ourPercentage) : 0,
      otherPercentage: row.otherPercentage ? Number(row.otherPercentage) : 0,
    };
  }

  async enrichSalaryForSnapshot(employmentId: string, referenceMonth: Date, salaryBase: number) {
    const resp = await this.resolveActiveResponsibilityForEmployment(employmentId, referenceMonth);
    if (!resp) return null;
    const ourPayrollAmount = computeOurPayrollAmount(salaryBase, resp.ourPercentage);
    return {
      ...resp,
      contractualSalary: salaryBase,
      ourPayrollAmount,
    };
  }
}
