import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplementGuideDto } from './dto/create-supplement-guide.dto';
import { UpdateSupplementGuideDto } from './dto/update-supplement-guide.dto';

@Injectable()
export class SupplementGuidesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, categoryId?: string, playerId?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (categoryId) where.categoryId = categoryId;
    if (playerId) where.playerId = playerId;
    return this.prisma.supplementGuide.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
        player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
      },
    });
  }

  async findOne(id: string) {
    const g = await this.prisma.supplementGuide.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
      },
    });
    if (!g) throw new NotFoundException('Guia de suplementação não encontrado');
    return g;
  }

  async create(dto: CreateSupplementGuideDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    if (dto.categoryId) {
      const cat = await this.prisma.nutritionCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat || cat.tenantId !== dto.tenantId) throw new NotFoundException('Categoria não encontrada');
    }
    if (dto.playerId) {
      const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
      if (!player || player.tenantId !== dto.tenantId) throw new NotFoundException('Jogador não encontrado');
    }
    return this.prisma.supplementGuide.create({
      data: {
        tenantId: dto.tenantId,
        categoryId: dto.playerId ? null : (dto.categoryId ?? null),
        playerId: dto.playerId ?? null,
        name: dto.name,
        whenToTake: dto.whenToTake ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        tenant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
      },
    });
  }

  async update(id: string, dto: UpdateSupplementGuideDto) {
    await this.findOne(id);
    if (dto.categoryId !== undefined && dto.categoryId) {
      const cat = await this.prisma.nutritionCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Categoria não encontrada');
    }
    if (dto.playerId !== undefined && dto.playerId) {
      const guide = await this.prisma.supplementGuide.findUnique({ where: { id } });
      if (!guide) throw new NotFoundException('Guia não encontrado');
      const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
      if (!player || player.tenantId !== guide.tenantId) throw new NotFoundException('Jogador não encontrado');
    }
    const data: Record<string, unknown> = {
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ?? null }),
      ...(dto.playerId !== undefined && { playerId: dto.playerId ?? null }),
      ...(dto.playerId !== undefined && dto.playerId && { categoryId: null }),
      ...(dto.categoryId !== undefined && dto.categoryId && { playerId: null }),
      ...(dto.name != null && { name: dto.name }),
      ...(dto.whenToTake !== undefined && { whenToTake: dto.whenToTake ?? null }),
      ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
    };
    return this.prisma.supplementGuide.update({
      where: { id },
      data,
      include: {
        tenant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.supplementGuide.delete({ where: { id } });
  }
}
