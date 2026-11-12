import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import {
  canTransition,
  HIRING_STATUS,
  type HiringStatus,
} from './hiring-workflow.constants';
import {
  CreateRhHiringRequestDto,
  TransitionRhHiringStatusDto,
  UpdateRhHiringRequestDto,
} from './dto/hiring-request.dto';
import { assertRhTenantAccess, applyRhTenantFilter } from './rh-scope.util';
import { RhAuditService, type RhAuditInput } from './rh-audit.service';
import type { RhActor } from './rh-request.util';

const includeFull = {
  tenant: { select: { id: true, name: true, slug: true } },
  jobRole: { select: { id: true, name: true, type: true } },
  department: { select: { id: true, name: true } },
  statusHistory: { orderBy: { createdAt: 'desc' as const }, take: 30 },
  medicalExam: true,
  accountingHandoff: true,
  legalHandoff: true,
  employee: { select: { id: true, name: true, code: true } },
  employment: { select: { id: true, status: true, contractType: true } },
} as const;

@Injectable()
export class HiringRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: RhAuditService,
  ) {}

  async findAll(
    filters: { tenantId?: string; status?: string },
    allowedTenantIds: string[] | null = null,
  ) {
    const where: Prisma.RhHiringRequestWhereInput = {};
    applyRhTenantFilter(where, allowedTenantIds, filters.tenantId);
    if (filters.status?.trim()) where.status = filters.status.trim();
    return this.prisma.rhHiringRequest.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      include: includeFull,
    });
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const row = await this.prisma.rhHiringRequest.findUnique({
      where: { id },
      include: includeFull,
    });
    if (!row) throw new NotFoundException('Solicitação de contratação não encontrada.');
    assertRhTenantAccess(allowedTenantIds, row.tenantId);
    return row;
  }

  async create(
    dto: CreateRhHiringRequestDto,
    allowedTenantIds: string[] | null,
    actor: RhActor,
  ) {
    assertRhTenantAccess(allowedTenantIds, dto.tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada.');

    const created = await this.prisma.rhHiringRequest.create({
      data: {
        tenantId: dto.tenantId,
        candidateName: cadastroUpperRequired(dto.candidateName),
        candidateCpf: cadastroUpper(dto.candidateCpf),
        candidateEmail: dto.candidateEmail?.trim() || null,
        candidatePhone: cadastroUpper(dto.candidatePhone),
        contractType: cadastroUpperRequired(dto.contractType),
        status: HIRING_STATUS.DRAFT,
        jobRoleId: dto.jobRoleId ?? null,
        departmentId: dto.departmentId ?? null,
        playerId: dto.playerId ?? null,
        proposedSalary:
          dto.proposedSalary != null ? new Prisma.Decimal(dto.proposedSalary) : null,
        proposedStartDate: dto.proposedStartDate ? new Date(dto.proposedStartDate) : null,
        notes: cadastroUpper(dto.notes),
        requestedByUserId: actor.userId,
        requestedByName: actor.name,
      },
      include: includeFull,
    });

    await this.logAudit({
      tenantId: created.tenantId,
      entityType: 'rh_hiring_request',
      entityId: created.id,
      action: 'create',
      actorUserId: actor.userId,
      actorName: actor.name,
    });

    await this.prisma.rhHiringStatusHistory.create({
      data: {
        tenantId: created.tenantId,
        hiringRequestId: created.id,
        fromStatus: null,
        toStatus: HIRING_STATUS.DRAFT,
        actorUserId: actor.userId,
        actorName: actor.name,
        notes: 'Criação da solicitação',
      },
    });

    return this.findOne(created.id, allowedTenantIds);
  }

  async update(
    id: string,
    dto: UpdateRhHiringRequestDto,
    allowedTenantIds: string[] | null,
    actor: RhActor,
  ) {
    const existing = await this.findOne(id, allowedTenantIds);
    if (existing.status !== HIRING_STATUS.DRAFT) {
      throw new BadRequestException('Só é possível editar solicitações em rascunho.');
    }
    await this.prisma.rhHiringRequest.update({
      where: { id },
      data: {
        ...(dto.candidateName != null && { candidateName: cadastroUpperRequired(dto.candidateName) }),
        ...(dto.candidateCpf !== undefined && { candidateCpf: cadastroUpper(dto.candidateCpf) }),
        ...(dto.candidateEmail !== undefined && { candidateEmail: dto.candidateEmail?.trim() || null }),
        ...(dto.candidatePhone !== undefined && { candidatePhone: cadastroUpper(dto.candidatePhone) }),
        ...(dto.jobRoleId !== undefined && { jobRoleId: dto.jobRoleId ?? null }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId ?? null }),
        ...(dto.playerId !== undefined && { playerId: dto.playerId ?? null }),
        ...(dto.proposedSalary !== undefined && {
          proposedSalary:
            dto.proposedSalary != null ? new Prisma.Decimal(dto.proposedSalary) : null,
        }),
        ...(dto.proposedStartDate !== undefined && {
          proposedStartDate: dto.proposedStartDate ? new Date(dto.proposedStartDate) : null,
        }),
        ...(dto.notes !== undefined && { notes: cadastroUpper(dto.notes) }),
      },
    });

    await this.logAudit({
      tenantId: existing.tenantId,
      entityType: 'rh_hiring_request',
      entityId: id,
      action: 'update',
      actorUserId: actor.userId,
      actorName: actor.name,
    });

    return this.findOne(id, allowedTenantIds);
  }

  async transition(
    id: string,
    dto: TransitionRhHiringStatusDto,
    allowedTenantIds: string[] | null,
    actor: RhActor,
  ) {
    const existing = await this.findOne(id, allowedTenantIds);
    const to = dto.toStatus.trim() as HiringStatus;
    if (!canTransition(existing.contractType, existing.status, to)) {
      throw new BadRequestException('Transição de status não permitida para este tipo de contrato.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rhHiringRequest.update({
        where: { id },
        data: { status: to },
      });
      await tx.rhHiringStatusHistory.create({
        data: {
          tenantId: existing.tenantId,
          hiringRequestId: id,
          fromStatus: existing.status,
          toStatus: to,
          notes: dto.notes ?? null,
          actorUserId: actor.userId,
          actorName: actor.name,
        },
      });

      if (to === HIRING_STATUS.MEDICAL_SCHEDULED) {
        await tx.rhHiringMedicalExam.upsert({
          where: { hiringRequestId: id },
          create: { tenantId: existing.tenantId, hiringRequestId: id },
          update: {},
        });
      }
      if (to === HIRING_STATUS.LEGAL_REVIEW) {
        await tx.rhHiringLegalHandoff.upsert({
          where: { hiringRequestId: id },
          create: { tenantId: existing.tenantId, hiringRequestId: id },
          update: {},
        });
      }
      if (to === HIRING_STATUS.ACCOUNTING) {
        await tx.rhHiringAccountingHandoff.upsert({
          where: { hiringRequestId: id },
          create: { tenantId: existing.tenantId, hiringRequestId: id },
          update: {},
        });
      }
    });

    await this.logAudit({
      tenantId: existing.tenantId,
      entityType: 'rh_hiring_request',
      entityId: id,
      action: 'status_change',
      actorUserId: actor.userId,
      actorName: actor.name,
      metadata: { from: existing.status, to },
    });

    return this.findOne(id, allowedTenantIds);
  }

  private async logAudit(input: RhAuditInput) {
    await this.audit.log(input);
  }
}
