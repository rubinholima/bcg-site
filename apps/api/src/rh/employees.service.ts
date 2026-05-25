import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroEmail, cadastroJsonStringArray, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  createPlayerFromEmployee,
  generateEmployeeCode,
  syncPlayerFromEmployee,
  unlinkPlayerFromEmployee,
} from './employee-player-link';

const employeeInclude = {
  tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
  player: { select: { id: true, name: true, category: true, position: true } },
} as const;

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
        { code: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    return this.prisma.employee.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: employeeInclude,
    });
  }

  async findOne(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        ...employeeInclude,
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

  async findByPlayerId(playerId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { playerId },
      include: employeeInclude,
    });
    if (!emp) throw new NotFoundException('Colaborador RH não encontrado para este atleta');
    return emp;
  }

  async create(dto: CreateEmployeeDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const code = await generateEmployeeCode(this.prisma, dto.tenantId);
    const employee = await this.prisma.employee.create({
      data: {
        tenantId: dto.tenantId,
        code,
        name: cadastroUpperRequired(dto.name),
        cpf: cadastroUpper(dto.cpf),
        rg: cadastroUpper(dto.rg),
        email: cadastroEmail(dto.email),
        phone: cadastroUpper(dto.phone),
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        type: dto.type,
        categories: dto.categories != null ? cadastroJsonStringArray(dto.categories) : Prisma.JsonNull,
        notes: cadastroUpper(dto.notes),
        photoUrl: dto.photoUrl?.trim() || null,
      },
      include: { ...employeeInclude, tenant: { select: { id: true, name: true, slug: true } } },
    });

    if (dto.playerId?.trim()) {
      await syncPlayerFromEmployee(this.prisma, employee, dto.playerId.trim());
      return this.findOne(employee.id);
    }

    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.cpf !== undefined && { cpf: cadastroUpper(dto.cpf) }),
        ...(dto.rg !== undefined && { rg: cadastroUpper(dto.rg) }),
        ...(dto.email !== undefined && { email: cadastroEmail(dto.email) }),
        ...(dto.phone !== undefined && { phone: cadastroUpper(dto.phone) }),
        ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
        ...(dto.type != null && { type: dto.type }),
        ...(dto.categories !== undefined && { categories: cadastroJsonStringArray(dto.categories) }),
        ...(dto.notes !== undefined && { notes: cadastroUpper(dto.notes) }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl?.trim() || null }),
      },
      include: employeeInclude,
    });

    if (dto.playerId !== undefined) {
      if (dto.playerId === null || dto.playerId === '') {
        await unlinkPlayerFromEmployee(this.prisma, id);
      } else if (dto.playerId !== existing.playerId) {
        await syncPlayerFromEmployee(this.prisma, updated, dto.playerId);
      } else if (existing.playerId) {
        await syncPlayerFromEmployee(this.prisma, updated, existing.playerId);
      }
      return this.findOne(id);
    }

    if (existing.playerId) {
      await syncPlayerFromEmployee(this.prisma, updated, existing.playerId);
    }

    return updated;
  }

  async linkPlayer(id: string, playerId: string) {
    const employee = await this.findOne(id);
    await syncPlayerFromEmployee(this.prisma, employee, playerId);
    return this.findOne(id);
  }

  async createPlayer(id: string) {
    const employee = await this.findOne(id);
    const player = await createPlayerFromEmployee(this.prisma, employee);
    return { employee: await this.findOne(id), player };
  }

  async unlinkPlayer(id: string) {
    await this.findOne(id);
    await unlinkPlayerFromEmployee(this.prisma, id);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.employee.delete({ where: { id } });
  }
}
