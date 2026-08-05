import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroEmail, cadastroJsonStringArray, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicalStaffDto } from './dto/create-technical-staff.dto';
import { UpdateTechnicalStaffDto } from './dto/update-technical-staff.dto';

@Injectable()
export class TechnicalStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    tenantId?: string;
    category?: string;
    role?: string;
    jobRoleId?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.role) where.role = filters.role;
    if (filters?.jobRoleId) where.jobRoleId = filters.jobRoleId;
    if (filters?.search?.trim()) {
      where.OR = [
        { name: { contains: filters.search.trim(), mode: 'insensitive' as const } },
        { email: { contains: filters.search.trim(), mode: 'insensitive' as const } },
        { role: { contains: filters.search.trim(), mode: 'insensitive' as const } },
      ];
    }
    let list = await this.prisma.technicalStaff.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { role: 'asc' }, { name: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        jobRole: { select: { id: true, name: true, type: true } },
      },
    });
    if (filters?.category) {
      const cat = filters.category.trim();
      list = list.filter((s) => {
        const cats = s.categories as string[] | null;
        if (!cats || !Array.isArray(cats)) return true;
        return cats.includes(cat);
      });
    }
    return list;
  }

  async findOne(id: string) {
    const staff = await this.prisma.technicalStaff.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        jobRole: { select: { id: true, name: true, type: true } },
      },
    });
    if (!staff) throw new NotFoundException('Membro da comissão não encontrado');
    return staff;
  }

  async create(dto: CreateTechnicalStaffDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Clube "${dto.tenantId}" não encontrado`);

    if (!dto.photoUrl.trim()) throw new BadRequestException('A foto é obrigatória');
    const jobRole = await this.findStaffJobRole(dto.tenantId, dto.jobRoleId);
    const data = {
      tenantId: dto.tenantId,
      name: cadastroUpperRequired(dto.name),
      photoUrl: dto.photoUrl.trim(),
      jobRoleId: jobRole.id,
      role: jobRole.name,
      categories: dto.categories != null ? cadastroJsonStringArray(dto.categories) : Prisma.JsonNull,
      birthDate: dto.birthDate ?? null,
      nationality: cadastroUpper(dto.nationality),
      cpf: cadastroUpper(dto.cpf),
      rg: cadastroUpper(dto.rg),
      email: cadastroEmail(dto.email),
      phone: cadastroUpper(dto.phone),
      address: cadastroUpper(dto.address),
      licenseType: cadastroUpper(dto.licenseType),
      licenseNumber: cadastroUpper(dto.licenseNumber),
      licenseValidUntil: dto.licenseValidUntil ? new Date(dto.licenseValidUntil) : null,
      contractType: cadastroUpper(dto.contractType),
      contractStart: dto.contractStart ? new Date(dto.contractStart) : null,
      contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : null,
      bio: cadastroUpper(dto.bio),
      notes: cadastroUpper(dto.notes),
    };
    return this.prisma.technicalStaff.create({
      data,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        jobRole: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async update(id: string, dto: UpdateTechnicalStaffDto) {
    const current = await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.name != null) data.name = cadastroUpperRequired(dto.name);
    if (dto.photoUrl != null) data.photoUrl = dto.photoUrl;
    if (dto.jobRoleId != null) {
      const jobRole = await this.findStaffJobRole(current.tenantId, dto.jobRoleId);
      data.jobRoleId = jobRole.id;
      data.role = jobRole.name;
    }
    if (dto.categories != null) data.categories = cadastroJsonStringArray(dto.categories);
    if (dto.birthDate != null) data.birthDate = dto.birthDate;
    if (dto.nationality != null) data.nationality = cadastroUpper(dto.nationality);
    if (dto.cpf != null) data.cpf = cadastroUpper(dto.cpf);
    if (dto.rg != null) data.rg = cadastroUpper(dto.rg);
    if (dto.email != null) data.email = cadastroEmail(dto.email);
    if (dto.phone != null) data.phone = cadastroUpper(dto.phone);
    if (dto.address != null) data.address = cadastroUpper(dto.address);
    if (dto.licenseType != null) data.licenseType = cadastroUpper(dto.licenseType);
    if (dto.licenseNumber != null) data.licenseNumber = cadastroUpper(dto.licenseNumber);
    if (dto.licenseValidUntil != null) data.licenseValidUntil = dto.licenseValidUntil ? new Date(dto.licenseValidUntil) : null;
    if (dto.contractType != null) data.contractType = cadastroUpper(dto.contractType);
    if (dto.contractStart != null) data.contractStart = dto.contractStart ? new Date(dto.contractStart) : null;
    if (dto.contractEnd != null) data.contractEnd = dto.contractEnd ? new Date(dto.contractEnd) : null;
    if (dto.bio != null) data.bio = cadastroUpper(dto.bio);
    if (dto.notes != null) data.notes = cadastroUpper(dto.notes);
    return this.prisma.technicalStaff.update({
      where: { id },
      data,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        jobRole: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.technicalStaff.delete({ where: { id } });
  }

  findJobRoles(tenantId: string) {
    return this.prisma.jobRole.findMany({
      where: { tenantId, type: 'staff' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  private async findStaffJobRole(tenantId: string, jobRoleId: string) {
    const jobRole = await this.prisma.jobRole.findFirst({
      where: { id: jobRoleId, tenantId, type: 'staff' },
      select: { id: true, name: true },
    });
    if (!jobRole) throw new BadRequestException('Função do RH inválida para este clube');
    return jobRole;
  }
}
