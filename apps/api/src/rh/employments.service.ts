import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmploymentDto } from './dto/create-employment.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';
import { employeeVisibleInRhListFilter } from './rh-employee-visibility.util';
import { mergeBankDataJson, normalizeHolderCpf } from './employment-compensation.util';
import { EmploymentSalaryRevisionsService } from './employment-salary-revisions.service';

@Injectable()
export class EmploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salaryRevisions: EmploymentSalaryRevisionsService,
  ) {}

  async findAll(tenantId?: string, employeeId?: string, status?: string) {
    const where: Prisma.EmploymentWhereInput = {
      employee: employeeVisibleInRhListFilter,
    };
    if (tenantId) where.tenantId = tenantId;
    if (employeeId) where.employeeId = employeeId;
    if (status?.trim()) where.status = status.trim();
    return this.prisma.employment.findMany({
      where,
      orderBy: [{ startDate: 'desc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        employee: { select: { id: true, name: true, type: true, cpf: true, email: true } },
        jobRole: { select: { id: true, name: true, type: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const emp = await this.prisma.employment.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        employee: true,
        jobRole: true,
        department: true,
        leavePeriods: { orderBy: { startDate: 'desc' } },
        compensationItems: { orderBy: { effectiveFrom: 'desc' } },
        salaryRevisions: { orderBy: { effectiveFrom: 'desc' } },
      },
    });
    if (!emp) throw new NotFoundException('Vínculo não encontrado');
    return emp;
  }

  async create(dto: CreateEmploymentDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');
    const jobRole = await this.prisma.jobRole.findUnique({ where: { id: dto.jobRoleId } });
    if (!jobRole) throw new NotFoundException('Cargo não encontrado');
    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new NotFoundException('Departamento não encontrado');
    }
    const created = await this.prisma.employment.create({
      data: {
        tenantId: dto.tenantId,
        employeeId: dto.employeeId,
        jobRoleId: dto.jobRoleId,
        departmentId: dto.departmentId ?? null,
        contractType: cadastroUpperRequired(dto.contractType),
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        salaryBase: dto.salaryBase ?? null,
        bankData:
          dto.bankData != null
            ? this.normalizeBankDataInput(dto.bankData as Record<string, unknown>)
            : Prisma.JsonNull,
        status: dto.status ?? 'ativo',
        notes: cadastroUpper(dto.notes),
        athleteData: dto.athleteData != null ? (dto.athleteData as Prisma.InputJsonValue) : Prisma.JsonNull,
        admissionChecklist: dto.admissionChecklist != null ? (dto.admissionChecklist as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        employee: { select: { id: true, name: true, type: true, email: true } },
        jobRole: { select: { id: true, name: true, type: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (created.salaryBase != null && created.salaryBase > 0) {
      await this.salaryRevisions.createInitialIfNeeded(
        created.id,
        created.salaryBase,
        created.startDate,
      );
    }

    return created;
  }

  async update(id: string, dto: UpdateEmploymentDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.jobRoleId != null) data.jobRoleId = dto.jobRoleId;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId ?? null;
    if (dto.contractType != null) data.contractType = cadastroUpperRequired(dto.contractType);
    if (dto.startDate != null) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.salaryBase !== undefined) data.salaryBase = dto.salaryBase ?? null;
    if (dto.bankData !== undefined) {
      const current = await this.prisma.employment.findUnique({ where: { id }, select: { bankData: true } });
      data.bankData = this.normalizeBankDataInput(dto.bankData, current?.bankData);
    }
    if (dto.status != null) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = cadastroUpper(dto.notes);
    if (dto.athleteData !== undefined) data.athleteData = dto.athleteData ?? null;
    if (dto.admissionChecklist !== undefined) data.admissionChecklist = dto.admissionChecklist ?? null;
    if (dto.terminationType !== undefined) data.terminationType = cadastroUpper(dto.terminationType);
    if (dto.terminationNotes !== undefined) data.terminationNotes = cadastroUpper(dto.terminationNotes);
    if (dto.terminationChecklist !== undefined) data.terminationChecklist = dto.terminationChecklist ?? null;
    return this.prisma.employment.update({
      where: { id },
      data,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        employee: { select: { id: true, name: true, type: true } },
        jobRole: { select: { id: true, name: true, type: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.employment.delete({ where: { id } });
  }

  private normalizeBankDataInput(
    input: Record<string, unknown> | null | undefined,
    existing?: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (input == null) return Prisma.JsonNull;
    const merged = mergeBankDataJson(existing, {
      bank: typeof input.bank === 'string' ? input.bank.trim() : input.bank,
      agency: typeof input.agency === 'string' ? input.agency.trim() : input.agency,
      account: typeof input.account === 'string' ? input.account.trim() : input.account,
      accountType: typeof input.accountType === 'string' ? input.accountType.trim() : input.accountType,
      operation: typeof input.operation === 'string' ? input.operation.trim() : input.operation,
      pix: typeof input.pix === 'string' ? input.pix.trim() : input.pix,
      pixKeyType: typeof input.pixKeyType === 'string' ? input.pixKeyType.trim() : input.pixKeyType,
      holderName: typeof input.holderName === 'string' ? input.holderName.trim() : input.holderName,
      holderCpf: normalizeHolderCpf(typeof input.holderCpf === 'string' ? input.holderCpf : null),
    });
    return Object.keys(merged).length > 0 ? (merged as Prisma.InputJsonValue) : Prisma.JsonNull;
  }
}
