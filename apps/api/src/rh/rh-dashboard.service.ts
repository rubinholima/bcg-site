import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HIRING_ACTIVE_STATUSES } from './hiring-workflow.constants';
import { applyRhTenantFilter } from './rh-scope.util';
import { employeeVisibleInRhListFilter } from './rh-employee-visibility.util';

export type RhDashboardKpis = {
  employees: number;
  activeEmployments: number;
  pendingHiring: number;
  medicalPending: number;
  legalPending: number;
  accountingPending: number;
};

@Injectable()
export class RhDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(
    tenantId: string | undefined,
    allowedTenantIds: string[] | null,
  ): Promise<RhDashboardKpis> {
    const empWhere: Prisma.EmployeeWhereInput = { ...employeeVisibleInRhListFilter };
    applyRhTenantFilter(empWhere, allowedTenantIds, tenantId);

    const emplWhere: Prisma.EmploymentWhereInput = {
      status: 'ativo',
      employee: employeeVisibleInRhListFilter,
    };
    applyRhTenantFilter(emplWhere, allowedTenantIds, tenantId);

    const hiringWhere: Prisma.RhHiringRequestWhereInput = {
      status: { in: HIRING_ACTIVE_STATUSES },
    };
    applyRhTenantFilter(hiringWhere, allowedTenantIds, tenantId);

    const [employees, activeEmployments, pendingHiring, medicalPending, legalPending, accountingPending] =
      await Promise.all([
        this.prisma.employee.count({ where: empWhere }),
        this.prisma.employment.count({ where: emplWhere }),
        this.prisma.rhHiringRequest.count({ where: hiringWhere }),
        this.prisma.rhHiringRequest.count({
          where: { ...hiringWhere, status: 'exame_agendado' },
        }),
        this.prisma.rhHiringRequest.count({
          where: { ...hiringWhere, status: 'juridico' },
        }),
        this.prisma.rhHiringRequest.count({
          where: { ...hiringWhere, status: 'contabilidade' },
        }),
      ]);

    return {
      employees,
      activeEmployments,
      pendingHiring,
      medicalPending,
      legalPending,
      accountingPending,
    };
  }
}
