import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { MediaMetaService } from './media-meta.service';
import { S3Service } from '../s3/s3.service';

@Controller('media')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class MediaController {
  constructor(
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
  ) {}

  /**
   * GET /media?sizeKey=hero
   * Lista imagens na pasta media/ (ou media/{sizeKey}/). Retorna key, url, size, lastModified.
   * GET /media?all=1
   * Lista tudo a partir das primeiras pastas: logos/ e media/. Retorna items com folder ('logos' | 'media').
   */
  @Get()
  async list(
    @Query('sizeKey') sizeKey?: string,
    @Query('all') all?: string,
  ) {
    let items: Array<{ key: string; url: string; size: number; lastModified: string; folder?: string }>;
    if (all === '1' || all === 'true') {
      items = await this.s3.listAllAssets();
    } else {
      items = await this.s3.listMedia(
        typeof sizeKey === 'string' && sizeKey.trim() ? sizeKey.trim() : undefined,
      );
    }
    const keys = items.map((i) => i.key);
    const displayNames = await this.mediaMeta.getDisplayNames(keys);
    const withNames = items.map((item) => ({
      ...item,
      displayName: displayNames[item.key] ?? null,
    }));
    return { items: withNames };
  }

  /**
   * GET /media/thumbnail?key=media/hero/xxx.jpg
   * Retorna a imagem do S3 (usa credenciais AWS). Para miniaturas na página Mídia.
   */
  @Get('thumbnail')
  async getThumbnail(@Query('key') key: string) {
    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new BadRequestException('Query "key" é obrigatória.');
    }
    const { body, contentType } = await this.s3.getObject(key.trim());
    return new StreamableFile(body, {
      type: contentType,
    });
  }

  /**
   * POST /media
   * Body (multipart): file (imagem), sizeKey (opcional, ex: hero, card, section_bg). Default: custom.
   * Salva em media/{sizeKey}/{uuid}.{ext}. Retorna { url, key }.
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Body('sizeKey') sizeKey?: string,
    @Body('displayName') displayName?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    const size = typeof sizeKey === 'string' && sizeKey.trim() ? sizeKey.trim() : 'custom';
    const isExternalLogos = size.toLowerCase() === 'external_logos';
    const { key, url } = isExternalLogos
      ? await this.s3.uploadLogoExternal(file.buffer, file.mimetype)
      : await this.s3.uploadMedia(file.buffer, file.mimetype, size);
    const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null;
    if (name) await this.mediaMeta.setDisplayName(key, name);
    return { url, key };
  }

  /**
   * PATCH /media — atualiza o nome exibido de um item.
   * Body: { key: string (caminho S3), displayName: string | null }
   */
  @Patch()
  async updateDisplayName(
    @Body('key') key?: string,
    @Body('displayName') displayName?: string | null,
  ) {
    const k = typeof key === 'string' ? key.trim() : '';
    if (!k) throw new BadRequestException('Campo "key" é obrigatório.');
    const name = displayName === null || displayName === undefined ? null : String(displayName);
    await this.mediaMeta.setDisplayName(k, name);
    return { ok: true };
  }
}
