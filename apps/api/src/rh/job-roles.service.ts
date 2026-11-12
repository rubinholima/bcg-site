import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
import { assertRhTenantAccess } from './rh-scope.util';

@Injectable()
export class JobRolesService {
  constructor(private readonly prisma: PrismaService) {}

  private applyJobRoleTenantFilter(
    where: Prisma.JobRoleWhereInput,
    allowedTenantIds: string[] | null | undefined,
    requestedTenantId?: string,
  ): void {
    if (allowedTenantIds === null || allowedTenantIds === undefined) {
      if (requestedTenantId) where.tenantId = requestedTenantId;
      return;
    }
    if (requestedTenantId) {
      assertRhTenantAccess(allowedTenantIds, requestedTenantId);
      where.tenantId = requestedTenantId;
      return;
    }
    where.OR = [{ tenantId: null }, { tenantId: { in: allowedTenantIds } }];
  }

  async findAll(
    tenantId?: string,
    type?: string,
    forFootball?: boolean,
    allowedTenantIds: string[] | null = null,
  ) {
    const where: Prisma.JobRoleWhereInput = {};
    this.applyJobRoleTenantFilter(where, allowedTenantIds, tenantId);
    if (type?.trim()) where.type = type.trim();
    if (forFootball === true) where.forFootball = true;
    if (forFootball === false) where.forFootball = false;
    return this.prisma.jobRole.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const role = await this.prisma.jobRole.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
    if (!role) throw new NotFoundException('Cargo não encontrado');
    if (role.tenantId) assertRhTenantAccess(allowedTenantIds, role.tenantId);
    return role;
  }

  async create(dto: CreateJobRoleDto, allowedTenantIds: string[] | null = null) {
    assertRhTenantAccess(allowedTenantIds, dto.tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new NotFoundException('Departamento não encontrado');
    }
    return this.prisma.jobRole.create({
      data: {
        tenantId: dto.tenantId,
        departmentId: dto.departmentId ?? null,
        name: cadastroUpperRequired(dto.name),
        code: cadastroUpper(dto.code),
        type: dto.type,
        forFootball: dto.forFootball === true,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async update(id: string, dto: UpdateJobRoleDto, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    return this.prisma.jobRole.update({
      where: { id },
      data: {
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId ?? null }),
        ...(dto.name != null && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.code !== undefined && { code: cadastroUpper(dto.code) }),
        ...(dto.type != null && { type: dto.type }),
        ...(dto.forFootball !== undefined && { forFootball: dto.forFootball === true }),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async remove(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    await this.prisma.jobRole.delete({ where: { id } });
  }
}
