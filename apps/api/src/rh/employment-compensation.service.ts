import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isCompensationKind } from './employment-compensation.constants';
import {
  assertNoOverlapSameKind,
  endOfDay,
  startOfDay,
} from './employment-compensation.util';
import {
  CloseEmploymentCompensationItemDto,
  CreateEmploymentCompensationItemDto,
  UpdateEmploymentCompensationItemDto,
} from './dto/employment-compensation.dto';
import { assertRhTenantAccess } from './rh-scope.util';
import { RhAuditService } from './rh-audit.service';
import type { RhActor } from './rh-request.util';

@Injectable()
export class EmploymentCompensationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: RhAuditService,
  ) {}

  private async getEmployment(employmentId: string, allowedTenantIds: string[] | null = null) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: {
        employee: { select: { playerId: true } },
        compensationItems: { orderBy: { effectiveFrom: 'desc' } },
      },
    });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');
    assertRhTenantAccess(allowedTenantIds, employment.tenantId);
    return employment;
  }

  async findByEmployment(employmentId: string, allowedTenantIds: string[] | null = null) {
    const employment = await this.getEmployment(employmentId, allowedTenantIds);
    return employment.compensationItems;
  }

  async create(
    employmentId: string,
    dto: CreateEmploymentCompensationItemDto,
    allowedTenantIds: string[] | null = null,
    actor?: RhActor,
  ) {
    if (!isCompensationKind(dto.kind)) {
      throw new BadRequestException('Tipo de benefício inválido.');
    }
    const amount = dto.amount;
    if (amount <= 0) {
      throw new BadRequestException('Informe um valor maior que zero.');
    }

    const employment = await this.getEmployment(employmentId, allowedTenantIds);
    const effectiveFrom = startOfDay(new Date(dto.effectiveFrom));
    const effectiveTo = dto.effectiveTo ? startOfDay(new Date(dto.effectiveTo)) : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('Data fim deve ser igual ou posterior à data início.');
    }

    assertNoOverlapSameKind(
      employment.compensationItems,
      dto.kind,
      effectiveFrom,
      effectiveTo,
    );

    if (dto.legalDocumentId) {
      await this.assertLegalDocument(dto.legalDocumentId, employment.tenantId, employment.employee.playerId);
    }

    const item = await this.prisma.employmentCompensationItem.create({
      data: {
        tenantId: employment.tenantId,
        employmentId,
        kind: dto.kind,
        amount,
        effectiveFrom,
        effectiveTo,
        legalDocumentId: dto.legalDocumentId ?? null,
        notes: dto.notes?.trim() || null,
      },
    });

    if (actor) {
      await this.audit.log({
        tenantId: employment.tenantId,
        entityType: 'employment_compensation',
        entityId: item.id,
        action: 'create',
        actorUserId: actor.userId,
        actorName: actor.name,
      });
    }

    return item;
  }

  async update(id: string, dto: UpdateEmploymentCompensationItemDto, allowedTenantIds: string[] | null = null) {
    const existing = await this.prisma.employmentCompensationItem.findUnique({
      where: { id },
      include: { employment: { include: { employee: { select: { playerId: true } }, compensationItems: true } } },
    });
    if (!existing) throw new NotFoundException('Registro não encontrado');
    assertRhTenantAccess(allowedTenantIds, existing.tenantId);

    const effectiveFrom = dto.effectiveFrom
      ? startOfDay(new Date(dto.effectiveFrom))
      : existing.effectiveFrom;
    const effectiveTo =
      dto.effectiveTo !== undefined
        ? dto.effectiveTo
          ? startOfDay(new Date(dto.effectiveTo))
          : null
        : existing.effectiveTo;

    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('Data fim deve ser igual ou posterior à data início.');
    }

    assertNoOverlapSameKind(
      existing.employment.compensationItems,
      existing.kind as never,
      effectiveFrom,
      effectiveTo,
      id,
    );

    if (dto.legalDocumentId) {
      await this.assertLegalDocument(
        dto.legalDocumentId,
        existing.tenantId,
        existing.employment.employee.playerId,
      );
    }

    return this.prisma.employmentCompensationItem.update({
      where: { id },
      data: {
        amount: dto.amount ?? undefined,
        effectiveFrom: dto.effectiveFrom ? effectiveFrom : undefined,
        effectiveTo: dto.effectiveTo !== undefined ? effectiveTo : undefined,
        legalDocumentId: dto.legalDocumentId !== undefined ? dto.legalDocumentId : undefined,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
      },
    });
  }

  async close(id: string, dto: CloseEmploymentCompensationItemDto, allowedTenantIds: string[] | null = null) {
    const existing = await this.prisma.employmentCompensationItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Registro não encontrado');
    assertRhTenantAccess(allowedTenantIds, existing.tenantId);
    const effectiveTo = startOfDay(new Date(dto.effectiveTo));
    if (effectiveTo < startOfDay(existing.effectiveFrom)) {
      throw new BadRequestException('Data fim inválida.');
    }
    return this.prisma.employmentCompensationItem.update({
      where: { id },
      data: { effectiveTo: endOfDay(effectiveTo) },
    });
  }

  async remove(id: string, allowedTenantIds: string[] | null = null) {
    const existing = await this.prisma.employmentCompensationItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Registro não encontrado');
    assertRhTenantAccess(allowedTenantIds, existing.tenantId);
    await this.prisma.employmentCompensationItem.delete({ where: { id } });
    return { ok: true };
  }

  private async assertLegalDocument(
    legalDocumentId: string,
    tenantId: string,
    playerId: string | null,
  ) {
    const doc = await this.prisma.legalDocument.findUnique({
      where: { id: legalDocumentId },
      include: { player: { select: { tenantId: true } } },
    });
    if (!doc) throw new NotFoundException('Documento jurídico não encontrado');
    if (doc.type !== 'contrato_imagem') {
      throw new BadRequestException('Documento deve ser contrato de imagem.');
    }
    if (doc.player.tenantId !== tenantId) {
      throw new BadRequestException('Documento não pertence ao tenant do vínculo.');
    }
    if (playerId && doc.playerId !== playerId) {
      throw new BadRequestException('Documento não pertence ao atleta vinculado.');
    }
  }
}
