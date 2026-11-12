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
  payrollPreparing: number;
  payrollAwaitingAccounting: number;
  payrollAwaitingFinance: number;
  timeOccurrencesOpen: number;
  athleteLoanImpact: number;
  athleteReturning: number;
  salaryResponsibilityPending: number;
  epiPending: number;
  epiReplacementDue: number;
  payslipsToSplit: number;
  payslipsAwaitingAck: number;
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

    const payrollWhere: Prisma.RhPayrollClosingWhereInput = {};
    applyRhTenantFilter(payrollWhere, allowedTenantIds, tenantId);

    const [
      employees,
      activeEmployments,
      pendingHiring,
      medicalPending,
      legalPending,
      accountingPending,
      payrollPreparing,
      payrollAwaitingAccounting,
      payrollAwaitingFinance,
      timeOccurrencesOpen,
      athleteLoanImpact,
      athleteReturning,
      salaryResponsibilityPending,
      epiPending,
      epiReplacementDue,
      payslipsToSplit,
      payslipsAwaitingAck,
    ] = await Promise.all([
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
      this.prisma.rhPayrollClosing.count({
        where: { ...payrollWhere, status: { in: ['em_preparacao', 'em_conferencia'] } },
      }),
      this.prisma.rhPayrollClosing.count({
        where: {
          ...payrollWhere,
          status: { in: ['enviado_contabilidade', 'aguardando_retorno', 'correcao_necessaria'] },
        },
      }),
      this.prisma.rhPayrollClosing.count({
        where: { ...payrollWhere, status: 'encaminhado_financeiro' },
      }),
      this.prisma.rhTimeOccurrence.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          processedAt: null,
        },
      }),
      this.prisma.rhAthleteHrPendingAction.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          status: 'pendente',
          actionType: { in: ['payroll_impact', 'employment_review'] },
        },
      }),
      this.prisma.rhAthleteHrPendingAction.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          status: 'pendente',
          actionType: 'loan_return_review',
        },
      }),
      this.prisma.rhAthleteHrPendingAction.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          status: 'pendente',
          title: { contains: 'responsabilidade', mode: 'insensitive' },
        },
      }),
      this.prisma.rhEpiAcknowledgement.count({
        where: { ...(tenantId ? { tenantId } : {}), status: 'pendente' },
      }),
      this.prisma.rhEpiDelivery.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          expectedReturnAt: { lte: new Date() },
          status: 'ENTREGUE',
        },
      }),
      this.prisma.rhPayslipBatch.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          status: { in: ['PENDENTE_DE_SEPARACAO', 'SEPARADO', 'EM_CONFERENCIA'] },
        },
      }),
      this.prisma.rhPayslipAcknowledgement.count({
        where: { ...(tenantId ? { tenantId } : {}), status: 'CIENCIA_PENDENTE' },
      }),
    ]);

    return {
      employees,
      activeEmployments,
      pendingHiring,
      medicalPending,
      legalPending,
      accountingPending,
      payrollPreparing,
      payrollAwaitingAccounting,
      payrollAwaitingFinance,
      timeOccurrencesOpen,
      athleteLoanImpact,
      athleteReturning,
      salaryResponsibilityPending,
      epiPending,
      epiReplacementDue,
      payslipsToSplit,
      payslipsAwaitingAck,
    };
  }
}
