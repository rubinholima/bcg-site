import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { MeService } from '../auth/me.service';
import { PresenceHeartbeatDto } from './dto/presence-heartbeat.dto';
import { PresenceService } from './presence.service';

@Controller('presence')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class PresenceController {
  constructor(
    private readonly presenceService: PresenceService,
    private readonly meService: MeService,
  ) {}

  private async resolveUser(req: Request & { user: CognitoJwtPayload }) {
    return (
      (await this.meService.findUserByCognitoSub(req.user.sub)) ??
      (await this.meService.findUserById(req.user.sub))
    );
  }

  @Post('heartbeat')
  async heartbeat(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: PresenceHeartbeatDto,
  ) {
    const user = await this.resolveUser(req);
    const role = user?.role ?? req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    if (!user) return { ok: false };
    return this.presenceService.heartbeat(
      user.id,
      role,
      dto,
      req.headers['user-agent'],
    );
  }

  @Post('end')
  async end(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: { sessionKey?: string },
  ) {
    const user = await this.resolveUser(req);
    if (!user || !body.sessionKey) return { ok: false };
    return this.presenceService.endSession(body.sessionKey, user.id);
  }
}
