import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { GroupService } from '../group/group.service';
import { MediaMetaService } from '../media/media-meta.service';
import { S3Service } from '../s3/s3.service';
import { TenantsService } from '../tenants/tenants.service';

@Controller('upload')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class UploadController {
  constructor(
    private readonly s3: S3Service,
    private readonly tenantsService: TenantsService,
    private readonly groupService: GroupService,
    private readonly mediaMeta: MediaMetaService,
  ) {}

  /**
   * POST /upload/logo
   * Body (multipart/form-data): file (imagem), scope ('group' ou tenantId)
   * - scope=group → apenas super_admin; logo do grupo (logos/group/logo.{ext})
   * - scope={tenantId} → logo da empresa; atualiza Tenant.logoUrl
   */
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  async uploadLogo(
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Body('scope') scope: string | undefined,
    @Body('displayName') displayName: string | undefined,
    @Req() req: Request,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    if (!scope || typeof scope !== 'string' || !scope.trim()) {
      throw new BadRequestException(
        'Envie "scope": "group" (logo BCG), "external" (Clubes Adv) ou o ID da empresa (tenantId).',
      );
    }
    const scopeTrim = scope.trim();

    if (scopeTrim === 'external') {
      const { key, url } = await this.s3.uploadLogoExternal(file.buffer, file.mimetype);
      return { url, key };
    }

    if (scopeTrim === 'group') {
      const user = (req as Request & { user?: { 'cognito:groups'?: string[] } }).user;
      const groups = user?.['cognito:groups'] ?? [];
      if (!groups.includes('super_admin')) {
        throw new ForbiddenException('Apenas super admin pode alterar o logo do grupo master.');
      }
    }
    if (scopeTrim !== 'group') {
      try {
        await this.tenantsService.findOne(scopeTrim);
      } catch {
        throw new NotFoundException(
          `Empresa com ID "${scopeTrim}" não encontrada.`,
        );
      }
    }

    const { key, url } = await this.s3.uploadLogo(
      file.buffer,
      file.mimetype,
      scopeTrim,
    );

    if (scopeTrim === 'group') {
      await this.groupService.updateLogoUrl('bcg', url);
    } else {
      await this.tenantsService.updateLogoUrl(scopeTrim, url);
    }

    const displayNameTrim =
      typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null;
    if (displayNameTrim) {
      await this.mediaMeta.setDisplayName(key, displayNameTrim);
    }

    return { url, key };
  }
}
