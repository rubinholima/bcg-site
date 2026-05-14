import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId?: string,
    categoryId?: string,
    status?: string,
    pieceType?: string,
    assignedPlayerId?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (categoryId) where.categoryId = categoryId;
    if (status?.trim()) where.status = status.trim();
    if (pieceType?.trim()) where.pieceType = pieceType.trim();
    if (assignedPlayerId !== undefined && assignedPlayerId !== null && assignedPlayerId !== '')
      where.assignedPlayerId = assignedPlayerId;
    return this.prisma.asset.findMany({
      where,
      orderBy: [{ category: { name: 'asc' } }, { description: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, kind: true } },
        assignedPlayer: { select: { id: true, name: true, jerseyNumber: true } },
      },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: true,
        assignedPlayer: { select: { id: true, name: true, jerseyNumber: true, category: true } },
      },
    });
    if (!asset) throw new NotFoundException('Bem não encontrado');
    return asset;
  }

  async create(dto: CreateAssetDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    const category = await this.prisma.assetCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    if (category.tenantId !== dto.tenantId) throw new NotFoundException('Categoria não pertence ao tenant');
    if (dto.assignedPlayerId) {
      const player = await this.prisma.player.findUnique({ where: { id: dto.assignedPlayerId } });
      if (!player) throw new NotFoundException('Jogador não encontrado');
      if (player.tenantId !== dto.tenantId) throw new NotFoundException('Jogador não pertence ao tenant');
    }
    return this.prisma.asset.create({
      data: {
        tenantId: dto.tenantId,
        categoryId: dto.categoryId,
        tagNumber: dto.tagNumber ?? null,
        description: dto.description,
        photoUrl: dto.photoUrl?.trim() ? dto.photoUrl.trim() : null,
        location: dto.location ?? null,
        responsibleName: dto.responsibleName ?? null,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : null,
        acquisitionValue: dto.acquisitionValue ?? null,
        depreciationRate: dto.depreciationRate ?? null,
        status: dto.status ?? 'em_uso',
        notes: dto.notes ?? null,
        pieceType: dto.pieceType ?? null,
        size: dto.size ?? null,
        shirtNumber: dto.shirtNumber ?? null,
        assignedPlayerId: dto.assignedPlayerId ?? null,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, kind: true } },
        assignedPlayer: { select: { id: true, name: true, jerseyNumber: true } },
      },
    });
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id);
    if (dto.categoryId) {
      const category = await this.prisma.assetCategory.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Categoria não encontrada');
    }
    if (dto.assignedPlayerId !== undefined && dto.assignedPlayerId !== null && dto.assignedPlayerId !== '') {
      const player = await this.prisma.player.findUnique({ where: { id: dto.assignedPlayerId } });
      if (!player) throw new NotFoundException('Jogador não encontrado');
    }
    const data: Record<string, unknown> = {};
    if (dto.categoryId != null) data.categoryId = dto.categoryId;
    if (dto.tagNumber !== undefined) data.tagNumber = dto.tagNumber ?? null;
    if (dto.description != null) data.description = dto.description;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl?.trim() ? dto.photoUrl.trim() : null;
    if (dto.location !== undefined) data.location = dto.location ?? null;
    if (dto.responsibleName !== undefined) data.responsibleName = dto.responsibleName ?? null;
    if (dto.acquisitionDate !== undefined) data.acquisitionDate = dto.acquisitionDate ? new Date(dto.acquisitionDate) : null;
    if (dto.acquisitionValue !== undefined) data.acquisitionValue = dto.acquisitionValue ?? null;
    if (dto.depreciationRate !== undefined) data.depreciationRate = dto.depreciationRate ?? null;
    if (dto.status != null) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (dto.pieceType !== undefined) data.pieceType = dto.pieceType ?? null;
    if (dto.size !== undefined) data.size = dto.size ?? null;
    if (dto.shirtNumber !== undefined) data.shirtNumber = dto.shirtNumber ?? null;
    if (dto.assignedPlayerId !== undefined) data.assignedPlayerId = dto.assignedPlayerId ?? null;
    return this.prisma.asset.update({
      where: { id },
      data,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, kind: true } },
        assignedPlayer: { select: { id: true, name: true, jerseyNumber: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.asset.delete({ where: { id } });
  }
}
