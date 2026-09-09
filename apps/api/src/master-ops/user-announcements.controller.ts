import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { MeService } from '../auth/me.service';
import { AnnouncementsService } from './announcements.service';

@Controller('me/announcements')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class UserAnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly meService: MeService,
  ) {}

  private async resolveUserId(req: Request & { user: CognitoJwtPayload }) {
    const user =
      (await this.meService.findUserByCognitoSub(req.user.sub)) ??
      (await this.meService.findUserById(req.user.sub));
    if (!user) return null;
    return user.id;
  }

  @Get()
  async list(@Req() req: Request & { user: CognitoJwtPayload }) {
    const userId = await this.resolveUserId(req);
    if (!userId) return [];
    return this.announcementsService.listActiveForUser(userId);
  }

  @Post(':id/read')
  async read(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const userId = await this.resolveUserId(req);
    if (!userId) return { ok: false };
    return this.announcementsService.markRead(userId, id);
  }

  @Post(':id/dismiss')
  async dismiss(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const userId = await this.resolveUserId(req);
    if (!userId) return { ok: false };
    return this.announcementsService.dismiss(userId, id);
  }
}
