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
  Res,
  BadGatewayException,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { FileInterceptor } from '@nestjs/platform-express';
import { GroupService } from '../group/group.service';
import { HomeContentService } from '../home-content/home-content.service';
import { PagesService } from '../pages/pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { WorkMailService } from '../workmail/workmail.service';
import { EventsService } from '../events/events.service';
import { PublicService } from './public.service';
import { BostonTvService } from '../boston-tv/boston-tv.service';
import { RegistrationInviteService } from '../registration-invite/registration-invite.service';
import { BostonCityHallService } from '../boston-city-hall/boston-city-hall.service';
import { TenantPressService } from '../tenant-press/tenant-press.service';
import { SubmitEmployeeRegistrationDto } from '../registration-invite/dto/submit-employee-registration.dto';
import { SubmitPlayerRegistrationDto } from '../registration-invite/dto/submit-player-registration.dto';

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
    private readonly bostonTvService: BostonTvService,
    private readonly registrationInviteService: RegistrationInviteService,
    private readonly bostonCityHallService: BostonCityHallService,
    private readonly tenantPressService: TenantPressService,
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

  /** Galeria imprensa do clube — /clube/galeria/[token] */
  @Get('press/gallery/:token')
  async getClubPressGalleryByToken(@Param('token') token: string) {
    return this.tenantPressService.getPhotosByGalleryToken(token);
  }

  /** Dados do clube para página de upload (valida token). */
  @Get('press/upload/:token')
  async getClubByUploadToken(@Param('token') token: string) {
    return this.tenantPressService.getTenantByUploadToken(token);
  }

  /** Upload de foto via token — fotógrafos / imprensa. */
  @Post('press/upload/:token')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async uploadClubPhotoByToken(
    @Param('token') token: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Body('caption') caption?: string,
    @Body('matchLabel') matchLabel?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    return this.tenantPressService.uploadPhotoByToken(
      token,
      file.buffer,
      file.mimetype,
      caption,
      matchLabel,
    );
  }

  /** Fotos públicas do clube — módulo imprensa na página. */
  @Get('tenants/:slug/press/photos')
  async getClubPressPhotos(@Param('slug') slug: string) {
    return this.tenantPressService.getPhotosBySlug(slug);
  }

  /** Token de upload ativo — botão na página pública. */
  @Get('tenants/:slug/press/upload-url')
  async getClubPressUploadUrl(@Param('slug') slug: string) {
    return this.tenantPressService.getUploadUrlBySlug(slug);
  }

  /** Se a página de imprensa exige código de acesso. */
  @Get('tenants/:slug/press/access-config')
  async getClubPressAccessConfig(@Param('slug') slug: string) {
    const requiresCode = await this.tenantPressService.pageRequiresAccessCode(slug);
    return { requiresCode };
  }

  /** Valida código temporário — retorna sessionToken para cookie. */
  @Post('tenants/:slug/press/verify-access')
  async verifyClubPressAccess(@Param('slug') slug: string, @Body() body: { code?: string }) {
    const code = (body?.code ?? '').trim();
    if (!code) throw new BadRequestException('Informe o código de acesso.');
    return this.tenantPressService.verifyPageAccessCode(slug, code);
  }

  /** Verifica sessão (cookie) de acesso à imprensa. */
  @Post('tenants/:slug/press/check-access')
  async checkClubPressAccess(@Param('slug') slug: string, @Body() body: { sessionToken?: string }) {
    const token = (body?.sessionToken ?? '').trim();
    if (!token) return { ok: false };
    const ok = await this.tenantPressService.checkPageAccessSession(slug, token);
    return { ok };
  }

  /** Solicitação de credencial de imprensa. */
  @Post('tenants/:slug/press/credential-request')
  async submitPressCredentialRequest(
    @Param('slug') slug: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      outlet?: string;
      document?: string;
      eventLabel?: string;
      notes?: string;
    },
  ) {
    const name = body.name?.trim();
    const email = body.email?.trim();
    if (!name || !email) throw new BadRequestException('Nome e e-mail são obrigatórios.');
    return this.tenantPressService.submitCredentialRequest(slug, {
      name,
      email,
      phone: body.phone,
      outlet: body.outlet,
      document: body.document,
      eventLabel: body.eventLabel,
      notes: body.notes,
    });
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

  /** Fixtures (próximos/últimos) a partir do conteúdo do evento — módulos proximos_eventos / ultimos_eventos. */
  @Get('events/:slug/fixtures')
  async getEventFixtures(@Param('slug') slug: string) {
    return this.publicService.getFixturesForEventSlug(slug);
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
  async getTenantFixtures(
    @Param('slug') slug: string,
    @Query('forStandings') forStandings?: string,
  ) {
    if (forStandings === '1' || forStandings === 'true') {
      return this.publicService.getFixturesForStandingsSlug(slug);
    }
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

  /** Boston TV — telas numeradas do Hall (instalação, sem tokens). */
  @Get('boston-tv/hall/screens')
  listBostonTvHallScreens() {
    return this.bostonTvService.listHallInstallerScreens();
  }

  /** Boston TV — playlists do Hall + Canal Hall (escolha na TV). */
  @Get('boston-tv/hall/playlists')
  listBostonTvHallPlaylists() {
    return this.bostonTvService.listHallPublicPlaylistsForInstall();
  }

  /** Boston TV — vincula Canal Hall ou playlist individual na tela. */
  @Post('boston-tv/hall/:num/playlist')
  bindBostonTvHallScreenPlaylist(
    @Param('num') numStr: string,
    @Body() body: { hallSyncMode: string; playlistId?: string },
  ) {
    const num = parseInt(numStr, 10);
    return this.bostonTvService.bindHallScreenPlaylistForInstall(
      num,
      body.hallSyncMode,
      body.playlistId,
    );
  }

  /** Boston TV — token do player pelo número da tela no Hall (ex.: 1 → USA). */
  @Get('boston-tv/hall/:num/player-token')
  async resolveBostonTvHallPlayerToken(@Param('num') numStr: string) {
    const num = parseInt(numStr, 10);
    const playerToken = await this.bostonTvService.resolveHallScreenPlayerToken(num);
    return { num, playerToken };
  }

  /** Boston TV — configuração para o player web (Smart TV via URL com token secreto). */
  @Get('boston-tv/play/:token')
  getBostonTvPlayer(@Param('token') token: string) {
    return this.bostonTvService.getPublicPlayerPayload(token);
  }

  @Post('boston-tv/play/:token/ping')
  bostonTvPing(@Param('token') token: string) {
    return this.bostonTvService.touchPlayer(token);
  }

  /** Proxy do stream IPTV — evita CORS e esconde URL upstream na TV. */
  @Get('boston-tv/play/:token/stream')
  async bostonTvStream(
    @Param('token') token: string,
    @Query('i') itemIndex: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const index = Math.max(0, parseInt(itemIndex ?? '0', 10) || 0);
    const upstream = await this.bostonTvService.resolveIptvStreamUpstream(token, index);
    const headers: Record<string, string> = {
      'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
      Accept: '*/*',
      Connection: 'keep-alive',
    };
    const range = req.headers.range;
    if (typeof range === 'string') headers.Range = range;

    const upstreamRes = await fetch(upstream, {
      redirect: 'follow',
      headers,
    });
    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      throw new BadGatewayException('Não foi possível conectar ao servidor do canal.');
    }
    if (!upstreamRes.body) {
      throw new BadGatewayException('Canal sem resposta de vídeo.');
    }
    const contentType =
      upstreamRes.headers.get('content-type') ??
      (upstream.includes('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Accept-Ranges', 'bytes');
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (upstreamRes.status === 206) res.status(206);
    Readable.fromWeb(upstreamRes.body as import('stream/web').ReadableStream).pipe(res);
  }

  /** Cadastro por convite — formulário público (atleta ou colaborador) */
  @Get('registration-invite/:token')
  getRegistrationInvite(@Param('token') token: string) {
    return this.registrationInviteService.getPublicForm(token);
  }

  @Post('registration-invite/:token/player')
  submitPlayerRegistrationInvite(
    @Param('token') token: string,
    @Body() body: SubmitPlayerRegistrationDto,
  ) {
    return this.registrationInviteService.submitPlayer(token, body);
  }

  @Post('venue-lead')
  createVenueLead(
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
      eventType?: string;
      guestCount?: number | string;
      preferredDate?: string;
      venue?: string;
    },
  ) {
    const name = body.name?.trim();
    const email = body.email?.trim();
    const message = body.message?.trim();
    if (!name || !email || !message) {
      throw new BadRequestException('Nome, email e mensagem são obrigatórios');
    }
    const guestRaw = body.guestCount;
    const guestCount =
      typeof guestRaw === 'number'
        ? guestRaw
        : typeof guestRaw === 'string' && guestRaw.trim()
          ? Number.parseInt(guestRaw, 10)
          : undefined;

    return this.bostonCityHallService.createPipelineLeadFromWebsite({
      name,
      email,
      phone: body.phone?.trim(),
      message,
      eventType: body.eventType?.trim(),
      guestCount: Number.isFinite(guestCount) ? guestCount : undefined,
      preferredDate: body.preferredDate?.trim(),
    });
  }

  @Post('registration-invite/:token/employee')
  submitEmployeeRegistrationInvite(
    @Param('token') token: string,
    @Body() body: SubmitEmployeeRegistrationDto,
  ) {
    return this.registrationInviteService.submitEmployee(token, body);
  }

  @Post('registration-invite/:token/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadRegistrationInviteDocument(
    @Param('token') token: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string } | undefined,
    @Body('name') name?: string,
    @Body('documentType') documentType?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    return this.registrationInviteService.uploadDocument(
      token,
      file,
      name ?? '',
      documentType ?? '',
    );
  }
}
