import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HomeContentService } from '../home-content/home-content.service';
import { S3Service } from '../s3/s3.service';

export type EventContentDto = {
  theme?: Record<string, unknown>;
  blocks?: Array<{
    id: string;
    type: string;
    sortOrder: number;
    config?: Record<string, unknown>;
  }>;
};

export type CompetitionFormatDto = Record<string, unknown>;

export type EventTenantPublicDto = {
  name: string;
  slug: string;
  logoUrl: string | null;
};

export type EventResponseDto = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  organizer: string;
  tenantId: string | null;
  tenantName?: string | null;
  /** Presente quando o include Prisma trouxe slug/logoUrl (ex.: público por slug, findOne). */
  tenant?: EventTenantPublicDto | null;
  category: string;
  /** principal | sub20 | sub15 | … — categoria única do torneio na página pública */
  fixtureCategory: string | null;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
  content: EventContentDto;
  competitionFormat: CompetitionFormatDto | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateEventDto = {
  slug: string;
  name: string;
  description?: string;
  organizer: 'group' | 'tenant';
  tenantId?: string;
  category?: 'football' | 'other';
  fixtureCategory?: string | null;
  startDate?: string;
  endDate?: string;
  logoUrl?: string;
  content?: EventContentDto;
  competitionFormat?: CompetitionFormatDto | null;
};

export type UpdateEventDto = {
  slug?: string;
  name?: string;
  description?: string;
  organizer?: 'group' | 'tenant';
  tenantId?: string | null;
  category?: 'football' | 'other';
  fixtureCategory?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  logoUrl?: string | null;
  content?: EventContentDto;
  competitionFormat?: CompetitionFormatDto | null;
  status?: string;
};

