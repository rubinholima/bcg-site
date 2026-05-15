import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmploymentDto } from './dto/create-employment.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';

@Injectable()
export class EmploymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, employeeId?: string, status?: string) {
    const where: Record<string, unknown> = {};
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
    return this.prisma.employment.create({
      data: {
        tenantId: dto.tenantId,
        employeeId: dto.employeeId,
        jobRoleId: dto.jobRoleId,
        departmentId: dto.departmentId ?? null,
        contractType: cadastroUpperRequired(dto.contractType),
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        salaryBase: dto.salaryBase ?? null,
        bankData: dto.bankData != null ? (dto.bankData as Prisma.InputJsonValue) : Prisma.JsonNull,
        status: dto.status ?? 'ativo',
        notes: cadastroUpper(dto.notes),
        athleteData: dto.athleteData != null ? (dto.athleteData as Prisma.InputJsonValue) : Prisma.JsonNull,
        admissionChecklist: dto.admissionChecklist != null ? (dto.admissionChecklist as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        employee: { select: { id: true, name: true, type: true } },
        jobRole: { select: { id: true, name: true, type: true } },
        department: { select: { id: true, name: true } },
      },
    });
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
    if (dto.bankData !== undefined) data.bankData = dto.bankData ?? null;
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
}
