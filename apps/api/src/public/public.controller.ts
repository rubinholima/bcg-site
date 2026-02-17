import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { GroupService } from '../group/group.service';
import { HomeContentService } from '../home-content/home-content.service';
import { PagesService } from '../pages/pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { WorkMailService } from '../workmail/workmail.service';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly groupService: GroupService,
    private readonly homeContentService: HomeContentService,
    private readonly pagesService: PagesService,
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
   * GET /public/tenants/:slug/fixtures
   * Próximos jogos do tenant (clube). Usado pelo módulo "Próximos Jogos" na página pública.
   */
  @Get('tenants/:slug/fixtures')
  async getTenantFixtures(@Param('slug') slug: string) {
    return this.publicService.getFixturesForTenantSlug(slug);
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
