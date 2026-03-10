import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, type?: string, search?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (type?.trim()) where.type = type.trim();
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' as const } },
        { email: { contains: search.trim(), mode: 'insensitive' as const } },
        { cpf: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    return this.prisma.employee.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        employments: {
          include: {
            jobRole: { select: { id: true, name: true, type: true } },
            department: { select: { id: true, name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!emp) throw new NotFoundException('Colaborador não encontrado');
    return emp;
  }

  async create(dto: CreateEmployeeDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return this.prisma.employee.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        cpf: dto.cpf ?? null,
        rg: dto.rg ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        type: dto.type,
        categories: dto.categories != null ? dto.categories : Prisma.JsonNull,
        notes: dto.notes ?? null,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.cpf !== undefined && { cpf: dto.cpf ?? null }),
        ...(dto.rg !== undefined && { rg: dto.rg ?? null }),
        ...(dto.email !== undefined && { email: dto.email ?? null }),
        ...(dto.phone !== undefined && { phone: dto.phone ?? null }),
        ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
        ...(dto.type != null && { type: dto.type }),
        ...(dto.categories !== undefined && { categories: dto.categories ?? Prisma.JsonNull }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.employee.delete({ where: { id } });
  }
}
