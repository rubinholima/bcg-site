import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    search?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.role) where.role = filters.role;
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
      include: { tenant: { select: { id: true, name: true, slug: true } } },
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
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!staff) throw new NotFoundException('Membro da comissão não encontrado');
    return staff;
  }

  async create(dto: CreateTechnicalStaffDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Clube "${dto.tenantId}" não encontrado`);

    const data = {
      tenantId: dto.tenantId,
      name: dto.name,
      photoUrl: dto.photoUrl ?? null,
      role: dto.role,
      categories: dto.categories != null ? dto.categories : Prisma.JsonNull,
      birthDate: dto.birthDate ?? null,
      nationality: dto.nationality ?? null,
      cpf: dto.cpf ?? null,
      rg: dto.rg ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      licenseType: dto.licenseType ?? null,
      licenseNumber: dto.licenseNumber ?? null,
      licenseValidUntil: dto.licenseValidUntil ? new Date(dto.licenseValidUntil) : null,
      contractType: dto.contractType ?? null,
      contractStart: dto.contractStart ? new Date(dto.contractStart) : null,
      contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : null,
      bio: dto.bio ?? null,
      notes: dto.notes ?? null,
    };
    return this.prisma.technicalStaff.create({
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateTechnicalStaffDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.name != null) data.name = dto.name;
    if (dto.photoUrl != null) data.photoUrl = dto.photoUrl;
    if (dto.role != null) data.role = dto.role;
    if (dto.categories != null) data.categories = dto.categories;
    if (dto.birthDate != null) data.birthDate = dto.birthDate;
    if (dto.nationality != null) data.nationality = dto.nationality;
    if (dto.cpf != null) data.cpf = dto.cpf;
    if (dto.rg != null) data.rg = dto.rg;
    if (dto.email != null) data.email = dto.email;
    if (dto.phone != null) data.phone = dto.phone;
    if (dto.address != null) data.address = dto.address;
    if (dto.licenseType != null) data.licenseType = dto.licenseType;
    if (dto.licenseNumber != null) data.licenseNumber = dto.licenseNumber;
    if (dto.licenseValidUntil != null) data.licenseValidUntil = dto.licenseValidUntil ? new Date(dto.licenseValidUntil) : null;
    if (dto.contractType != null) data.contractType = dto.contractType;
    if (dto.contractStart != null) data.contractStart = dto.contractStart ? new Date(dto.contractStart) : null;
    if (dto.contractEnd != null) data.contractEnd = dto.contractEnd ? new Date(dto.contractEnd) : null;
    if (dto.bio != null) data.bio = dto.bio;
    if (dto.notes != null) data.notes = dto.notes;
    return this.prisma.technicalStaff.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.technicalStaff.delete({ where: { id } });
  }
}
