import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PageContentDto = {
  blocks?: Array<{
    id: string;
    type: string;
    sortOrder: number;
    config?: Record<string, unknown>;
  }>;
};

export type PageResponseDto = {
  id: string;
  tenantId: string;
  slug: string;
  title: string | null;
  content: PageContentDto;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; name: string; slug: string; logoUrl?: string | null };
};

export type CreatePageDto = {
  tenantId: string;
  slug?: string;
  title?: string;
};

export type UpdatePageDto = {
  title?: string;
  content?: PageContentDto;
};

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PageResponseDto[]> {
    const rows = await this.prisma.page.findMany({
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ tenant: { name: 'asc' } }, { slug: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      slug: r.slug,
      title: r.title,
      content: (r.content as PageContentDto) ?? { blocks: [] },
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      tenant: r.tenant,
    }));
  }

  async findByTenantId(tenantId: string): Promise<PageResponseDto | null> {
    const row = await this.prisma.page.findFirst({
      where: { tenantId },
      include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    if (!row) return null;
    return {
      id: row.id,
      tenantId: row.tenantId,
      slug: row.slug,
      title: row.title,
      content: (row.content as PageContentDto) ?? { blocks: [] },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tenant: row.tenant ?? undefined,
    };
  }

  /** Público: retorna a página do tenant pelo slug (para exibir em /portfolio/[slug]) */
  async findByTenantSlug(tenantSlug: string): Promise<PageResponseDto | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) return null;
    return this.findByTenantId(tenant.id);
  }

  async findOne(id: string): Promise<PageResponseDto> {
    const row = await this.prisma.page.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) {
      throw new NotFoundException(`Página com ID "${id}" não encontrada`);
    }
    return {
      id: row.id,
      tenantId: row.tenantId,
      slug: row.slug,
      title: row.title,
      content: (row.content as PageContentDto) ?? { blocks: [] },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tenant: row.tenant ?? undefined,
    };
  }

  async create(dto: CreatePageDto): Promise<PageResponseDto> {
    const slug = (dto.slug ?? 'main').trim() || 'main';
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(
        `Empresa com ID "${dto.tenantId}" não encontrada`,
      );
    }
    const existing = await this.prisma.page.findUnique({
      where: { tenantId_slug: { tenantId: dto.tenantId, slug } },
    });
    if (existing) {
      throw new ConflictException(
        `Já existe uma página com slug "${slug}" para esta empresa`,
      );
    }
    const row = await this.prisma.page.create({
      data: {
        tenantId: dto.tenantId,
        slug,
        title: dto.title?.trim() || null,
        content: { blocks: [] } as object,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      slug: row.slug,
      title: row.title,
      content: (row.content as PageContentDto) ?? { blocks: [] },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tenant: row.tenant ?? undefined,
    };
  }

  async update(id: string, dto: UpdatePageDto): Promise<PageResponseDto> {
    await this.findOne(id);
    const data: { title?: string | null; content?: object } = {};
    if (dto.title !== undefined) data.title = dto.title?.trim() || null;
    if (dto.content !== undefined) data.content = dto.content as object;
    const row = await this.prisma.page.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      slug: row.slug,
      title: row.title,
      content: (row.content as PageContentDto) ?? { blocks: [] },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tenant: row.tenant ?? undefined,
    };
  }
}
