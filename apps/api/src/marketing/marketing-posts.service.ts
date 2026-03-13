import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMarketingPostDto } from './dto/create-marketing-post.dto';
import type { UpdateMarketingPostDto } from './dto/update-marketing-post.dto';

@Injectable()
export class MarketingPostsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista postagens com filtro por mês, tenant e status */
  async findAll(params: {
    year?: number;
    month?: number;
    tenantId?: string | null;
    status?: string;
  }) {
    const { year, month, tenantId, status } = params;
    const where: Prisma.MarketingPostWhereInput = {};

    if (tenantId !== undefined && tenantId !== null && tenantId !== '') {
      where.tenantId = tenantId;
    } else if (tenantId === '') {
      where.tenantId = null;
    }

    if (status) where.status = status;

    if (year !== undefined && month !== undefined) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      where.OR = [
        { scheduledAt: { gte: start, lte: end } },
        { scheduledAt: null, status: 'draft' }, // rascunhos aparecem na lista lateral
      ];
    }

    const posts = await this.prisma.marketingPost.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    });
    return posts;
  }

  async findOne(id: string) {
    const row = await this.prisma.marketingPost.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });
    if (!row) throw new NotFoundException('Postagem não encontrada');
    return row;
  }

  async create(dto: CreateMarketingPostDto) {
    const imageUrls = Array.isArray(dto.imageUrls) ? dto.imageUrls : [];
    const platforms = Array.isArray(dto.platforms) ? dto.platforms : ['facebook', 'instagram'];
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const status = dto.status ?? (scheduledAt ? 'scheduled' : 'draft');

    return this.prisma.marketingPost.create({
      data: {
        tenantId: dto.tenantId || null,
        title: dto.title || null,
        content: dto.content,
        imageUrls: imageUrls.length ? imageUrls : Prisma.JsonNull,
        platforms: platforms.length ? platforms : Prisma.JsonNull,
        scheduledAt,
        status,
        notes: dto.notes || null,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });
  }

  async update(id: string, dto: UpdateMarketingPostDto) {
    await this.findOne(id);
    const data: Prisma.MarketingPostUpdateInput = {};

    if (dto.tenantId !== undefined) {
      data.tenant = dto.tenantId
        ? { connect: { id: dto.tenantId } }
        : { disconnect: true };
    }
    if (dto.title !== undefined) data.title = dto.title || null;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.imageUrls !== undefined) data.imageUrls = Array.isArray(dto.imageUrls) ? dto.imageUrls : Prisma.JsonNull;
    if (dto.platforms !== undefined) data.platforms = Array.isArray(dto.platforms) ? dto.platforms : Prisma.JsonNull;
    if (dto.scheduledAt !== undefined) data.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    return this.prisma.marketingPost.update({
      where: { id },
      data,
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.marketingPost.delete({ where: { id } });
    return { success: true };
  }
}
