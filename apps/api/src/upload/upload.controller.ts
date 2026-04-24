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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { GroupService } from '../group/group.service';
import { MediaMetaService } from '../media/media-meta.service';
import { S3Service } from '../s3/s3.service';
import { TenantsService } from '../tenants/tenants.service';
import { EventsService } from '../events/events.service';
import { displayNameFromUploadFilename } from '../common/upload-display-name';

@Controller('upload')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class UploadController {
  constructor(
    private readonly s3: S3Service,
    private readonly tenantsService: TenantsService,
    private readonly groupService: GroupService,
    private readonly mediaMeta: MediaMetaService,
    private readonly eventsService: EventsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  /**
   * POST /upload/logo
   * Body (multipart/form-data): file (imagem), scope
   * - scope=group → logo BCG (logos/group/)
   * - scope=external → Clubes Adv (logos/clubes-adv/)
   * - scope=event:{eventId} → logo do evento (logos/eventos/)
   * - scope={tenantId} → logo da empresa (logos/tenants/)
   */
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  async uploadLogo(
    @UploadedFile()
    file:
      | { buffer: Buffer; mimetype: string; originalname?: string }
      | undefined,
    @Body('scope') scope: string | undefined,
    @Body('displayName') displayName: string | undefined,
    @Req() req: Request,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    if (!scope || typeof scope !== 'string' || !scope.trim()) {
      throw new BadRequestException(
        'Envie "scope": "group", "external", "event:{eventId}" ou o ID da empresa (tenantId).',
      );
    }
    const scopeTrim = scope.trim();

    if (scopeTrim.startsWith('event:')) {
      const eventId = scopeTrim.replace(/^event:/, '').trim();
      if (!eventId) {
        throw new BadRequestException('scope=event:{eventId} — informe o ID do evento.');
      }
      try {
        await this.eventsService.findOne(eventId);
      } catch {
        throw new NotFoundException(`Evento com ID "${eventId}" não encontrado.`);
      }
      const { key, url } = await this.s3.uploadLogoEvent(
        eventId,
        file.buffer,
        file.mimetype,
      );
      const displayNameTrim =
        typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null;
      if (displayNameTrim) {
        await this.mediaMeta.setDisplayName(key, displayNameTrim);
      }
      return { url, key };
    }

    if (scopeTrim === 'external') {
      const { key, url } = await this.s3.uploadLogoExternal(
        file.buffer,
        file.mimetype,
      );
      const displayNameTrim =
        typeof displayName === 'string' && displayName.trim()
          ? displayName.trim()
          : displayNameFromUploadFilename(file.originalname);
      if (displayNameTrim) {
        await this.mediaMeta.setDisplayName(key, displayNameTrim);
      }
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
      const user = (req as Request & { user?: CognitoJwtPayload }).user;
      if (!user?.sub) {
        throw new UnauthorizedException();
      }
      const role = user.role ?? user['cognito:groups']?.[0] ?? 'user';
      const allowed = await this.tenantAccess.getAllowedTenantIds(user.sub, role);
      try {
        await this.tenantsService.findOne(scopeTrim, allowed);
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
      const user = (req as Request & { user?: CognitoJwtPayload }).user;
      if (!user?.sub) {
        throw new UnauthorizedException();
      }
      const role = user.role ?? user['cognito:groups']?.[0] ?? 'user';
      const allowed = await this.tenantAccess.getAllowedTenantIds(user.sub, role);
      await this.tenantsService.updateLogoUrl(scopeTrim, url, allowed);
    }

    const displayNameTrim =
      typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null;
    if (displayNameTrim) {
      await this.mediaMeta.setDisplayName(key, displayNameTrim);
    }

    return { url, key };
  }
}
