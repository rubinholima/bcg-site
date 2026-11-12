import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEmployeeDependentDto,
  SyncEmployeeDependentsDto,
  UpdateEmployeeDependentDto,
} from './dto/employee-dependent.dto';
import { normalizeDependentName } from './employee-documentation.util';
import { assertRhTenantAccess } from './rh-scope.util';

@Injectable()
export class EmployeeDependentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployee(employeeId: string, allowedTenantIds: string[] | null = null) {
    await this.ensureEmployee(employeeId, allowedTenantIds);
    return this.prisma.employeeDependent.findMany({
      where: { employeeId },
      orderBy: { birthDate: 'asc' },
    });
  }

  async create(employeeId: string, dto: CreateEmployeeDependentDto, allowedTenantIds: string[] | null = null) {
    await this.ensureEmployee(employeeId, allowedTenantIds);
    return this.prisma.employeeDependent.create({
      data: {
        employeeId,
        name: normalizeDependentName(dto.name),
        birthDate: new Date(dto.birthDate),
        birthCertificateFileUrl: dto.birthCertificateFileUrl?.trim() || null,
        schoolAttendanceFileUrl: dto.schoolAttendanceFileUrl?.trim() || null,
        vaccinationCardFileUrl: dto.vaccinationCardFileUrl?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateEmployeeDependentDto, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    return this.prisma.employeeDependent.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: normalizeDependentName(dto.name) }),
        ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.birthCertificateFileUrl !== undefined && {
          birthCertificateFileUrl: dto.birthCertificateFileUrl?.trim() || null,
        }),
        ...(dto.schoolAttendanceFileUrl !== undefined && {
          schoolAttendanceFileUrl: dto.schoolAttendanceFileUrl?.trim() || null,
        }),
        ...(dto.vaccinationCardFileUrl !== undefined && {
          vaccinationCardFileUrl: dto.vaccinationCardFileUrl?.trim() || null,
        }),
      },
    });
  }

  async remove(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    await this.prisma.employeeDependent.delete({ where: { id } });
  }

  /** Substitui todos os dependentes do colaborador (sync no save do formulário). */
  async sync(employeeId: string, dto: SyncEmployeeDependentsDto, allowedTenantIds: string[] | null = null) {
    await this.ensureEmployee(employeeId, allowedTenantIds);
    await this.prisma.employeeDependent.deleteMany({ where: { employeeId } });
    if (!dto.dependents?.length) return [];

    const created = await Promise.all(
      dto.dependents.map((dep) =>
        this.prisma.employeeDependent.create({
          data: {
            employeeId,
            name: normalizeDependentName(dep.name),
            birthDate: new Date(dep.birthDate),
            birthCertificateFileUrl: dep.birthCertificateFileUrl?.trim() || null,
            schoolAttendanceFileUrl: dep.schoolAttendanceFileUrl?.trim() || null,
            vaccinationCardFileUrl: dep.vaccinationCardFileUrl?.trim() || null,
          },
        }),
      ),
    );
    return created;
  }

  private async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const dep = await this.prisma.employeeDependent.findUnique({
      where: { id },
      include: { employee: { select: { tenantId: true } } },
    });
    if (!dep) throw new NotFoundException('Dependente não encontrado');
    assertRhTenantAccess(allowedTenantIds, dep.employee.tenantId);
    return dep;
  }

  private async ensureEmployee(employeeId: string, allowedTenantIds: string[] | null = null) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');
    assertRhTenantAccess(allowedTenantIds, employee.tenantId);
    return employee;
  }
}
