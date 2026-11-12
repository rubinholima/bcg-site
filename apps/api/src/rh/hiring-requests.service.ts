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
  documentChecklist: { orderBy: { sortOrder: 'asc' as const } },
  accountingHandoffHistory: { orderBy: { createdAt: 'desc' as const }, take: 20 },
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
      if (
        to === HIRING_STATUS.SENT_ACCOUNTING ||
        to === HIRING_STATUS.READY_ACCOUNTING
      ) {
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

  async listChecklist(id: string, allowedTenantIds: string[] | null) {
    await this.findOne(id, allowedTenantIds);
    return this.prisma.rhHiringDocumentChecklistItem.findMany({
      where: { hiringRequestId: id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async upsertChecklistItem(
    id: string,
    body: {
      documentType: string;
      label: string;
      required?: boolean;
      status?: string;
      employeeDocumentId?: string | null;
      notes?: string | null;
      sortOrder?: number;
    },
    allowedTenantIds: string[] | null,
  ) {
    const row = await this.findOne(id, allowedTenantIds);
    const existing = await this.prisma.rhHiringDocumentChecklistItem.findFirst({
      where: { hiringRequestId: id, documentType: body.documentType.trim() },
    });
    if (existing) {
      return this.prisma.rhHiringDocumentChecklistItem.update({
        where: { id: existing.id },
        data: {
          label: body.label.trim(),
          required: body.required ?? existing.required,
          status: body.status?.trim() ?? existing.status,
          employeeDocumentId: body.employeeDocumentId ?? existing.employeeDocumentId,
          notes: body.notes ?? existing.notes,
          sortOrder: body.sortOrder ?? existing.sortOrder,
        },
      });
    }
    return this.prisma.rhHiringDocumentChecklistItem.create({
      data: {
        tenantId: row.tenantId,
        hiringRequestId: id,
        documentType: body.documentType.trim(),
        label: body.label.trim(),
        required: body.required ?? true,
        status: body.status?.trim() || 'pendente',
        employeeDocumentId: body.employeeDocumentId ?? null,
        notes: body.notes ?? null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  async prepareAccountingHandoff(
    id: string,
    allowedTenantIds: string[] | null,
    actor: RhActor,
  ) {
    const row = await this.findOne(id, allowedTenantIds);
    const checklist = await this.listChecklist(id, allowedTenantIds);
    return {
      hiring: row,
      checklist,
      documentsSelected: checklist
        .filter((c) => c.status === 'recebido' && c.employeeDocumentId)
        .map((c) => c.employeeDocumentId),
    };
  }

  async sendAccountingHandoff(
    id: string,
    dto: { recipient?: string; notes?: string; documentIds?: string[] },
    allowedTenantIds: string[] | null,
    actor: RhActor,
  ) {
    const row = await this.findOne(id, allowedTenantIds);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.rhHiringAccountingHandoff.upsert({
        where: { hiringRequestId: id },
        create: {
          tenantId: row.tenantId,
          hiringRequestId: id,
          status: 'enviado',
          completedAt: null,
          notes: dto.notes ?? null,
        },
        update: { status: 'enviado', notes: dto.notes ?? null },
      });
      await tx.rhHiringAccountingHandoffHistory.create({
        data: {
          tenantId: row.tenantId,
          hiringRequestId: id,
          action: 'envio',
          sentByUserId: actor.userId,
          sentByName: actor.name,
          sentAt: now,
          recipient: dto.recipient?.trim() || null,
          notes: dto.notes ?? null,
          documentIds: dto.documentIds ?? [],
        },
      });
      if (row.status !== HIRING_STATUS.SENT_ACCOUNTING) {
        await tx.rhHiringRequest.update({
          where: { id },
          data: { status: HIRING_STATUS.SENT_ACCOUNTING },
        });
      }
    });
    return this.findOne(id, allowedTenantIds);
  }

  async returnAccountingHandoff(
    id: string,
    dto: {
      notes?: string;
      correctionRequired?: boolean;
      status?: string;
    },
    allowedTenantIds: string[] | null,
    actor: RhActor,
  ) {
    const row = await this.findOne(id, allowedTenantIds);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.rhHiringAccountingHandoff.update({
        where: { hiringRequestId: id },
        data: {
          status: dto.correctionRequired ? 'correcao' : 'retorno_recebido',
          completedAt: dto.correctionRequired ? null : now,
          notes: dto.notes ?? undefined,
        },
      });
      await tx.rhHiringAccountingHandoffHistory.create({
        data: {
          tenantId: row.tenantId,
          hiringRequestId: id,
          action: 'retorno',
          receivedByUserId: actor.userId,
          receivedByName: actor.name,
          receivedAt: now,
          notes: dto.notes ?? null,
          status: dto.status ?? (dto.correctionRequired ? 'correcao' : 'ok'),
          correctionRequired: dto.correctionRequired ?? false,
        },
      });
      const next = dto.correctionRequired
        ? HIRING_STATUS.CORRECTION_REQUESTED
        : HIRING_STATUS.ACCOUNTING_RETURN;
      await tx.rhHiringRequest.update({ where: { id }, data: { status: next } });
    });
    return this.findOne(id, allowedTenantIds);
  }

  async forwardLegal(
    id: string,
    dto: { noTemplate?: boolean; notes?: string },
    allowedTenantIds: string[] | null,
    actor: RhActor,
  ) {
    const row = await this.findOne(id, allowedTenantIds);
    await this.prisma.$transaction(async (tx) => {
      await tx.rhHiringLegalHandoff.upsert({
        where: { hiringRequestId: id },
        create: {
          tenantId: row.tenantId,
          hiringRequestId: id,
          status: 'encaminhado',
          notes: dto.notes ?? null,
          metadata: {
            noTemplate: dto.noTemplate === true,
            label:
              dto.noTemplate === true
                ? 'Contrato sem modelo — elaboração necessária'
                : 'Encaminhado ao Jurídico',
          },
        },
        update: {
          status: 'encaminhado',
          notes: dto.notes ?? undefined,
          metadata: {
            noTemplate: dto.noTemplate === true,
            label:
              dto.noTemplate === true
                ? 'Contrato sem modelo — elaboração necessária'
                : 'Encaminhado ao Jurídico',
          },
        },
      });
      await tx.rhHiringRequest.update({
        where: { id },
        data: { status: HIRING_STATUS.LEGAL_FORWARDED },
      });
    });
    return this.findOne(id, allowedTenantIds);
  }

  async activateEmployment(
    id: string,
    dto: { confirmDuplicate?: boolean },
    allowedTenantIds: string[] | null,
    actor: RhActor,
  ) {
    const row = await this.findOne(id, allowedTenantIds);
    if (row.employmentId) {
      return this.findOne(id, allowedTenantIds);
    }
    if (!row.employeeId || !row.jobRoleId) {
      throw new BadRequestException('Vincule colaborador e cargo antes de ativar o vínculo.');
    }
  const active = await this.prisma.employment.findFirst({
      where: { employeeId: row.employeeId, tenantId: row.tenantId, status: 'ativo' },
    });
    if (active && !dto.confirmDuplicate) {
      throw new BadRequestException(
        'Já existe vínculo ativo para este colaborador. Envie confirmDuplicate=true para prosseguir.',
      );
    }
    const employment = await this.prisma.employment.create({
      data: {
        tenantId: row.tenantId,
        employeeId: row.employeeId,
        jobRoleId: row.jobRoleId,
        departmentId: row.departmentId,
        contractType: row.contractType,
        startDate: row.proposedStartDate ?? new Date(),
        salaryBase: row.proposedSalary ? Number(row.proposedSalary) : null,
        status: 'ativo',
      },
    });
    await this.prisma.rhHiringRequest.update({
      where: { id },
      data: { employmentId: employment.id, status: HIRING_STATUS.COMPLETED },
    });
    await this.logAudit({
      tenantId: row.tenantId,
      entityType: 'rh_hiring_request',
      entityId: id,
      action: 'activate_employment',
      actorUserId: actor.userId,
      actorName: actor.name,
      metadata: { employmentId: employment.id },
    });
    return this.findOne(id, allowedTenantIds);
  }

  private async logAudit(input: RhAuditInput) {
    await this.audit.log(input);
  }
}
