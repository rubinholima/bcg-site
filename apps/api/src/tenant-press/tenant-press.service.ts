import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { MailService } from '../common/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

export interface TenantPressPhotoDto {
  id: string;
  url: string;
  caption: string | null;
  matchLabel: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface TenantPressGalleryLinkDto {
  id: string;
  token: string;
  url: string;
  expiresAt: string | null;
  isPermanent: boolean;
  createdAt: string;
}

export interface TenantPressUploadTokenDto {
  id: string;
  token: string;
  url: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface TenantPressPageAccessCodeDto {
  id: string;
  code: string;
  label: string | null;
  expiresAt: string;
  createdAt: string;
}

@Injectable()
export class TenantPressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly mail: MailService,
  ) {}

  private baseUrl(): string {
    return process.env.PUBLIC_APP_URL || 'https://www.bostoncitygroup.biz';
  }

  private pressAccessSecret(): string {
    return process.env.JWT_SECRET || process.env.PRESS_ACCESS_SECRET || 'dev-press-access-secret';
  }

  private generateReadableCode(length = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      out += chars[bytes[i]! % chars.length];
    }
    return out;
  }

  private signPressSession(slug: string, codeId: string, expMs: number): string {
    const payload = `${slug}:${codeId}:${expMs}`;
    const sig = createHmac('sha256', this.pressAccessSecret()).update(payload).digest('hex');
    return Buffer.from(JSON.stringify({ slug, codeId, exp: expMs, sig })).toString('base64url');
  }

  private parsePressSession(sessionToken: string): { slug: string; codeId: string; exp: number; sig: string } | null {
    try {
      const parsed = JSON.parse(Buffer.from(sessionToken, 'base64url').toString('utf8')) as {
        slug?: string;
        codeId?: string;
        exp?: number;
        sig?: string;
      };
      if (!parsed.slug || !parsed.codeId || !parsed.exp || !parsed.sig) return null;
      return { slug: parsed.slug, codeId: parsed.codeId, exp: parsed.exp, sig: parsed.sig };
    } catch {
      return null;
    }
  }

  private verifyPressSessionSignature(slug: string, codeId: string, expMs: number, sig: string): boolean {
    const expected = createHmac('sha256', this.pressAccessSecret())
      .update(`${slug}:${codeId}:${expMs}`)
      .digest('hex');
    return expected === sig;
  }

  private async getImprensaBlockConfig(tenantId: string): Promise<Record<string, unknown> | null> {
    const page = await this.prisma.page.findFirst({
      where: { tenantId, slug: 'main' },
    });
    if (!page?.content || typeof page.content !== 'object') return null;
    const blocks = (page.content as { blocks?: Array<{ type?: string; config?: Record<string, unknown> }> }).blocks ?? [];
    const imprensa = blocks.find((b) => b.type === 'imprensa');
    return imprensa?.config ?? null;
  }

  private static readonly EDITORIAL_KEYS = [
    'imprensaReleasePt',
    'imprensaReleaseEn',
    'imprensaUltimoJogoTituloPt',
    'imprensaUltimoJogoTituloEn',
    'imprensaUltimoJogoReleasePt',
    'imprensaUltimoJogoReleaseEn',
    'imprensaUltimoJogoData',
    'imprensaHistoriaTituloPt',
    'imprensaHistoriaTituloEn',
    'imprensaHistoriaPt',
    'imprensaHistoriaEn',
    'imprensaCredencialNotifyEmail',
  ] as const;

  private pickEditorialFields(config: Record<string, unknown> | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!config) return out;
    for (const key of TenantPressService.EDITORIAL_KEYS) {
      const v = config[key];
      if (typeof v === 'string') out[key] = v;
    }
    return out;
  }

  private async patchImprensaBlockConfig(
    tenantId: string,
    patch: Record<string, string | undefined>,
  ): Promise<Record<string, string>> {
    const page = await this.prisma.page.findFirst({ where: { tenantId, slug: 'main' } });
    if (!page?.content || typeof page.content !== 'object') {
      throw new NotFoundException(
        'Página principal não encontrada. Adicione o módulo Imprensa em Construção Web.',
      );
    }
    const content = JSON.parse(JSON.stringify(page.content)) as {
      blocks?: Array<{ type?: string; config?: Record<string, unknown> }>;
    };
    const blocks = content.blocks ?? [];
    const idx = blocks.findIndex((b) => b.type === 'imprensa');
    if (idx < 0) {
      throw new NotFoundException('Módulo Imprensa não encontrado na página do clube.');
    }
    const current = { ...(blocks[idx]!.config ?? {}) };
    for (const [key, value] of Object.entries(patch)) {
      if (!TenantPressService.EDITORIAL_KEYS.includes(key as (typeof TenantPressService.EDITORIAL_KEYS)[number])) {
        continue;
      }
      if (value === undefined || value === '') delete current[key];
      else current[key] = value;
    }
    blocks[idx]!.config = current;
    await this.prisma.page.update({
      where: { id: page.id },
      data: { content: content as object },
    });
    return this.pickEditorialFields(current);
  }

  async getEditorialContent(tenantId: string): Promise<{
    ok: true;
    fields: Record<string, string>;
    pressReleases: Array<{
      id: string;
      date: string;
      titlePt: string;
      titleEn: string;
      bodyPt: string;
      bodyEn: string;
    }>;
  }> {
    await this.findTenant(tenantId);
    const config = await this.getImprensaBlockConfig(tenantId);
    if (!config) {
      throw new NotFoundException('Módulo Imprensa não encontrado na página do clube.');
    }
    return {
      ok: true,
      fields: this.pickEditorialFields(config),
      pressReleases: this.normalizePressReleases(config),
    };
  }

  async updateEditorialContent(
    tenantId: string,
    body: {
      fields?: Record<string, string | undefined>;
      pressReleases?: Array<{
        id: string;
        date?: string;
        titlePt?: string;
        titleEn?: string;
        bodyPt?: string;
        bodyEn?: string;
      }>;
    },
  ): Promise<{
    ok: true;
    fields: Record<string, string>;
    pressReleases: Array<{
      id: string;
      date: string;
      titlePt: string;
      titleEn: string;
      bodyPt: string;
      bodyEn: string;
    }>;
  }> {
    await this.findTenant(tenantId);
    const page = await this.prisma.page.findFirst({ where: { tenantId, slug: 'main' } });
    if (!page?.content || typeof page.content !== 'object') {
      throw new NotFoundException(
        'Página principal não encontrada. Adicione o módulo Imprensa em Construção Web.',
      );
    }
    const content = JSON.parse(JSON.stringify(page.content)) as {
      blocks?: Array<{ type?: string; config?: Record<string, unknown> }>;
    };
    const blocks = content.blocks ?? [];
    const idx = blocks.findIndex((b) => b.type === 'imprensa');
    if (idx < 0) {
      throw new NotFoundException('Módulo Imprensa não encontrado na página do clube.');
    }
    let current = { ...(blocks[idx]!.config ?? {}) };
    if (body.fields) {
      for (const [key, value] of Object.entries(body.fields)) {
        if (!TenantPressService.EDITORIAL_KEYS.includes(key as (typeof TenantPressService.EDITORIAL_KEYS)[number])) {
          continue;
        }
        if (value === undefined || value === '') delete current[key];
        else current[key] = value;
      }
    }
    if (body.pressReleases) {
      const releases = this.sortPressReleases(
        body.pressReleases.map((r) => ({
          id: r.id?.trim() || `pr-${Date.now()}`,
          date: r.date?.trim() || '',
          titlePt: r.titlePt?.trim() || '',
          titleEn: r.titleEn?.trim() || '',
          bodyPt: r.bodyPt?.trim() || '',
          bodyEn: r.bodyEn?.trim() || '',
        })),
      );
      current = this.syncLegacyUltimoFromReleases(current, releases);
    }
    blocks[idx]!.config = current;
    await this.prisma.page.update({
      where: { id: page.id },
      data: { content: content as object },
    });
    return {
      ok: true,
      fields: this.pickEditorialFields(current),
      pressReleases: this.normalizePressReleases(current),
    };
  }

  private sortPressReleases(
    items: Array<{
      id: string;
      date: string;
      titlePt: string;
      titleEn: string;
      bodyPt: string;
      bodyEn: string;
    }>,
  ) {
    return [...items].sort((a, b) => {
      const da = a.date?.trim() || '0000-00-00';
      const db = b.date?.trim() || '0000-00-00';
      return db.localeCompare(da);
    });
  }

  private normalizePressReleases(config: Record<string, unknown>): Array<{
    id: string;
    date: string;
    titlePt: string;
    titleEn: string;
    bodyPt: string;
    bodyEn: string;
  }> {
    const raw = config.imprensaPressReleases;
    if (Array.isArray(raw) && raw.length > 0) {
      const items = raw
        .filter((x) => x && typeof x === 'object' && typeof (x as { id?: string }).id === 'string')
        .map((x) => {
          const o = x as Record<string, unknown>;
          return {
            id: String(o.id),
            date: typeof o.date === 'string' ? o.date : '',
            titlePt: typeof o.titlePt === 'string' ? o.titlePt : '',
            titleEn: typeof o.titleEn === 'string' ? o.titleEn : '',
            bodyPt: typeof o.bodyPt === 'string' ? o.bodyPt : '',
            bodyEn: typeof o.bodyEn === 'string' ? o.bodyEn : '',
          };
        });
      return this.sortPressReleases(items);
    }
    const titlePt = (config.imprensaUltimoJogoTituloPt as string)?.trim();
    const bodyPt = (config.imprensaUltimoJogoReleasePt as string)?.trim();
    if (!titlePt && !bodyPt) return [];
    return this.sortPressReleases([
      {
        id: 'legacy-ultimo-jogo',
        date: (config.imprensaUltimoJogoData as string)?.trim() || '',
        titlePt: titlePt || '',
        titleEn: (config.imprensaUltimoJogoTituloEn as string)?.trim() || '',
        bodyPt: bodyPt || '',
        bodyEn: (config.imprensaUltimoJogoReleaseEn as string)?.trim() || '',
      },
    ]);
  }

  private syncLegacyUltimoFromReleases(
    config: Record<string, unknown>,
    releases: Array<{
      id: string;
      date: string;
      titlePt: string;
      titleEn: string;
      bodyPt: string;
      bodyEn: string;
    }>,
  ): Record<string, unknown> {
    const sorted = this.sortPressReleases(releases);
    const latest = sorted[0];
    const next: Record<string, unknown> = { ...config, imprensaPressReleases: sorted };
    if (latest) {
      next.imprensaUltimoJogoData = latest.date || undefined;
      next.imprensaUltimoJogoTituloPt = latest.titlePt || undefined;
      next.imprensaUltimoJogoTituloEn = latest.titleEn || undefined;
      next.imprensaUltimoJogoReleasePt = latest.bodyPt || undefined;
      next.imprensaUltimoJogoReleaseEn = latest.bodyEn || undefined;
    } else {
      delete next.imprensaUltimoJogoData;
      delete next.imprensaUltimoJogoTituloPt;
      delete next.imprensaUltimoJogoTituloEn;
      delete next.imprensaUltimoJogoReleasePt;
      delete next.imprensaUltimoJogoReleaseEn;
    }
    return next;
  }

  private async getCredentialNotifyEmail(tenantId: string): Promise<string | null> {
    const config = await this.getImprensaBlockConfig(tenantId);
    if (!config) return null;
    const dedicated = (config.imprensaCredencialNotifyEmail as string)?.trim();
    const fallback = (config.imprensaContatoEmail as string)?.trim();
    return dedicated || fallback || null;
  }

  private async findTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Clube não encontrado');
    return tenant;
  }

  private async findTenantBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: slug.trim() } });
    if (!tenant) return null;
    return tenant;
  }

  private toPhotoDto(p: {
    id: string;
    s3Key: string;
    caption: string | null;
    matchLabel: string | null;
    sortOrder: number;
    createdAt: Date;
  }): TenantPressPhotoDto {
    return {
      id: p.id,
      url: this.s3.getPublicUrl(p.s3Key),
      caption: p.caption,
      matchLabel: p.matchLabel,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt.toISOString(),
    };
  }

  async addPhoto(
    tenantId: string,
    buffer: Buffer,
    contentType: string,
    caption?: string,
    matchLabel?: string,
  ): Promise<TenantPressPhotoDto> {
    await this.findTenant(tenantId);
    const { key } = await this.s3.uploadMedia(buffer, contentType, 'imprensa', tenantId);
    const photo = await this.prisma.tenantPressPhoto.create({
      data: {
        tenantId,
        s3Key: key,
        caption: caption?.trim() || null,
        matchLabel: matchLabel?.trim() || null,
        sortOrder: 0,
      },
    });
    void this.syncPhotoToGaleriaModule(tenantId, photo);
    return this.toPhotoDto(photo);
  }

  async listPhotos(tenantId: string): Promise<TenantPressPhotoDto[]> {
    await this.findTenant(tenantId);
    const photos = await this.prisma.tenantPressPhoto.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return photos.map((p) => this.toPhotoDto(p));
  }

  async deletePhoto(tenantId: string, photoId: string): Promise<{ deleted: boolean }> {
    const photo = await this.prisma.tenantPressPhoto.findFirst({
      where: { id: photoId, tenantId },
    });
    if (!photo) throw new NotFoundException('Foto não encontrada');
    await this.prisma.tenantPressPhoto.delete({ where: { id: photoId } });
    void this.removePhotoFromGaleriaModule(tenantId, photo.s3Key);
    return { deleted: true };
  }

  async getPhotosBySlug(slug: string): Promise<TenantPressPhotoDto[]> {
    const tenant = await this.findTenantBySlug(slug);
    if (!tenant) return [];
    const photos = await this.prisma.tenantPressPhoto.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return photos.map((p) => this.toPhotoDto(p));
  }

  async getUploadAvailabilityBySlug(slug: string): Promise<{ available: boolean }> {
    const token = await this.findActiveUploadTokenBySlug(slug);
    return { available: !!token };
  }

  /**
   * Devolve o token de upload.
   * Se a página exige código: só com sessão válida.
   * Se não exige: libera o token (página aberta) — nunca via GET público.
   */
  async getUploadUrlBySlugSecure(
    slug: string,
    sessionToken: string,
  ): Promise<{ token: string } | null> {
    const requires = await this.pageRequiresAccessCode(slug);
    if (requires) {
      if (!sessionToken?.trim()) return null;
      const ok = await this.checkPageAccessSession(slug, sessionToken);
      if (!ok) return null;
    }
    const token = await this.findActiveUploadTokenBySlug(slug);
    return token ? { token } : null;
  }

  private async findActiveUploadTokenBySlug(slug: string): Promise<string | null> {
    const tenant = await this.findTenantBySlug(slug);
    if (!tenant) return null;
    const now = new Date();
    const t = await this.prisma.tenantPressUploadToken.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return t?.token ?? null;
  }

  async getPhotosByGalleryToken(
    token: string,
  ): Promise<{ tenant: { name: string; slug: string }; photos: TenantPressPhotoDto[] } | null> {
    const link = await this.prisma.tenantPressGalleryLink.findUnique({
      where: { token: token.trim() },
      include: { tenant: true },
    });
    if (!link) return null;
    if (link.expiresAt && link.expiresAt < new Date()) return null;
    const photos = await this.prisma.tenantPressPhoto.findMany({
      where: { tenantId: link.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return {
      tenant: { name: link.tenant.name, slug: link.tenant.slug },
      photos: photos.map((p) => this.toPhotoDto(p)),
    };
  }

  async createGalleryLink(
    tenantId: string,
    options: { temporary: boolean; expiresInDays?: number },
  ): Promise<TenantPressGalleryLinkDto> {
    await this.findTenant(tenantId);
    const crypto = await import('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt =
      options.temporary && (options.expiresInDays ?? 7) > 0
        ? new Date(Date.now() + (options.expiresInDays ?? 7) * 24 * 60 * 60 * 1000)
        : null;
    const link = await this.prisma.tenantPressGalleryLink.create({
      data: { tenantId, token, expiresAt },
    });
    return {
      id: link.id,
      token: link.token,
      url: `${this.baseUrl()}/clube/galeria/${link.token}`,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      isPermanent: !link.expiresAt,
      createdAt: link.createdAt.toISOString(),
    };
  }

  async listGalleryLinks(tenantId: string): Promise<TenantPressGalleryLinkDto[]> {
    await this.findTenant(tenantId);
    const links = await this.prisma.tenantPressGalleryLink.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return links.map((l) => ({
      id: l.id,
      token: l.token,
      url: `${this.baseUrl()}/clube/galeria/${l.token}`,
      expiresAt: l.expiresAt?.toISOString() ?? null,
      isPermanent: !l.expiresAt,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async revokeGalleryLink(linkId: string): Promise<{ deleted: boolean }> {
    const link = await this.prisma.tenantPressGalleryLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Link não encontrado');
    await this.prisma.tenantPressGalleryLink.delete({ where: { id: linkId } });
    return { deleted: true };
  }

  async createUploadToken(
    tenantId: string,
    options?: { expiresInDays?: number },
  ): Promise<TenantPressUploadTokenDto> {
    await this.findTenant(tenantId);
    const crypto = await import('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt =
      options?.expiresInDays && options.expiresInDays > 0
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : null;
    const created = await this.prisma.tenantPressUploadToken.create({
      data: { tenantId, token, expiresAt },
    });
    return {
      id: created.id,
      token: created.token,
      url: `${this.baseUrl()}/clube/upload/${created.token}`,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listUploadTokens(tenantId: string): Promise<TenantPressUploadTokenDto[]> {
    await this.findTenant(tenantId);
    const tokens = await this.prisma.tenantPressUploadToken.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return tokens.map((t) => ({
      id: t.id,
      token: t.token,
      url: `${this.baseUrl()}/clube/upload/${t.token}`,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async revokeUploadToken(tokenId: string): Promise<{ deleted: boolean }> {
    const t = await this.prisma.tenantPressUploadToken.findUnique({ where: { id: tokenId } });
    if (!t) throw new NotFoundException('Token não encontrado');
    await this.prisma.tenantPressUploadToken.delete({ where: { id: tokenId } });
    return { deleted: true };
  }

  async getTenantByUploadToken(
    token: string,
  ): Promise<{ tenant: { id: string; name: string; slug: string }; valid: boolean } | null> {
    const t = await this.prisma.tenantPressUploadToken.findUnique({
      where: { token: token.trim() },
      include: { tenant: true },
    });
    if (!t) return null;
    if (t.expiresAt && t.expiresAt < new Date()) {
      return {
        tenant: { id: t.tenant.id, name: t.tenant.name, slug: t.tenant.slug },
        valid: false,
      };
    }
    return {
      tenant: { id: t.tenant.id, name: t.tenant.name, slug: t.tenant.slug },
      valid: true,
    };
  }

  async uploadPhotoByToken(
    token: string,
    buffer: Buffer,
    contentType: string,
    caption?: string,
    matchLabel?: string,
  ): Promise<TenantPressPhotoDto> {
    const t = await this.prisma.tenantPressUploadToken.findUnique({
      where: { token: token.trim() },
      include: { tenant: true },
    });
    if (!t) throw new NotFoundException('Link de upload inválido');
    if (t.expiresAt && t.expiresAt < new Date()) throw new NotFoundException('Link de upload expirado');
    const { key } = await this.s3.uploadMedia(buffer, contentType, 'imprensa', t.tenantId);
    const photo = await this.prisma.tenantPressPhoto.create({
      data: {
        tenantId: t.tenantId,
        s3Key: key,
        caption: caption?.trim() || null,
        matchLabel: matchLabel?.trim() || null,
        sortOrder: 0,
      },
    });
    void this.syncPhotoToGaleriaModule(t.tenantId, photo);
    return this.toPhotoDto(photo);
  }

  async createPageAccessCode(
    tenantId: string,
    options?: { expiresInHours?: number; label?: string },
  ): Promise<TenantPressPageAccessCodeDto> {
    await this.findTenant(tenantId);
    const hours = Math.min(Math.max(options?.expiresInHours ?? 72, 1), 24 * 30);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    let code = this.generateReadableCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const exists = await this.prisma.tenantPressPageAccessCode.findFirst({
        where: { tenantId, code },
      });
      if (!exists) break;
      code = this.generateReadableCode();
    }
    const created = await this.prisma.tenantPressPageAccessCode.create({
      data: {
        tenantId,
        code,
        label: options?.label?.trim() || null,
        expiresAt,
      },
    });
    return {
      id: created.id,
      code: created.code,
      label: created.label,
      expiresAt: created.expiresAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listPageAccessCodes(tenantId: string): Promise<TenantPressPageAccessCodeDto[]> {
    await this.findTenant(tenantId);
    const now = new Date();
    const rows = await this.prisma.tenantPressPageAccessCode.findMany({
      where: { tenantId, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      label: r.label,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async revokePageAccessCode(tenantId: string, codeId: string): Promise<{ deleted: boolean }> {
    const row = await this.prisma.tenantPressPageAccessCode.findFirst({
      where: { id: codeId, tenantId },
    });
    if (!row) throw new NotFoundException('Código não encontrado');
    await this.prisma.tenantPressPageAccessCode.delete({ where: { id: codeId } });
    return { deleted: true };
  }

  async verifyPageAccessCode(
    slug: string,
    rawCode: string,
  ): Promise<{ sessionToken: string; expiresAt: string }> {
    const tenant = await this.findTenantBySlug(slug);
    if (!tenant) throw new NotFoundException('Clube não encontrado');
    const code = rawCode.trim().toUpperCase().replace(/\s/g, '');
    if (!code) throw new UnauthorizedException('Código inválido');
    const row = await this.prisma.tenantPressPageAccessCode.findFirst({
      where: { tenantId: tenant.id, code },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Código inválido ou expirado');
    }
    const sessionExp = Math.min(row.expiresAt.getTime(), Date.now() + 12 * 60 * 60 * 1000);
    return {
      sessionToken: this.signPressSession(slug, row.id, sessionExp),
      expiresAt: new Date(sessionExp).toISOString(),
    };
  }

  async checkPageAccessSession(slug: string, sessionToken: string): Promise<boolean> {
    const parsed = this.parsePressSession(sessionToken);
    if (!parsed || parsed.slug !== slug) return false;
    if (parsed.exp < Date.now()) return false;
    if (!this.verifyPressSessionSignature(parsed.slug, parsed.codeId, parsed.exp, parsed.sig)) return false;
    const row = await this.prisma.tenantPressPageAccessCode.findUnique({ where: { id: parsed.codeId } });
    if (!row || row.expiresAt < new Date()) return false;
    const tenant = await this.findTenantBySlug(slug);
    return tenant?.id === row.tenantId;
  }

  async pageRequiresAccessCode(slug: string): Promise<boolean> {
    const tenant = await this.findTenantBySlug(slug);
    if (!tenant) return false;
    const page = await this.prisma.page.findFirst({
      where: { tenantId: tenant.id, slug: 'main' },
    });
    if (!page?.content || typeof page.content !== 'object') return true;
    const blocks = (page.content as { blocks?: Array<{ type?: string; config?: Record<string, unknown> }> }).blocks ?? [];
    const imprensa = blocks.find((b) => b.type === 'imprensa');
    if (!imprensa) return true;
    const mode = imprensa.config?.imprensaDisplayMode;
    if (mode !== 'page') return false;
    return imprensa.config?.imprensaRequireAccessCode !== false;
  }

  async submitCredentialRequest(
    slug: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      outlet?: string;
      document?: string;
      eventLabel?: string;
      notes?: string;
    },
  ): Promise<{ id: string; ok: true }> {
    const tenant = await this.findTenantBySlug(slug);
    if (!tenant) throw new NotFoundException('Clube não encontrado');
    const name = data.name?.trim();
    const email = data.email?.trim();
    if (!name || !email) throw new NotFoundException('Nome e e-mail são obrigatórios.');
    const row = await this.prisma.tenantPressCredentialRequest.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        phone: data.phone?.trim() || null,
        outlet: data.outlet?.trim() || null,
        document: data.document?.trim() || null,
        eventLabel: data.eventLabel?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    const notifyTo = await this.getCredentialNotifyEmail(tenant.id);
    if (notifyTo) {
      const lines = [
        `Nova solicitação de credencial — ${tenant.name}`,
        '',
        `Nome: ${name}`,
        `E-mail: ${email}`,
        data.phone?.trim() ? `Telefone: ${data.phone.trim()}` : null,
        data.outlet?.trim() ? `Veículo: ${data.outlet.trim()}` : null,
        data.document?.trim() ? `Documento: ${data.document.trim()}` : null,
        data.eventLabel?.trim() ? `Jogo/evento: ${data.eventLabel.trim()}` : null,
        data.notes?.trim() ? `Observações:\n${data.notes.trim()}` : null,
        '',
        'Veja também no dashboard: Assessoria de Imprensa → Solicitações de credencial.',
      ].filter(Boolean);
      await this.mail.sendMail({
        to: notifyTo,
        subject: `[Imprensa] Nova credencial — ${name} (${tenant.name})`,
        text: lines.join('\n'),
      });
    }

    return { id: row.id, ok: true };
  }

  async listCredentialRequests(tenantId: string) {
    await this.findTenant(tenantId);
    return this.prisma.tenantPressCredentialRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateCredentialRequestStatus(tenantId: string, id: string, status: string) {
    const row = await this.prisma.tenantPressCredentialRequest.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Solicitação não encontrada');
    await this.prisma.tenantPressCredentialRequest.update({ where: { id }, data: { status } });
    return { ok: true };
  }

  async registerJournalist(
    tenantId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      outlet?: string;
      document?: string;
      notes?: string;
    },
  ) {
    await this.findTenant(tenantId);
    const name = data.name?.trim();
    const email = data.email?.trim();
    if (!name || !email) throw new NotFoundException('Nome e e-mail são obrigatórios.');
    return this.prisma.tenantPressCredentialRequest.create({
      data: {
        tenantId,
        name,
        email,
        phone: data.phone?.trim() || null,
        outlet: data.outlet?.trim() || null,
        document: data.document?.trim() || null,
        notes: data.notes?.trim() || null,
        status: 'approved',
      },
    });
  }

  async deleteCredentialRequest(tenantId: string, id: string) {
    const row = await this.prisma.tenantPressCredentialRequest.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Registro não encontrado');
    await this.prisma.tenantPressCredentialRequest.delete({ where: { id } });
    return { deleted: true };
  }

  /** Espelha foto de imprensa no módulo Galeria da página principal do clube. */
  private async syncPhotoToGaleriaModule(
    tenantId: string,
    photo: { s3Key: string; caption: string | null; matchLabel: string | null },
  ): Promise<void> {
    try {
      const page = await this.prisma.page.findFirst({ where: { tenantId, slug: 'main' } });
      if (!page?.content || typeof page.content !== 'object') return;

      const content = JSON.parse(JSON.stringify(page.content)) as {
        blocks?: Array<{ type?: string; config?: Record<string, unknown> }>;
      };
      const blocks = content.blocks ?? [];
      const idx = blocks.findIndex((b) => b.type === 'galeria');
      if (idx < 0) return;

      const config = blocks[idx]!.config ?? {};
      const items = (
        Array.isArray(config.galeriaManualItems) ? config.galeriaManualItems : []
      ) as Array<{ imageUrl?: string; title?: string; caption?: string }>;

      const publicUrl = this.s3.getPublicUrl(photo.s3Key);
      const keyTail = photo.s3Key.split('/').pop() ?? '';
      if (items.some((it) => (it.imageUrl ?? '').includes(keyTail) || (it.imageUrl ?? '') === publicUrl)) {
        return;
      }

      items.unshift({
        imageUrl: publicUrl,
        title: photo.matchLabel?.trim() || photo.caption?.trim() || 'Imprensa',
        caption: photo.caption?.trim() || undefined,
      });

      blocks[idx]!.config = { ...config, galeriaManualItems: items };
      await this.prisma.page.update({
        where: { id: page.id },
        data: { content: content as object },
      });
    } catch {
      /* não bloqueia upload de imprensa */
    }
  }

  private async removePhotoFromGaleriaModule(tenantId: string, s3Key: string): Promise<void> {
    try {
      const page = await this.prisma.page.findFirst({ where: { tenantId, slug: 'main' } });
      if (!page?.content || typeof page.content !== 'object') return;

      const content = JSON.parse(JSON.stringify(page.content)) as {
        blocks?: Array<{ type?: string; config?: Record<string, unknown> }>;
      };
      const blocks = content.blocks ?? [];
      const idx = blocks.findIndex((b) => b.type === 'galeria');
      if (idx < 0) return;

      const config = blocks[idx]!.config ?? {};
      const items = (
        Array.isArray(config.galeriaManualItems) ? config.galeriaManualItems : []
      ) as Array<{ imageUrl?: string }>;
      const keyTail = s3Key.split('/').pop() ?? '';
      const publicUrl = this.s3.getPublicUrl(s3Key);
      const filtered = items.filter(
        (it) => !(it.imageUrl ?? '').includes(keyTail) && (it.imageUrl ?? '') !== publicUrl,
      );
      if (filtered.length === items.length) return;

      blocks[idx]!.config = { ...config, galeriaManualItems: filtered };
      await this.prisma.page.update({
        where: { id: page.id },
        data: { content: content as object },
      });
    } catch {
      /* ignore */
    }
  }
}
