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
import { MediaStorageAuditService } from './media-storage-audit.service';
import { S3Service } from '../s3/s3.service';
import { displayNameFromUploadFilename } from '../common/upload-display-name';

function assertSuperAdmin(req: Request): void {
  const user = (req as Request & { user?: CognitoJwtPayload }).user;
  const role = user?.role;
  const groups = user?.['cognito:groups'] ?? [];
  if (role !== 'super_admin' && !groups.includes('super_admin')) {
    throw new ForbiddenException('Apenas super admin pode executar esta operação.');
  }
}

@Controller('media')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class MediaController {
  constructor(
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
    private readonly externalLogosMigration: ExternalLogosMigrationService,
    private readonly storageAuditService: MediaStorageAuditService,
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
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
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
    const isRhDocumentos = sizeLower === 'rh_documentos';
    const isImprensaDocs = sizeLower === 'imprensa_docs';
    const isLogisticaComprovantes = sizeLower === 'logistica_comprovantes';
    const isFutebolTreinadores = sizeLower === 'futebol_treinadores';
    const isHinoAudio = sizeLower === 'hino';
    const isBcgTv = sizeLower === 'bcg_tv';
    const audioMime = file.mimetype === 'audio/mp3' ? 'audio/mpeg' : file.mimetype;
    const videoMime = file.mimetype.toLowerCase();
    const isAudioFile =
      audioMime === 'audio/mpeg' ||
      audioMime === 'audio/wav' ||
      audioMime === 'audio/x-wav' ||
      audioMime === 'audio/mp4' ||
      audioMime === 'audio/x-m4a' ||
      audioMime === 'audio/m4a';
    const isVideoFile =
      videoMime === 'video/mp4' ||
      videoMime === 'video/webm' ||
      videoMime === 'video/quicktime' ||
      /\.(mp4|webm|mov)$/i.test(file.originalname || '');
    const subfolder = typeof slug === 'string' && slug.trim() ? slug.trim() : undefined;
    let key: string;
    let url: string;
    if (isHinoAudio || (isAudioFile && sizeLower === 'hino')) {
      if (!isAudioFile) {
        throw new BadRequestException('Para pasta hino, envie MP3, WAV ou M4A.');
      }
      const result = await this.s3.uploadAudio(file.buffer, file.mimetype, 'hino');
      key = result.key;
      url = result.url;
    } else if (isBcgTv && isVideoFile) {
      const result = await this.s3.uploadVideo(file.buffer, videoMime, 'bcg_tv');
      key = result.key;
      url = result.url;
    } else if (isExternalLogos) {
      const result = await this.s3.uploadLogoExternal(file.buffer, file.mimetype);
      key = result.key;
      url = result.url;
    } else if (isCompetitions) {
      const result = await this.s3.uploadLogoCompetition(file.buffer, file.mimetype);
      key = result.key;
      url = result.url;
    } else if (isLogisticaComprovantes) {
      const result = await this.s3.uploadLogisticaComprovante(
        file.buffer,
        file.originalname || 'comprovante.pdf',
        file.mimetype,
      );
      key = result.key;
      url = result.url;
    } else if (isFutebolTreinadores) {
      const result = await this.s3.uploadFutebolTreinadoresFile(
        file.buffer,
        file.originalname || 'anexo.pdf',
        file.mimetype,
      );
      key = result.key;
      url = result.url;
    } else if (isRhDocumentos || isImprensaDocs) {
      const result = await this.s3.uploadRhDocument(
        file.buffer,
        file.originalname || 'documento.pdf',
        file.mimetype,
      );
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
    assertSuperAdmin(req);
    return this.externalLogosMigration.run();
  }

  /** GET /media/storage-audit — órfãos e duplicatas no bucket (super_admin). */
  @Get('storage-audit')
  async storageAudit(@Req() req: Request) {
    assertSuperAdmin(req);
    return this.storageAuditService.runAudit();
  }

  /** POST /media/purge-orphans?dryRun=1 — remove arquivos sem referência no banco. */
  @Post('purge-orphans')
  async purgeOrphans(
    @Req() req: Request,
    @Query('dryRun') dryRun?: string,
    @Query('maxDelete') maxDelete?: string,
  ) {
    assertSuperAdmin(req);
    const isDry = dryRun !== '0' && dryRun !== 'false';
    const max = maxDelete ? parseInt(maxDelete, 10) : 50;
    return this.storageAuditService.purgeOrphans(isDry, {
      maxDelete: Number.isFinite(max) ? max : 50,
    });
  }

  /** POST /media/consolidate-duplicates?dryRun=1 — unifica cópias idênticas (mesmo ETag). */
  @Post('consolidate-duplicates')
  async consolidateDuplicates(
    @Req() req: Request,
    @Query('dryRun') dryRun?: string,
    @Query('maxGroups') maxGroups?: string,
  ) {
    assertSuperAdmin(req);
    const isDry = dryRun !== '0' && dryRun !== 'false';
    const max = maxGroups ? parseInt(maxGroups, 10) : 20;
    return this.storageAuditService.consolidateDuplicates(isDry, {
      maxGroups: Number.isFinite(max) ? max : 20,
    });
  }
}
