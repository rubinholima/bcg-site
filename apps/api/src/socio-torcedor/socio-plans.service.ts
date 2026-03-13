import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSocioPlanDto } from './dto/create-socio-plan.dto';
import type { UpdateSocioPlanDto } from './dto/update-socio-plan.dto';

@Injectable()
export class SocioPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.socioPlan.findMany({
      where: { tenantId },
      include: { _count: { select: { members: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.socioPlan.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        _count: { select: { members: true } },
      },
    });
    if (!row) throw new NotFoundException('Plano não encontrado');
    return row;
  }

  async create(dto: CreateSocioPlanDto) {
    const tenantId = dto.tenantId;
    const price = typeof dto.priceMonthly === 'number' ? dto.priceMonthly : 0;
    return this.prisma.socioPlan.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        priceMonthly: price,
        perks: dto.perks === undefined || dto.perks === null ? Prisma.JsonNull : (dto.perks as object),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateSocioPlanDto) {
    await this.findOne(id);
    const data: Prisma.SocioPlanUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priceMonthly !== undefined) data.priceMonthly = dto.priceMonthly;
    if (dto.perks !== undefined) data.perks = dto.perks as object;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.socioPlan.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const count = await this.prisma.socioMember.count({ where: { planId: id } });
    if (count > 0) {
      throw new Error(`Não é possível excluir o plano: existem ${count} sócio(s) vinculado(s).`);
    }
    await this.prisma.socioPlan.delete({ where: { id } });
    return { success: true };
  }
}
