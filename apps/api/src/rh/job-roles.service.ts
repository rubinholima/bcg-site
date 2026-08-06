import { Injectable, NotFoundException } from '@nestjs/common';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';

@Injectable()
export class JobRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, type?: string, forFootball?: boolean) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (type?.trim()) where.type = type.trim();
    if (forFootball === true) where.forFootball = true;
    if (forFootball === false) where.forFootball = false;
    return this.prisma.jobRole.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.jobRole.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
    if (!role) throw new NotFoundException('Cargo não encontrado');
    return role;
  }

  async create(dto: CreateJobRoleDto) {
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

  async update(id: string, dto: UpdateJobRoleDto) {
    await this.findOne(id);
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

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.jobRole.delete({ where: { id } });
  }
}
