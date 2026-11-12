import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getCurrentSalary,
  periodsOverlap,
  startOfDay,
} from './employment-compensation.util';
import { CreateEmploymentSalaryRevisionDto } from './dto/employment-compensation.dto';
import { assertRhTenantAccess } from './rh-scope.util';
import { RhAuditService } from './rh-audit.service';
import type { RhActor } from './rh-request.util';

@Injectable()
export class EmploymentSalaryRevisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: RhAuditService,
  ) {}

  private async getEmployment(employmentId: string, allowedTenantIds: string[] | null = null) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: { salaryRevisions: { orderBy: { effectiveFrom: 'desc' } } },
    });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');
    assertRhTenantAccess(allowedTenantIds, employment.tenantId);
    return employment;
  }

  async findByEmployment(employmentId: string, allowedTenantIds: string[] | null = null) {
    const employment = await this.getEmployment(employmentId, allowedTenantIds);
    return employment.salaryRevisions;
  }

  async create(
    employmentId: string,
    dto: CreateEmploymentSalaryRevisionDto,
    allowedTenantIds: string[] | null = null,
    actor?: RhActor,
  ) {
    const employment = await this.getEmployment(employmentId, allowedTenantIds);
    const effectiveFrom = startOfDay(new Date(dto.effectiveFrom));
    const effectiveTo = dto.effectiveTo ? startOfDay(new Date(dto.effectiveTo)) : null;

    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('Data fim deve ser igual ou posterior à data início.');
    }

    const today = startOfDay(new Date());
    const openPrevious = employment.salaryRevisions.find(
      (r) => !r.effectiveTo && r.effectiveFrom < effectiveFrom,
    );
    if (openPrevious) {
      const dayBefore = new Date(effectiveFrom);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await this.prisma.employmentSalaryRevision.update({
        where: { id: openPrevious.id },
        data: { effectiveTo: dayBefore },
      });
      openPrevious.effectiveTo = dayBefore;
    }

    for (const rev of employment.salaryRevisions) {
      if (openPrevious && rev.id === openPrevious.id) continue;
      if (periodsOverlap(rev.effectiveFrom, rev.effectiveTo, effectiveFrom, effectiveTo)) {
        throw new BadRequestException('Já existe revisão salarial com período sobreposto.');
      }
    }

    const revision = await this.prisma.employmentSalaryRevision.create({
      data: {
        tenantId: employment.tenantId,
        employmentId,
        amount: dto.amount,
        effectiveFrom,
        effectiveTo,
      },
    });

    if (effectiveFrom <= today) {
      await this.prisma.employment.update({
        where: { id: employmentId },
        data: { salaryBase: dto.amount },
      });
    }

    if (actor) {
      await this.audit.log({
        tenantId: employment.tenantId,
        entityType: 'employment_salary_revision',
        entityId: revision.id,
        action: 'create',
        actorUserId: actor.userId,
        actorName: actor.name,
        metadata: { amount: dto.amount, effectiveFrom: dto.effectiveFrom },
      });
    }

    return revision;
  }

  async createInitialIfNeeded(employmentId: string, salaryBase: number, startDate: Date) {
    const count = await this.prisma.employmentSalaryRevision.count({ where: { employmentId } });
    if (count > 0 || salaryBase <= 0) return null;
    return this.prisma.employmentSalaryRevision.create({
      data: {
        tenantId: (await this.prisma.employment.findUniqueOrThrow({ where: { id: employmentId } })).tenantId,
        employmentId,
        amount: salaryBase,
        effectiveFrom: startOfDay(startDate),
      },
    });
  }

  async syncCurrentSalaryBase(employmentId: string) {
    const employment = await this.getEmployment(employmentId);
    const current = getCurrentSalary(employment.salaryRevisions, employment.salaryBase);
    if (current != null && current !== employment.salaryBase) {
      await this.prisma.employment.update({
        where: { id: employmentId },
        data: { salaryBase: current },
      });
    }
  }
}
