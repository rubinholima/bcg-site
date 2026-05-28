import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantPressService } from './tenant-press.service';

@Controller('tenants/:tenantId/press')
@UseGuards(JwtAuthGuard)
export class TenantPressController {
  constructor(private readonly pressService: TenantPressService) {}

  @Get('photos')
  listPhotos(@Param('tenantId') tenantId: string) {
    return this.pressService.listPhotos(tenantId);
  }

  @Post('photos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  addPhoto(
    @Param('tenantId') tenantId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Body('caption') caption?: string,
    @Body('matchLabel') matchLabel?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('Envie um arquivo (campo "file").');
    return this.pressService.addPhoto(tenantId, file.buffer, file.mimetype, caption, matchLabel);
  }

  @Delete('photos/:photoId')
  deletePhoto(@Param('tenantId') tenantId: string, @Param('photoId') photoId: string) {
    return this.pressService.deletePhoto(tenantId, photoId);
  }

  @Get('gallery-links')
  listGalleryLinks(@Param('tenantId') tenantId: string) {
    return this.pressService.listGalleryLinks(tenantId);
  }

  @Post('gallery-links')
  createGalleryLink(
    @Param('tenantId') tenantId: string,
    @Body() body: { temporary?: boolean; expiresInDays?: number },
  ) {
    return this.pressService.createGalleryLink(tenantId, {
      temporary: body.temporary !== false,
      expiresInDays: body.expiresInDays,
    });
  }

  @Delete('gallery-links/:linkId')
  revokeGalleryLink(@Param('linkId') linkId: string) {
    return this.pressService.revokeGalleryLink(linkId);
  }

  @Get('upload-tokens')
  listUploadTokens(@Param('tenantId') tenantId: string) {
    return this.pressService.listUploadTokens(tenantId);
  }

  @Post('upload-tokens')
  createUploadToken(
    @Param('tenantId') tenantId: string,
    @Body() body: { expiresInDays?: number },
  ) {
    return this.pressService.createUploadToken(tenantId, body);
  }

  @Delete('upload-tokens/:tokenId')
  revokeUploadToken(@Param('tokenId') tokenId: string) {
    return this.pressService.revokeUploadToken(tokenId);
  }

  @Get('page-access-codes')
  listPageAccessCodes(@Param('tenantId') tenantId: string) {
    return this.pressService.listPageAccessCodes(tenantId);
  }

  @Post('page-access-codes')
  createPageAccessCode(
    @Param('tenantId') tenantId: string,
    @Body() body: { expiresInHours?: number; label?: string },
  ) {
    return this.pressService.createPageAccessCode(tenantId, body);
  }

  @Delete('page-access-codes/:codeId')
  revokePageAccessCode(@Param('tenantId') tenantId: string, @Param('codeId') codeId: string) {
    return this.pressService.revokePageAccessCode(tenantId, codeId);
  }

  @Get('editorial')
  getEditorial(@Param('tenantId') tenantId: string) {
    return this.pressService.getEditorialContent(tenantId);
  }

  @Patch('editorial')
  updateEditorial(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      fields?: Record<string, string | undefined>;
      pressReleases?: Array<{
        id: string;
        date?: string;
        titlePt?: string;
        titleEn?: string;
        bodyPt?: string;
        bodyEn?: string;
      }>;
    },
  ) {
    return this.pressService.updateEditorialContent(tenantId, body);
  }

  @Get('credential-requests')
  listCredentialRequests(@Param('tenantId') tenantId: string) {
    return this.pressService.listCredentialRequests(tenantId);
  }

  @Patch('credential-requests/:requestId/status')
  updateCredentialStatus(
    @Param('tenantId') tenantId: string,
    @Param('requestId') requestId: string,
    @Body() body: { status?: string },
  ) {
    const status = (body.status ?? 'pending').trim();
    return this.pressService.updateCredentialRequestStatus(tenantId, requestId, status);
  }

  @Post('journalists')
  registerJournalist(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      outlet?: string;
      document?: string;
      notes?: string;
    },
  ) {
    const name = body.name?.trim();
    const email = body.email?.trim();
    if (!name || !email) throw new BadRequestException('Nome e e-mail são obrigatórios.');
    return this.pressService.registerJournalist(tenantId, {
      name,
      email,
      phone: body.phone,
      outlet: body.outlet,
      document: body.document,
      notes: body.notes,
    });
  }

  @Delete('credential-requests/:requestId')
  deleteCredentialRequest(
    @Param('tenantId') tenantId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.pressService.deleteCredentialRequest(tenantId, requestId);
  }
}