function toDto(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  organizer: string;
  tenantId: string | null;
  tenant?: { name: string; slug?: string | null; logoUrl?: string | null } | null;
  category: string;
  fixtureCategory: string | null;
  startDate: Date | null;
  endDate: Date | null;
  logoUrl: string | null;
  content: unknown;
  competitionFormat: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): EventResponseDto {
  const content = (row.content as EventContentDto) ?? { blocks: [] };
  const competitionFormat = row.competitionFormat as CompetitionFormatDto | null ?? null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    organizer: row.organizer,
    tenantId: row.tenantId,
    tenantName: row.tenant?.name ?? null,
    tenant: row.tenant
      ? {
          name: row.tenant.name,
          slug: (row.tenant.slug ?? '').trim(),
          logoUrl: row.tenant.logoUrl ?? null,
        }
      : null,
    category: row.category,
    fixtureCategory: row.fixtureCategory?.trim() || null,
    startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : null,
    endDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : null,
    logoUrl: row.logoUrl,
    content,
    competitionFormat,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Página inicial do evento (header, hero, texto, galeria, footer) — mesmo formato que Page.content */
function buildDefaultEventPageContent(eventName: string): EventContentDto {
  const tid = Date.now();
  return {
    theme: {
      defaultLang: 'pt',
      backgroundColor: '#0f0f12',
      accentColor: '#fbbf24',
    },
    blocks: [
      {
        id: 'header',
        type: 'header',
        sortOrder: 0,
        config: {
          headerPreset: 'classic',
          backgroundMode: 'solid',
          backgroundColor: '#18181b',
          headerTextColor: '#ffffff',
          linkStyle: 'text',
          logoSize: 'md',
          sticky: false,
          borderBottom: true,
          borderColor: 'rgba(255,255,255,0.08)',
          showLanguage: true,
          showHomeLink: true,
          headerLinks: [],
        },
      },
      {
        id: 'hero',
        type: 'hero',
        sortOrder: 1,
        config: {
          heroSlides: [
            { url: '', titlePt: eventName, titleEn: eventName },
          ],
          heroCarouselEffect: 'fade',
          heroCarouselIntervalSeconds: 10,
        },
      },
      {
        id: `text-${tid}`,
        type: 'text',
        sortOrder: 2,
        config: {
          titlePt: 'Sobre o evento',
          titleEn: 'About the event',
          bodyPt:
            'Edite este texto e os demais módulos no dashboard: Páginas → Editar página do evento.',
          bodyEn:
            'Edit this text and other modules in the dashboard: Pages → Edit event page.',
          visible: true,
        },
      },
      {
        id: 'galeria_eventos',
        type: 'galeria_eventos',
        sortOrder: 3,
        config: {
          titlePt: 'Galeria de fotos',
          titleEn: 'Photo gallery',
          backgroundColor: '#0f0f12',
          visible: true,
        },
      },
      {
        id: 'footer',
        type: 'footer',
        sortOrder: 4,
        config: {
          footerText: '',
          footerLinks: [],
          backgroundColor: '#18181b',
        },
      },
    ],
  };
}

export type EventPhotoDto = {
  id: string;
  s3Key: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
};

export type EventGalleryLinkDto = {
  id: string;
  token: string;
  url: string;
  expiresAt: string | null;
  isPermanent: boolean;
  createdAt: string;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly homeContentService: HomeContentService,
    private readonly s3: S3Service,
  ) {}

  async findAll(filters?: {
    organizer?: string;
    category?: string;
    status?: string;
  }): Promise<EventResponseDto[]> {
    const where: Record<string, unknown> = {};
    if (filters?.organizer) where.organizer = filters.organizer;
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;

    const rows = await this.prisma.event.findMany({
      where,
      include: { tenant: { select: { name: true } } },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toDto);
  }

  async findOne(id: string): Promise<EventResponseDto> {
    const row = await this.prisma.event.findUnique({
      where: { id },
      include: { tenant: { select: { name: true, slug: true, logoUrl: true } } },
    });
    if (!row) {
      throw new NotFoundException(`Evento com ID "${id}" não encontrado`);
    }
    const dto = toDto(row as Parameters<typeof toDto>[0]);
    const blocks = (dto.content?.blocks ?? []) as unknown[];
    if (!Array.isArray(blocks) || blocks.length === 0) {
      const def = buildDefaultEventPageContent(dto.name);
      return {
        ...dto,
        content: {
          ...def,
          theme: { ...def.theme, ...(dto.content?.theme ?? {}) },
        },
      };
    }
    return dto;
  }

  /**
   * Público: lista eventos publicados ainda “válidos” na agenda.
   * Inclui: data fim ≥ hoje; ou sem data fim (em curso / a definir); ou ambas nulas.
   * Sem tenantId: grupo + todos os tenants. Com tenantId: só eventos desse clube/empresa.
   */
  async findPublishedForPublic(tenantId?: string): Promise<EventResponseDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.EventWhereInput = {
      status: 'published',
      OR: [
        { endDate: { gte: today } },
        { endDate: null, startDate: { gte: today } },
        { endDate: null, startDate: null },
        { endDate: null, startDate: { lte: today } },
      ],
    };
    if (tenantId) {
      where.organizer = 'tenant';
      where.tenantId = tenantId;
    }
    const rows = await this.prisma.event.findMany({
      where,
      include: { tenant: { select: { name: true } } },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => toDto(r as Parameters<typeof toDto>[0]));
  }

  /** Público: retorna evento publicado pelo slug (para /eventos/[slug]). */
  async findPublishedBySlug(slug: string): Promise<EventResponseDto | null> {
    return this.findBySlug(slug);
  }

  async findBySlug(slug: string): Promise<EventResponseDto | null> {
    const row = await this.prisma.event.findFirst({
      where: { slug: slug.trim(), status: 'published' },
      include: { tenant: { select: { name: true, slug: true, logoUrl: true } } },
    });
    if (!row) return null;
    const dto = toDto(row as Parameters<typeof toDto>[0]);
    const existingBlocks = (dto.content.blocks ?? []) as Array<{
      id: string;
      type: string;
      sortOrder: number;
      config?: Record<string, unknown>;
    }>;
    const def = buildDefaultEventPageContent(dto.name);
    const baseContent =
      Array.isArray(existingBlocks) && existingBlocks.length > 0
        ? dto.content
        : {
            ...def,
            theme: { ...def.theme, ...(dto.content?.theme ?? {}) },
          };
    const rawBlocks = (baseContent.blocks ?? []) as typeof existingBlocks;
    const blocks = await this.homeContentService.enrichBlocksWithGlobalPresence(
      rawBlocks,
    );
    return { ...dto, content: { ...baseContent, blocks } };
  }

  async create(dto: CreateEventDto): Promise<EventResponseDto> {
    const slug = slugify(dto.slug) || slugify(dto.name) || 'evento';
    const existing = await this.prisma.event.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(
        `Já existe um evento com slug "${slug}". Use outro slug.`,
      );
    }

    const tenantId =
      dto.organizer === 'tenant' && dto.tenantId ? dto.tenantId : null;
    if (dto.organizer === 'tenant' && !dto.tenantId) {
      throw new ConflictException(
        'Ao organizar como tenant, informe o tenantId.',
      );
    }

    const incoming = dto.content as EventContentDto | undefined;
    const blocks = incoming?.blocks;
    const useDefault = !Array.isArray(blocks) || blocks.length === 0;
    const content = (useDefault
      ? buildDefaultEventPageContent(dto.name.trim())
      : incoming) as object;
    const competitionFormat =
      dto.competitionFormat != null
        ? (dto.competitionFormat as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    const row = await this.prisma.event.create({
      data: {
        slug,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        organizer: dto.organizer,
        tenantId,
        category: dto.category ?? 'football',
        fixtureCategory:
          dto.fixtureCategory != null && String(dto.fixtureCategory).trim()
            ? String(dto.fixtureCategory).trim()
            : null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        logoUrl: dto.logoUrl?.trim() || null,
        content,
        competitionFormat,
      },
      include: { tenant: { select: { name: true } } },
    });
    return toDto(row as Parameters<typeof toDto>[0]);
  }

  async update(id: string, dto: UpdateEventDto): Promise<EventResponseDto> {
    const current = await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.slug !== undefined && dto.slug !== null) {
      const newSlug = slugify(dto.slug) || slugify(current.name) || 'evento';
      if (newSlug !== current.slug) {
        const clash = await this.prisma.event.findFirst({
          where: { slug: newSlug, NOT: { id } },
        });
        if (clash) {
          throw new ConflictException(
            `Já existe um evento com slug "${newSlug}". Escolha outro.`,
          );
        }
        data.slug = newSlug;
      }
    }
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.organizer !== undefined) data.organizer = dto.organizer;
    const effectiveOrganizer =
      dto.organizer !== undefined ? dto.organizer : current.organizer;
    if (dto.tenantId !== undefined) {
      data.tenantId =
        effectiveOrganizer === 'tenant' && dto.tenantId ? dto.tenantId : null;
    } else if (dto.organizer === 'group') {
      data.tenantId = null;
    }
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.fixtureCategory !== undefined) {
      data.fixtureCategory =
        dto.fixtureCategory != null && String(dto.fixtureCategory).trim()
          ? String(dto.fixtureCategory).trim()
          : null;
    }
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.content !== undefined) data.content = dto.content as object;
    if (dto.competitionFormat !== undefined)
      (data as Record<string, unknown>).competitionFormat =
        dto.competitionFormat != null
          ? (dto.competitionFormat as Prisma.InputJsonValue)
          : (Prisma.JsonNull as unknown);
    if (dto.status !== undefined) data.status = dto.status;

    if (Object.keys(data).length > 0) {
      await this.prisma.event.update({
        where: { id },
        data: data as Parameters<typeof this.prisma.event.update>[0]['data'],
      });
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.event.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Fotos do evento ---

  async addPhoto(
    eventId: string,
    buffer: Buffer,
    contentType: string,
    caption?: string,
  ): Promise<EventPhotoDto> {
    await this.findOne(eventId);
    const { key } = await this.s3.uploadMedia(
      buffer,
      contentType,
      'eventos',
      eventId,
    );
    const photo = await this.prisma.eventPhoto.create({
      data: {
        eventId,
        s3Key: key,
        caption: caption?.trim() || null,
        sortOrder: 0,
      },
    });
    return this.toPhotoDto(photo);
  }

  async listPhotos(eventId: string): Promise<EventPhotoDto[]> {
    await this.findOne(eventId);
    const photos = await this.prisma.eventPhoto.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return photos.map((p) => this.toPhotoDto(p));
  }

  async removePhoto(photoId: string): Promise<{ deleted: boolean }> {
    const photo = await this.prisma.eventPhoto.findUnique({
      where: { id: photoId },
      include: { event: true },
    });
    if (!photo) {
      throw new NotFoundException('Foto não encontrada');
    }
    await this.prisma.eventPhoto.delete({ where: { id: photoId } });
    return { deleted: true };
  }

  private toPhotoDto(p: { id: string; s3Key: string; caption: string | null; sortOrder: number; createdAt: Date }): EventPhotoDto {
    return {
      id: p.id,
      s3Key: p.s3Key,
      url: this.s3.getPublicUrl(p.s3Key),
      caption: p.caption,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt.toISOString(),
    };
  }

  /** Público: só indica se há token ativo (não expõe o token). */
  async getUploadAvailabilityBySlug(slug: string): Promise<{ available: boolean }> {
    const event = await this.prisma.event.findFirst({
      where: { slug: slug.trim(), status: 'published' },
      select: { id: true },
    });
    if (!event) return { available: false };
    const now = new Date();
    const t = await this.prisma.eventUploadToken.findFirst({
      where: {
        eventId: event.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return { available: !!t };
  }

  /** Público: fotos do evento pelo slug (para módulo na página). */
  async getPhotosBySlug(slug: string): Promise<EventPhotoDto[] | null> {
    const event = await this.prisma.event.findFirst({
      where: { slug: slug.trim(), status: 'published' },
    });
    if (!event) return null;
    const photos = await this.prisma.eventPhoto.findMany({
      where: { eventId: event.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return photos.map((p) => this.toPhotoDto(p));
  }

  /** Público: fotos pelo token do link compartilhado (temporário ou permanente). */
  async getPhotosByToken(token: string): Promise<{ event: { name: string; slug: string }; photos: EventPhotoDto[] } | null> {
    const link = await this.prisma.eventGalleryLink.findUnique({
      where: { token: token.trim() },
      include: { event: true },
    });
    if (!link) return null;
    if (link.expiresAt && link.expiresAt < new Date()) return null;
    const photos = await this.prisma.eventPhoto.findMany({
      where: { eventId: link.eventId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      event: { name: link.event.name, slug: link.event.slug },
      photos: photos.map((p) => this.toPhotoDto(p)),
    };
  }

  // --- Links compartilháveis ---

  async createGalleryLink(
    eventId: string,
    options: { temporary: boolean; expiresInDays?: number },
  ): Promise<EventGalleryLinkDto> {
    await this.findOne(eventId);
    const crypto = await import('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt =
      options.temporary && (options.expiresInDays ?? 7) > 0
        ? new Date(Date.now() + (options.expiresInDays ?? 7) * 24 * 60 * 60 * 1000)
        : null;
    const link = await this.prisma.eventGalleryLink.create({
      data: { eventId, token, expiresAt },
    });
    const baseUrl = process.env.PUBLIC_APP_URL || 'https://www.bostoncitygroup.biz';
    return {
      id: link.id,
      token: link.token,
      url: `${baseUrl}/eventos/gallery/${link.token}`,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      isPermanent: !link.expiresAt,
      createdAt: link.createdAt.toISOString(),
    };
  }

  async listGalleryLinks(eventId: string): Promise<EventGalleryLinkDto[]> {
    await this.findOne(eventId);
    const links = await this.prisma.eventGalleryLink.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
    const baseUrl = process.env.PUBLIC_APP_URL || 'https://www.bostoncitygroup.biz';
    return links.map((l) => ({
      id: l.id,
      token: l.token,
      url: `${baseUrl}/eventos/gallery/${l.token}`,
      expiresAt: l.expiresAt?.toISOString() ?? null,
      isPermanent: !l.expiresAt,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async revokeGalleryLink(linkId: string): Promise<{ deleted: boolean }> {
    const link = await this.prisma.eventGalleryLink.findUnique({
      where: { id: linkId },
    });
    if (!link) {
      throw new NotFoundException('Link não encontrado');
    }
    await this.prisma.eventGalleryLink.delete({ where: { id: linkId } });
    return { deleted: true };
  }

  // --- Tokens de upload (página pública) ---

  async createUploadToken(eventId: string, options?: { expiresInDays?: number }): Promise<{ id: string; token: string; url: string; expiresAt: string | null; createdAt: string }> {
    await this.findOne(eventId);
    const crypto = await import('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt =
      options?.expiresInDays && options.expiresInDays > 0
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : null;
    const created = await this.prisma.eventUploadToken.create({
      data: { eventId, token, expiresAt },
    });
    const baseUrl = process.env.PUBLIC_APP_URL || 'https://www.bostoncitygroup.biz';
    return {
      id: created.id,
      token: created.token,
      url: `${baseUrl}/eventos/upload/${created.token}`,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listUploadTokens(eventId: string): Promise<{ id: string; token: string; url: string; expiresAt: string | null; createdAt: string }[]> {
    await this.findOne(eventId);
    const tokens = await this.prisma.eventUploadToken.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
    const baseUrl = process.env.PUBLIC_APP_URL || 'https://www.bostoncitygroup.biz';
    return tokens.map((t) => ({
      id: t.id,
      token: t.token,
      url: `${baseUrl}/eventos/upload/${t.token}`,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async revokeUploadToken(tokenId: string): Promise<{ deleted: boolean }> {
    const t = await this.prisma.eventUploadToken.findUnique({ where: { id: tokenId } });
    if (!t) throw new NotFoundException('Token não encontrado');
    await this.prisma.eventUploadToken.delete({ where: { id: tokenId } });
    return { deleted: true };
  }

  /** Público: valida token e retorna dados do evento para a página de upload. */
  async getEventByUploadToken(token: string): Promise<{ event: { id: string; name: string; slug: string }; valid: boolean } | null> {
    const t = await this.prisma.eventUploadToken.findUnique({
      where: { token: token.trim() },
      include: { event: true },
    });
    if (!t) return null;
    if (t.expiresAt && t.expiresAt < new Date()) return { event: { id: t.event.id, name: t.event.name, slug: t.event.slug }, valid: false };
    return { event: { id: t.event.id, name: t.event.name, slug: t.event.slug }, valid: true };
  }

  /** Público: upload de foto via token (página pública). */
  async uploadPhotoByToken(
    token: string,
    buffer: Buffer,
    contentType: string,
    caption?: string,
  ): Promise<EventPhotoDto> {
    const t = await this.prisma.eventUploadToken.findUnique({
      where: { token: token.trim() },
      include: { event: true },
    });
    if (!t) throw new NotFoundException('Link de upload inválido');
    if (t.expiresAt && t.expiresAt < new Date()) throw new NotFoundException('Link de upload expirado');
    const { key } = await this.s3.uploadMedia(buffer, contentType, 'eventos', t.eventId);
    const photo = await this.prisma.eventPhoto.create({
      data: { eventId: t.eventId, s3Key: key, caption: caption?.trim() || null, sortOrder: 0 },
    });
    return this.toPhotoDto(photo);
  }
}
