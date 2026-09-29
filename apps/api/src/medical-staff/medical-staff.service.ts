import { Injectable, NotFoundException } from '@nestjs/common';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicalStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, role?: string) {
    // Cadastro grava role em MAIÚSCULAS (cadastroUpperRequired)
    const roleFilter = role?.trim() ? cadastroUpperRequired(role) : undefined;
    const where: { tenantId?: string | null; role?: string } = {};
    if (tenantId !== undefined && tenantId !== '') {
      // clube específico + profissionais do grupo (tenantId null)
      return this.prisma.medicalStaff.findMany({
        where: {
          ...(roleFilter ? { role: roleFilter } : {}),
          OR: [{ tenantId }, { tenantId: null }],
        },
        include: { tenant: { select: { id: true, name: true, slug: true } } },
        orderBy: [{ name: 'asc' }],
      });
    }
    if (roleFilter) where.role = roleFilter;
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
    registryState?: string;
    specialty?: string;
    institution?: string;
    signatureImageUrl?: string;
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
        name: cadastroUpperRequired(data.name),
        role: cadastroUpperRequired(data.role),
        crmCoren: cadastroUpper(data.crmCoren),
        registryState: cadastroUpper(data.registryState),
        specialty: cadastroUpper(data.specialty),
        institution: cadastroUpper(data.institution),
        signatureImageUrl: data.signatureImageUrl ?? null,
        photoUrl: data.photoUrl ?? null,
        birthDate: data.birthDate ?? null,
        cpf: cadastroUpper(data.cpf),
        rg: cadastroUpper(data.rg),
        email: cadastroEmail(data.email),
        phone: cadastroUpper(data.phone),
        address: cadastroUpper(data.address),
        bio: cadastroUpper(data.bio),
        notes: cadastroUpper(data.notes),
        tenantId: data.tenantId ?? null,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    role: string;
    crmCoren: string;
    registryState: string;
    specialty: string;
    institution: string;
    signatureImageUrl: string;
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
        ...(data.name !== undefined && { name: cadastroUpperRequired(data.name) }),
        ...(data.role !== undefined && { role: cadastroUpperRequired(data.role) }),
        ...(data.crmCoren !== undefined && { crmCoren: cadastroUpper(data.crmCoren) }),
        ...(data.registryState !== undefined && {
          registryState: cadastroUpper(data.registryState),
        }),
        ...(data.specialty !== undefined && { specialty: cadastroUpper(data.specialty) }),
        ...(data.institution !== undefined && { institution: cadastroUpper(data.institution) }),
        ...(data.signatureImageUrl !== undefined && {
          signatureImageUrl: data.signatureImageUrl ?? null,
        }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl ?? null }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate ?? null }),
        ...(data.cpf !== undefined && { cpf: cadastroUpper(data.cpf) }),
        ...(data.rg !== undefined && { rg: cadastroUpper(data.rg) }),
        ...(data.email !== undefined && { email: cadastroEmail(data.email) }),
        ...(data.phone !== undefined && { phone: cadastroUpper(data.phone) }),
        ...(data.address !== undefined && { address: cadastroUpper(data.address) }),
        ...(data.bio !== undefined && { bio: cadastroUpper(data.bio) }),
        ...(data.notes !== undefined && { notes: cadastroUpper(data.notes) }),
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
