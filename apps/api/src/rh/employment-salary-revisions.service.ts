import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getCurrentSalary,
  periodsOverlap,
  startOfDay,
} from './employment-compensation.util';
import { CreateEmploymentSalaryRevisionDto } from './dto/employment-compensation.dto';

@Injectable()
export class EmploymentSalaryRevisionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getEmployment(employmentId: string) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: { salaryRevisions: { orderBy: { effectiveFrom: 'desc' } } },
    });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');
    return employment;
  }

  async findByEmployment(employmentId: string) {
    const employment = await this.getEmployment(employmentId);
    return employment.salaryRevisions;
  }

  async create(employmentId: string, dto: CreateEmploymentSalaryRevisionDto) {
    const employment = await this.getEmployment(employmentId);
    const effectiveFrom = startOfDay(new Date(dto.effectiveFrom));
    const effectiveTo = dto.effectiveTo ? startOfDay(new Date(dto.effectiveTo)) : null;

    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('Data fim deve ser igual ou posterior à data início.');
    }

    for (const rev of employment.salaryRevisions) {
      if (periodsOverlap(rev.effectiveFrom, rev.effectiveTo, effectiveFrom, effectiveTo)) {
        throw new BadRequestException('Já existe revisão salarial com período sobreposto.');
      }
    }

    const today = startOfDay(new Date());
    const openPrevious = employment.salaryRevisions.find((r) => !r.effectiveTo && r.effectiveFrom < effectiveFrom);
    if (openPrevious) {
      const dayBefore = new Date(effectiveFrom);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await this.prisma.employmentSalaryRevision.update({
        where: { id: openPrevious.id },
        data: { effectiveTo: dayBefore },
      });
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
