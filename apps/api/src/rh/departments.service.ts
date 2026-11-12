import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { applyRhTenantFilter, assertRhTenantAccess } from './rh-scope.util';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, allowedTenantIds: string[] | null = null) {
    const where: Prisma.DepartmentWhereInput = {};
    applyRhTenantFilter(where, allowedTenantIds, tenantId);
    return this.prisma.department.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!dept) throw new NotFoundException('Departamento não encontrado');
    assertRhTenantAccess(allowedTenantIds, dept.tenantId);
    return dept;
  }

  async create(dto: CreateDepartmentDto, allowedTenantIds: string[] | null = null) {
    assertRhTenantAccess(allowedTenantIds, dto.tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return this.prisma.department.create({
      data: {
        tenantId: dto.tenantId,
        name: cadastroUpperRequired(dto.name),
        code: cadastroUpper(dto.code),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.code !== undefined && { code: cadastroUpper(dto.code) }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    await this.prisma.department.delete({ where: { id } });
  }
}
