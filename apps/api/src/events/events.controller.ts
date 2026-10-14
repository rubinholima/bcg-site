import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EventsService, type EventAccessContext } from './events.service';
import type {
  CreateEventDto,
  UpdateEventDto,
} from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  private accessFrom(req: Request & { user: CognitoJwtPayload }): EventAccessContext {
    return { jwtSub: req.user.sub, role: req.user.role };
  }

  @Get()
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('organizer') organizer?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.eventsService.findAll(
      {
        organizer: organizer || undefined,
        category: category || undefined,
        status: status || undefined,
      },
      this.accessFrom(req),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  findOne(@Param('id') id: string, @Req() req: Request & { user: CognitoJwtPayload }) {
    return this.eventsService.findOne(id, this.accessFrom(req));
  }

  @Post()
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  create(@Body() dto: CreateEventDto, @Req() req: Request & { user: CognitoJwtPayload }) {
    return this.eventsService.create(dto, this.accessFrom(req));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    return this.eventsService.update(id, dto, this.accessFrom(req));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  remove(@Param('id') id: string, @Req() req: Request & { user: CognitoJwtPayload }) {
    return this.eventsService.remove(id, this.accessFrom(req));
  }

  @Post(':eventId/photos')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async addPhoto(
    @Param('eventId') eventId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Body('caption') caption?: string,
    @Req() req?: Request & { user: CognitoJwtPayload },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    await this.eventsService.findOne(eventId, req ? this.accessFrom(req) : undefined);
    return this.eventsService.addPhoto(eventId, file.buffer, file.mimetype, caption);
  }

  @Get(':eventId/photos')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  async listPhotos(
    @Param('eventId') eventId: string,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    await this.eventsService.findOne(eventId, this.accessFrom(req));
    return this.eventsService.listPhotos(eventId);
  }

  @Delete(':eventId/photos/:photoId')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  async removePhoto(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    await this.eventsService.findOne(eventId, this.accessFrom(req));
    return this.eventsService.removePhoto(photoId);
  }

  @Post(':eventId/gallery-links')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  async createGalleryLink(
    @Param('eventId') eventId: string,
    @Body() body: { temporary?: boolean; expiresInDays?: number },
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    await this.eventsService.findOne(eventId, this.accessFrom(req));
    const temporary = body?.temporary ?? false;
    const expiresInDays = typeof body?.expiresInDays === 'number' ? body.expiresInDays : 7;
    return this.eventsService.createGalleryLink(eventId, { temporary, expiresInDays });
  }

  @Get(':eventId/gallery-links')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  async listGalleryLinks(
    @Param('eventId') eventId: string,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    await this.eventsService.findOne(eventId, this.accessFrom(req));
    return this.eventsService.listGalleryLinks(eventId);
  }

  @Delete(':eventId/gallery-links/:linkId')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  async revokeGalleryLink(
    @Param('eventId') eventId: string,
    @Param('linkId') linkId: string,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    await this.eventsService.findOne(eventId, this.accessFrom(req));
    return this.eventsService.revokeGalleryLink(linkId);
  }

  @Post(':eventId/upload-tokens')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  async createUploadToken(
    @Param('eventId') eventId: string,
    @Body() body: { expiresInDays?: number },
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    await this.eventsService.findOne(eventId, this.accessFrom(req));
    return this.eventsService.createUploadToken(eventId, body);
  }

  @Get(':eventId/upload-tokens')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  async listUploadTokens(
    @Param('eventId') eventId: string,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    await this.eventsService.findOne(eventId, this.accessFrom(req));
    return this.eventsService.listUploadTokens(eventId);
  }

  @Delete(':eventId/upload-tokens/:tokenId')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  async revokeUploadToken(
    @Param('eventId') eventId: string,
    @Param('tokenId') tokenId: string,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    await this.eventsService.findOne(eventId, this.accessFrom(req));
    return this.eventsService.revokeUploadToken(tokenId);
  }
}
