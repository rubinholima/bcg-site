import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { HomeContentService } from '../home-content/home-content.service';
import { PagesService } from '../pages/pages.service';
import { S3Service } from '../s3/s3.service';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly homeContentService: HomeContentService,
    private readonly pagesService: PagesService,
    private readonly s3: S3Service,
  ) {}

  @Get('portfolio')
  getPortfolio() {
    return this.publicService.getPortfolio();
  }

  @Get('home-content')
  getHomeContent() {
    return this.homeContentService.get();
  }

  /** Página modular do tenant (clube/empresa) pelo slug — para /portfolio/[slug] */
  @Get('page-by-slug/:slug')
  async getPageByTenantSlug(@Param('slug') slug: string) {
    const page = await this.pagesService.findByTenantSlug(slug);
    if (!page) return null;
    return page;
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
