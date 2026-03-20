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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EventsService } from './events.service';
import type {
  CreateEventDto,
  UpdateEventDto,
} from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  findAll(
    @Query('organizer') organizer?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.eventsService.findAll({
      organizer: organizer || undefined,
      category: category || undefined,
      status: status || undefined,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':eventId/photos')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  addPhoto(
    @Param('eventId') eventId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Body('caption') caption?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    return this.eventsService.addPhoto(eventId, file.buffer, file.mimetype, caption);
  }

  @Get(':eventId/photos')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  listPhotos(@Param('eventId') eventId: string) {
    return this.eventsService.listPhotos(eventId);
  }

  @Delete(':eventId/photos/:photoId')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  removePhoto(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.eventsService.removePhoto(photoId);
  }

  @Post(':eventId/gallery-links')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  createGalleryLink(
    @Param('eventId') eventId: string,
    @Body() body: { temporary?: boolean; expiresInDays?: number },
  ) {
    const temporary = body?.temporary ?? false;
    const expiresInDays = typeof body?.expiresInDays === 'number' ? body.expiresInDays : 7;
    return this.eventsService.createGalleryLink(eventId, { temporary, expiresInDays });
  }

  @Get(':eventId/gallery-links')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  listGalleryLinks(@Param('eventId') eventId: string) {
    return this.eventsService.listGalleryLinks(eventId);
  }

  @Delete(':eventId/gallery-links/:linkId')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  revokeGalleryLink(
    @Param('eventId') eventId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.eventsService.revokeGalleryLink(linkId);
  }

  @Post(':eventId/upload-tokens')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  createUploadToken(
    @Param('eventId') eventId: string,
    @Body() body: { expiresInDays?: number },
  ) {
    return this.eventsService.createUploadToken(eventId, body);
  }

  @Get(':eventId/upload-tokens')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  listUploadTokens(@Param('eventId') eventId: string) {
    return this.eventsService.listUploadTokens(eventId);
  }

  @Delete(':eventId/upload-tokens/:tokenId')
  @UseGuards(JwtAuthGuard, ModuleAccessGuard)
  @RequireModule('eventos')
  revokeUploadToken(
    @Param('eventId') eventId: string,
    @Param('tokenId') tokenId: string,
  ) {
    return this.eventsService.revokeUploadToken(tokenId);
  }
}
