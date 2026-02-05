import {
  Controller,
  Get,
  Post,
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
import { S3Service } from '../s3/s3.service';

@Controller('media')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class MediaController {
  constructor(private readonly s3: S3Service) {}

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
    if (all === '1' || all === 'true') {
      const items = await this.s3.listAllAssets();
      return { items };
    }
    const items = await this.s3.listMedia(
      typeof sizeKey === 'string' && sizeKey.trim() ? sizeKey.trim() : undefined,
    );
    return { items };
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
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    const size = typeof sizeKey === 'string' && sizeKey.trim() ? sizeKey.trim() : 'custom';
    const { key, url } = await this.s3.uploadMedia(file.buffer, file.mimetype, size);
    return { url, key };
  }
}
