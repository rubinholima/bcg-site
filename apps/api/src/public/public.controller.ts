import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  BadRequestException,
  StreamableFile,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GroupService } from '../group/group.service';
import { HomeContentService } from '../home-content/home-content.service';
import { PagesService } from '../pages/pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { WorkMailService } from '../workmail/workmail.service';
import { EventsService } from '../events/events.service';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly groupService: GroupService,
    private readonly homeContentService: HomeContentService,
    private readonly pagesService: PagesService,
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly workmailService: WorkMailService,
  ) {}

  @Get('portfolio')
  getPortfolio() {
    return this.publicService.getPortfolio();
  }

  @Get('home-content')
  getHomeContent() {
    return this.homeContentService.getPublic();
  }

  /** Página modular do tenant (clube/empresa) pelo slug — para /portfolio/[slug] */
  @Get('page-by-slug/:slug')
  async getPageByTenantSlug(@Param('slug') slug: string) {
    const page = await this.pagesService.findByTenantSlug(slug);
    if (!page) return null;
    return page;
  }

  /** Página da Home do Grupo Master — dados vêm do Group (Grupo Master), NÃO de empresa. */
  @Get('group-home')
  async getGroupHome() {
    return this.groupService.getGroupHomePageShape();
  }

  /**
   * GET /public/events?tenantId=...
   * Lista eventos publicados. Sem tenantId: eventos do grupo (organizer=group).
   * Com tenantId: eventos daquele clube/empresa.
   */
  @Get('events')
  async getPublicEvents(@Query('tenantId') tenantId: string | undefined) {
    return this.eventsService.findPublishedForPublic(tenantId?.trim() || undefined);
  }

  /** Galeria por link compartilhado (temporário ou permanente) — para /eventos/gallery/[token]. Deve vir antes de events/:slug. */
  @Get('events/gallery/:token')
  async getEventGalleryByToken(@Param('token') token: string) {
    return this.eventsService.getPhotosByToken(token);
  }

  /** Dados do evento para página de upload (valida token). */
  @Get('events/upload/:token')
  async getEventByUploadToken(@Param('token') token: string) {
    return this.eventsService.getEventByUploadToken(token);
  }

  /** Upload de foto via token — página pública para fotógrafos. */
  @Post('events/upload/:token')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async uploadPhotoByToken(
    @Param('token') token: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Body('caption') caption?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    return this.eventsService.uploadPhotoByToken(token, file.buffer, file.mimetype, caption);
  }

  /** URL de upload para fotógrafos (se houver token ativo) — para botão na página pública. */
  @Get('events/:slug/upload-url')
  async getEventUploadUrl(@Param('slug') slug: string) {
    return this.eventsService.getUploadUrlBySlug(slug);
  }

  /** Evento público pelo slug — para /eventos/[slug] (só published). */
  @Get('events/:slug')
  async getEventBySlug(@Param('slug') slug: string) {
    return this.eventsService.findPublishedBySlug(slug);
  }

  /** Fotos do evento pelo slug — para módulo galeria na página pública. */
  @Get('events/:slug/photos')
  async getEventPhotos(@Param('slug') slug: string) {
    return this.eventsService.getPhotosBySlug(slug);
  }

  /**
   * GET /public/tenants?type=club|company&limit=50
   * Lista tenants públicos para carrossel de logos (só ativos, com logo por padrão).
   */
  @Get('tenants')
  async getPublicTenants(
    @Query('type') type: string | undefined,
    @Query('limit') limitStr: string | undefined,
  ) {
    const t = (type ?? '').toLowerCase();
    if (t !== 'club' && t !== 'company') {
      throw new BadRequestException('Query "type" must be "club" or "company"');
    }
    const limit = limitStr ? Math.min(200, Math.max(1, parseInt(limitStr, 10) || 50)) : 50;
    return this.publicService.getPublicTenantsForCarousel(t as 'club' | 'company', {
      withLogoOnly: true,
      limit,
    });
  }

  /**
   * GET /public/tenants/by-id/:tenantId/players
   * Jogadores pelo ID do tenant — garante o tenant correto da página carregada.
   */
  @Get('tenants/by-id/:tenantId/players')
  async getTenantPlayersById(@Param('tenantId') tenantId: string) {
    return this.publicService.getPlayersForTenantId(tenantId);
  }

  /**
   * GET /public/tenants/by-id/:tenantId/fixtures
   * Próximos jogos pelo ID do tenant. Usado pelo módulo Logística (evita dependência do slug).
   */
  @Get('tenants/by-id/:tenantId/fixtures')
  async getTenantFixturesById(@Param('tenantId') tenantId: string) {
    return this.publicService.getFixturesForTenantId(tenantId);
  }

  /**
   * GET /public/tenants/:slug/fixtures
   * Próximos jogos do tenant (clube). Usado pelo módulo "Próximos Jogos" na página pública.
   */
  @Get('tenants/:slug/fixtures')
  async getTenantFixtures(@Param('slug') slug: string) {
    return this.publicService.getFixturesForTenantSlug(slug);
  }

  /**
   * GET /public/tenants/:slug/players
   * Jogadores do clube agrupados por categoria, só os com teamPage visível (publicFields.teamPage !== false).
   * Usado pelo módulo Times por Categorias na página pública.
   */
  @Get('tenants/:slug/players')
  async getTenantPlayers(@Param('slug') slug: string) {
    return this.publicService.getPlayersForTenantSlug(slug);
  }

  /**
   * GET /public/tenants/:slug
   * Dados públicos do tenant (nome, logo) pelo slug. Usado quando a página não traz tenant (ex.: nosso clube em Últimos Resultados).
   */
  @Get('tenants/:slug')
  async getTenantBySlug(@Param('slug') slug: string) {
    return this.publicService.getTenantBySlug(slug);
  }

  /**
   * GET /public/workmail-web-url?slug=...
   * Retorna a URL do cliente web WorkMail (tela de login do usuário) para o tenant.
   * Uso: quando o usuário acessa /portfolio/[slug]/email sem estar logado, redirecionar para essa URL.
   */
  @Get('workmail-web-url')
  async getWorkmailWebUrl(@Query('slug') slug: string | undefined): Promise<{ url: string | null }> {
    const s = (slug ?? '').trim();
    if (!s) return { url: null };
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: s },
      select: { workmailOrganizationId: true },
    });
    if (!tenant?.workmailOrganizationId) return { url: null };
    const url = await this.workmailService.getWebClientUrl(tenant.workmailOrganizationId);
    return { url };
  }

  /**
   * GET /public/media?key=media/hero/xxx.jpg
   * Stream da imagem no S3 (usa credenciais AWS). Público, para hero/carrossel no site.
   */
  @Get('media')
  async getMediaStream(@Query('key') key: string) {
    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new BadRequestException('Query "key" é obrigatória.');
    }
    const { body, contentType } = await this.s3.getObject(key.trim());
    return new StreamableFile(body, {
      type: contentType,
    });
  }
}
