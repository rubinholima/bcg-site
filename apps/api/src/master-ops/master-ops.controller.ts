import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { MeService } from '../auth/me.service';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PresenceService } from './presence.service';

@Controller('master')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class MasterOpsController {
  constructor(
    private readonly presenceService: PresenceService,
    private readonly announcementsService: AnnouncementsService,
    private readonly meService: MeService,
  ) {}

  private async resolveUserId(req: Request & { user: CognitoJwtPayload }) {
    const user =
      (await this.meService.findUserByCognitoSub(req.user.sub)) ??
      (await this.meService.findUserById(req.user.sub));
    if (!user) throw new UnauthorizedException('User not found');
    return user.id;
  }

  @Get('live-users')
  listLiveUsers(@Query('q') q?: string) {
    return this.presenceService.listLiveUsers(q);
  }

  @Get('announcements')
  listAnnouncements() {
    return this.announcementsService.listForMaster();
  }

  @Post('announcements')
  async createAnnouncement(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateAnnouncementDto,
  ) {
    const userId = await this.resolveUserId(req);
    return this.announcementsService.create(dto, userId);
  }

  @Patch('announcements/:id')
  updateAnnouncement(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementsService.update(id, dto);
  }

  @Delete('announcements/:id')
  removeAnnouncement(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
