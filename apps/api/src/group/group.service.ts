import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HomeContentService } from '../home-content/home-content.service';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SLUG = 'bcg';

export interface GroupDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  homeContent: { blocks?: unknown[] } | null;
  createdAt: string;
  updatedAt: string;
}

/** Formato "página" para a home do grupo (frontend espera content.blocks e tenant). */
export interface GroupHomePageShape {
  id: string;
  tenantId: string;
  slug: string;
  title: string | null;
  content: { blocks?: unknown[] };
  tenant: { id: string; name: string; slug: string; logoUrl?: string | null };
}

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly homeContentService: HomeContentService,
  ) {}

  async findOne(slug: string = DEFAULT_SLUG): Promise<GroupDto> {
    let row = await this.prisma.group.findUnique({ where: { slug } });
    if (!row) {
      row = await this.prisma.group.create({
        data: {
          name: 'Boston City Group',
          slug,
        },
      });
    }
    const content = row.homeContent as { blocks?: unknown[] } | null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl ?? null,
      description: row.description ?? null,
      address: row.address ?? null,
      contactName: row.contactName ?? null,
      contactPhone: row.contactPhone ?? null,
      homeContent: content ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Retorna o grupo no formato de "página" para a home pública e para o editor. Blocos enriquecidos com clubes/empresas/países do cadastro. */
  async getGroupHomePageShape(slug: string = DEFAULT_SLUG): Promise<GroupHomePageShape | null> {
    const group = await this.findOne(slug);
    const content = group.homeContent ?? { blocks: [] };
    const rawBlocks = Array.isArray((content as { blocks?: unknown[] }).blocks)
      ? (content as { blocks: unknown[] }).blocks
      : [];
    const blocks = await this.homeContentService.enrichBlocksWithGlobalPresence(
      rawBlocks as { id: string; type: string; sortOrder: number; config?: Record<string, unknown> }[],
    );
    return {
      id: group.id,
      tenantId: group.id,
      slug: 'group-home',
      title: group.name,
      content: { blocks },
      tenant: {
        id: group.id,
        name: group.name,
        slug: group.slug,
        logoUrl: group.logoUrl,
      },
    };
  }

  async update(
    slug: string,
    dto: {
      name?: string;
      logoUrl?: string;
      description?: string;
      address?: string;
      contactName?: string;
      contactPhone?: string;
      homeContent?: { blocks?: unknown[] } | null;
    },
  ): Promise<GroupDto> {
    const existing = await this.prisma.group.findUnique({ where: { slug } });
    if (!existing) {
      throw new NotFoundException(`Grupo com slug "${slug}" não encontrado`);
    }
    try {
      const updated = await this.prisma.group.update({
        where: { slug },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.contactName !== undefined && { contactName: dto.contactName }),
          ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
          ...(dto.homeContent !== undefined && { homeContent: dto.homeContent as object }),
        },
      });
      const content = updated.homeContent as { blocks?: unknown[] } | null;
      return {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl ?? null,
        description: updated.description ?? null,
        address: updated.address ?? null,
        contactName: updated.contactName ?? null,
        contactPhone: updated.contactPhone ?? null,
        homeContent: content ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `GroupService.update failed: ${message}`,
      );
    }
  }

  async updateLogoUrl(slug: string, logoUrl: string): Promise<GroupDto> {
    return this.update(slug, { logoUrl });
  }
}
