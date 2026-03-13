import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSocioMemberDto } from './dto/create-socio-member.dto';
import type { UpdateSocioMemberDto } from './dto/update-socio-member.dto';

@Injectable()
export class SocioMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    opts?: { planId?: string; status?: string; search?: string },
  ) {
    const where: { tenantId: string; planId?: string; status?: string; OR?: object[] } = { tenantId };
    if (opts?.planId) where.planId = opts.planId;
    if (opts?.status) where.status = opts.status;
    if (opts?.search?.trim()) {
      const q = opts.search.trim().toLowerCase();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
        { phone: { contains: q, mode: 'insensitive' as const } },
      ];
    }
    return this.prisma.socioMember.findMany({
      where,
      include: { plan: { select: { id: true, name: true, slug: true, priceMonthly: true } } },
      orderBy: [{ joinedAt: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.socioMember.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, slug: true, priceMonthly: true, perks: true } },
      },
    });
    if (!row) throw new NotFoundException('Sócio não encontrado');
    return row;
  }

  async create(dto: CreateSocioMemberDto) {
    return this.prisma.socioMember.create({
      data: {
        tenantId: dto.tenantId,
        planId: dto.planId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        cpf: dto.cpf ?? null,
        status: dto.status ?? 'active',
        points: dto.points ?? 0,
        loyaltyTier: dto.loyaltyTier ?? 1,
        externalId: dto.externalId ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async update(id: string, dto: UpdateSocioMemberDto) {
    await this.findOne(id);
    return this.prisma.socioMember.update({
      where: { id },
      data: {
        ...(dto.planId !== undefined && { planId: dto.planId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.cpf !== undefined && { cpf: dto.cpf }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.points !== undefined && { points: dto.points }),
        ...(dto.loyaltyTier !== undefined && { loyaltyTier: dto.loyaltyTier }),
        ...(dto.externalId !== undefined && { externalId: dto.externalId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.socioMember.delete({ where: { id } });
    return { success: true };
  }
}
