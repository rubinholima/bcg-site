import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroEmail, cadastroJsonStringArray, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  createEmployeeFromPlayer,
  createPlayerFromEmployee,
  generateEmployeeCode,
  syncLinkedIdentityBidirectional,
  syncPlayerFromEmployee,
  unlinkPlayerFromEmployee,
} from './employee-player-link';
import { employeeDocumentationCreate, employeeDocumentationPatch } from './employee-documentation.util';
import { employeeVisibleInRhListFilter } from './rh-employee-visibility.util';
import { applyRhTenantFilter, assertRhTenantAccess } from './rh-scope.util';

const employeeInclude = {
  tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
  player: { select: { id: true, name: true, category: true, position: true } },
  dependents: { orderBy: { birthDate: 'asc' as const } },
} as const;

export type RhDuplicateWarning = {
  code: 'cpf_duplicate' | 'player_link_duplicate';
  message: string;
  employeeId?: string;
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId?: string,
    type?: string,
    search?: string,
    allowedTenantIds: string[] | null = null,
  ) {
    const where: Prisma.EmployeeWhereInput = {
      ...employeeVisibleInRhListFilter,
    };
    applyRhTenantFilter(where, allowedTenantIds, tenantId);
    if (type?.trim()) where.type = type.trim();
    if (search?.trim()) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' as const } },
            { email: { contains: search.trim(), mode: 'insensitive' as const } },
            { cpf: { contains: search.trim(), mode: 'insensitive' as const } },
            { code: { contains: search.trim(), mode: 'insensitive' as const } },
          ],
        },
      ];
    }
    return this.prisma.employee.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: employeeInclude,
    });
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        ...employeeInclude,
        employments: {
          include: {
            jobRole: { select: { id: true, name: true, type: true } },
            department: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!emp) throw new NotFoundException('Colaborador não encontrado');
    assertRhTenantAccess(allowedTenantIds, emp.tenantId);
    return emp;
  }

  async getUnifiedProfile(id: string, allowedTenantIds: string[] | null = null) {
    const employee = await this.findOne(id, allowedTenantIds);
    const [documents, hiringRequests, athleteContracts] = await Promise.all([
      this.prisma.employeeDocument.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rhHiringRequest.findMany({
        where: {
          OR: [
            { employeeId: id },
            ...(employee.cpf
              ? [{ candidateCpf: { equals: employee.cpf, mode: 'insensitive' as const } }]
              : []),
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 25,
        include: {
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      }),
      employee.playerId
        ? this.prisma.athleteContract.findMany({
            where: { playerId: employee.playerId, tenantId: employee.tenantId },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              clubName: true,
              employmentContractId: true,
            },
          })
        : Promise.resolve([]),
    ]);
    return {
      employee,
      documents,
      dependents: employee.dependents,
      employments: employee.employments,
      hiringRequests,
      athleteContracts,
    };
  }

  async findByPlayerId(playerId: string, allowedTenantIds: string[] | null = null) {
    const emp = await this.prisma.employee.findFirst({
      where: { playerId },
      include: employeeInclude,
    });
    if (!emp) throw new NotFoundException('Colaborador RH não encontrado para este atleta');
    assertRhTenantAccess(allowedTenantIds, emp.tenantId);
    return emp;
  }

  private async duplicateWarnings(
    tenantId: string,
    cpf?: string | null,
    playerId?: string | null,
    excludeEmployeeId?: string,
  ): Promise<RhDuplicateWarning[]> {
    const warnings: RhDuplicateWarning[] = [];
    const cpfNorm = cpf?.trim();
    if (cpfNorm) {
      const dup = await this.prisma.employee.findFirst({
        where: {
          tenantId,
          cpf: { equals: cpfNorm, mode: 'insensitive' },
          ...(excludeEmployeeId ? { NOT: { id: excludeEmployeeId } } : {}),
        },
        select: { id: true, name: true, code: true },
      });
      if (dup) {
        warnings.push({
          code: 'cpf_duplicate',
          message: `Já existe colaborador com este CPF (${dup.name}${dup.code ? ` — ${dup.code}` : ''}).`,
          employeeId: dup.id,
        });
      }
    }
    const pid = playerId?.trim();
    if (pid) {
      const dupP = await this.prisma.employee.findFirst({
        where: {
          playerId: pid,
          ...(excludeEmployeeId ? { NOT: { id: excludeEmployeeId } } : {}),
        },
        select: { id: true, name: true },
      });
      if (dupP) {
        warnings.push({
          code: 'player_link_duplicate',
          message: `Este atleta já está vinculado ao colaborador ${dupP.name}.`,
          employeeId: dupP.id,
        });
      }
    }
    return warnings;
  }

  async create(dto: CreateEmployeeDto, allowedTenantIds: string[] | null = null) {
    assertRhTenantAccess(allowedTenantIds, dto.tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const duplicateWarnings = await this.duplicateWarnings(dto.tenantId, dto.cpf, dto.playerId);

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
        ...employeeDocumentationCreate(dto),
      },
      include: { ...employeeInclude, tenant: { select: { id: true, name: true, slug: true } } },
    });

    if (dto.playerId?.trim()) {
      await syncPlayerFromEmployee(this.prisma, employee, dto.playerId.trim());
      const saved = await this.findOne(employee.id, allowedTenantIds);
      return { ...saved, duplicateWarnings };
    }

    return { ...employee, duplicateWarnings };
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    allowedTenantIds: string[] | null = null,
  ) {
    const existing = await this.findOne(id, allowedTenantIds);
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
        ...employeeDocumentationPatch(dto),
      },
      include: employeeInclude,
    });

    if (dto.playerId !== undefined) {
      if (dto.playerId === null || dto.playerId === '') {
        await unlinkPlayerFromEmployee(this.prisma, id);
      } else if (dto.playerId !== existing.playerId) {
        await syncPlayerFromEmployee(this.prisma, updated, dto.playerId);
      } else {
        await syncLinkedIdentityBidirectional(this.prisma, id);
      }
      return this.findOne(id, allowedTenantIds);
    }

    if (existing.playerId) {
      await syncLinkedIdentityBidirectional(this.prisma, id);
    }

    return updated;
  }

  async linkPlayer(id: string, playerId: string, allowedTenantIds: string[] | null = null) {
    const employee = await this.findOne(id, allowedTenantIds);
    await syncPlayerFromEmployee(this.prisma, employee, playerId);
    return this.findOne(id, allowedTenantIds);
  }

  async createPlayer(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    const player = await createPlayerFromEmployee(this.prisma, await this.findOne(id, allowedTenantIds));
    return { employee: await this.findOne(id, allowedTenantIds), player };
  }

  async unlinkPlayer(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    await unlinkPlayerFromEmployee(this.prisma, id);
    return this.findOne(id, allowedTenantIds);
  }

  async createFromPlayer(playerId: string, allowedTenantIds: string[] | null = null) {
    const employee = await createEmployeeFromPlayer(this.prisma, playerId);
    return this.findOne(employee.id, allowedTenantIds);
  }

  async syncIdentity(id: string, allowedTenantIds: string[] | null = null) {
    const emp = await this.findOne(id, allowedTenantIds);
    if (!emp.playerId) {
      throw new BadRequestException('Colaborador não possui atleta vinculado');
    }
    await syncLinkedIdentityBidirectional(this.prisma, id);
    return this.findOne(id, allowedTenantIds);
  }

  async remove(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    await this.prisma.employee.delete({ where: { id } });
  }
}
