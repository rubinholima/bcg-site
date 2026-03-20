import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  BadRequestException,
  StreamableFile,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ExternalLogosMigrationService } from './external-logos-migration.service';
import { MediaMetaService } from './media-meta.service';
import { S3Service } from '../s3/s3.service';
import { displayNameFromUploadFilename } from '../common/upload-display-name';

@Controller('media')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class MediaController {
  constructor(
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
    private readonly externalLogosMigration: ExternalLogosMigrationService,
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
    @Query('slug') slug?: string,
    @Query('all') all?: string,
  ) {
    let items: Array<{ key: string; url: string; size: number; lastModified: string; folder?: string }>;
    if (all === '1' || all === 'true') {
      items = await this.s3.listAllAssets();
    } else {
      const key = typeof sizeKey === 'string' && sizeKey.trim() ? sizeKey.trim() : undefined;
      const subfolder = typeof slug === 'string' && slug.trim() ? slug.trim() : undefined;
      items = await this.s3.listMedia(key, subfolder);
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
    @UploadedFile()
    file:
      | { buffer: Buffer; mimetype: string; originalname?: string }
      | undefined,
    @Body('sizeKey') sizeKey?: string,
    @Body('slug') slug?: string,
    @Body('displayName') displayName?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    const size = typeof sizeKey === 'string' && sizeKey.trim() ? sizeKey.trim() : 'custom';
    const sizeLower = size.toLowerCase();
    const isExternalLogos = sizeLower === 'external_logos';
    const isCompetitions = sizeLower === 'competitions' || sizeLower === 'competitions_logos';
    const subfolder = typeof slug === 'string' && slug.trim() ? slug.trim() : undefined;
    let key: string;
    let url: string;
    if (isExternalLogos) {
      const result = await this.s3.uploadLogoExternal(file.buffer, file.mimetype);
      key = result.key;
      url = result.url;
    } else if (isCompetitions) {
      const result = await this.s3.uploadLogoCompetition(file.buffer, file.mimetype);
      key = result.key;
      url = result.url;
    } else {
      const result = await this.s3.uploadMedia(file.buffer, file.mimetype, size, subfolder);
      key = result.key;
      url = result.url;
    }
    const name =
      typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : displayNameFromUploadFilename(file.originalname);
    if (name) await this.mediaMeta.setDisplayName(key, name);
    return { url, key };
  }

  /**
   * DELETE /media?key=media/hero/xxx.jpg — remove imagem ou logo do S3.
   */
  @Delete()
  async delete(@Query('key') key?: string) {
    const k = typeof key === 'string' ? key.trim() : '';
    if (!k) throw new BadRequestException('Query "key" é obrigatória.');
    await this.s3.deleteObject(k);
    await this.mediaMeta.removeByKey(k);
    return { ok: true };
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

  /**
   * POST /media/migrate-external-logos — move logos de logos/external/ para logos/clubes-adv/,
   * atualiza URLs no banco (incl. blocos Próximos Jogos em Page/Event/Group). Só super_admin.
   */
  @Post('migrate-external-logos')
  async migrateExternalLogos(@Req() req: Request) {
    const user = (req as Request & { user?: CognitoJwtPayload }).user;
    const role = user?.role;
    const groups = user?.['cognito:groups'] ?? [];
    if (role !== 'super_admin' && !groups.includes('super_admin')) {
      throw new ForbiddenException('Apenas super admin pode executar a migração.');
    }
    return this.externalLogosMigration.run();
  }
}
