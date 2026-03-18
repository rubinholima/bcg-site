import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicalStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    const where: { tenantId?: string | null } = {};
    if (tenantId !== undefined) {
      where.tenantId = tenantId || null;
    }
    return this.prisma.medicalStaff.findMany({
      where,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.medicalStaff.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Profissional não encontrado');
    return row;
  }

  async create(data: {
    name: string;
    role: string;
    crmCoren?: string;
    specialty?: string;
    photoUrl?: string;
    birthDate?: string;
    cpf?: string;
    rg?: string;
    email?: string;
    phone?: string;
    address?: string;
    bio?: string;
    notes?: string;
    tenantId?: string;
  }) {
    return this.prisma.medicalStaff.create({
      data: {
        name: data.name,
        role: data.role,
        crmCoren: data.crmCoren ?? null,
        specialty: data.specialty ?? null,
        photoUrl: data.photoUrl ?? null,
        birthDate: data.birthDate ?? null,
        cpf: data.cpf ?? null,
        rg: data.rg ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        bio: data.bio ?? null,
        notes: data.notes ?? null,
        tenantId: data.tenantId ?? null,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    role: string;
    crmCoren: string;
    specialty: string;
    photoUrl: string;
    birthDate: string;
    cpf: string;
    rg: string;
    email: string;
    phone: string;
    address: string;
    bio: string;
    notes: string;
    tenantId: string;
  }>) {
    await this.findOne(id);
    return this.prisma.medicalStaff.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.crmCoren !== undefined && { crmCoren: data.crmCoren ?? null }),
        ...(data.specialty !== undefined && { specialty: data.specialty ?? null }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl ?? null }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate ?? null }),
        ...(data.cpf !== undefined && { cpf: data.cpf ?? null }),
        ...(data.rg !== undefined && { rg: data.rg ?? null }),
        ...(data.email !== undefined && { email: data.email ?? null }),
        ...(data.phone !== undefined && { phone: data.phone ?? null }),
        ...(data.address !== undefined && { address: data.address ?? null }),
        ...(data.bio !== undefined && { bio: data.bio ?? null }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
        ...(data.tenantId !== undefined && { tenantId: data.tenantId ?? null }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.medicalStaff.delete({ where: { id } });
    return { success: true };
  }
}
