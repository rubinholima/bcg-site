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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { BostonTvService } from './boston-tv.service';
import { CreateBostonTvPlaylistDto } from './dto/create-boston-tv-playlist.dto';
import { PatchBostonTvPlaylistDto } from './dto/patch-boston-tv-playlist.dto';
import { CreateBostonTvPlaylistItemDto } from './dto/create-boston-tv-item.dto';
import { PatchBostonTvPlaylistItemDto } from './dto/patch-boston-tv-item.dto';
import { CreateBostonTvScreenDto } from './dto/create-boston-tv-screen.dto';
import { PatchBostonTvScreenDto } from './dto/patch-boston-tv-screen.dto';

@Controller('boston-tv')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('boston_tv')
export class BostonTvController {
  constructor(
    private readonly bostonTv: BostonTvService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedIds(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get('playlists')
  async listPlaylists(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.listPlaylists(allowed, tenantId?.trim() || undefined);
  }

  @Get('playlists/:id')
  async getPlaylist(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.getPlaylist(id, allowed);
  }

  @Post('playlists')
  async createPlaylist(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateBostonTvPlaylistDto,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.createPlaylist({
      tenantId: dto.tenantId,
      name: dto.name,
      allowedTenantIds: allowed,
    });
  }

  @Patch('playlists/:id')
  async updatePlaylist(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: PatchBostonTvPlaylistDto,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.updatePlaylist(id, dto, allowed);
  }

  @Delete('playlists/:id')
  async deletePlaylist(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedIds(req);
    await this.bostonTv.deletePlaylist(id, allowed);
    return { ok: true };
  }

  @Post('playlists/:playlistId/items')
  async addItem(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playlistId') playlistId: string,
    @Body() dto: CreateBostonTvPlaylistItemDto,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.addPlaylistItem(
      playlistId,
      {
        contentType: dto.contentType,
        url: dto.url,
        durationSeconds: dto.durationSeconds,
        sortOrder: dto.sortOrder,
      },
      allowed,
    );
  }

  @Patch('playlists/:playlistId/items/:itemId')
  async updateItem(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playlistId') playlistId: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchBostonTvPlaylistItemDto,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.updatePlaylistItem(playlistId, itemId, dto, allowed);
  }

  @Delete('playlists/:playlistId/items/:itemId')
  async deleteItem(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playlistId') playlistId: string,
    @Param('itemId') itemId: string,
  ) {
    const allowed = await this.allowedIds(req);
    await this.bostonTv.deletePlaylistItem(playlistId, itemId, allowed);
    return { ok: true };
  }

  @Get('screens')
  async listScreens(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.listScreens(allowed, tenantId?.trim() || undefined);
  }

  @Post('screens')
  async createScreen(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateBostonTvScreenDto,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.createScreen({
      tenantId: dto.tenantId,
      name: dto.name,
      locationHint: dto.locationHint,
      playlistId: dto.playlistId,
      scheduleTimezone: dto.scheduleTimezone,
      weeklySchedule: dto.weeklySchedule,
      allowedTenantIds: allowed,
    });
  }

  @Patch('screens/:id')
  async updateScreen(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: PatchBostonTvScreenDto,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.updateScreen(
      id,
      {
        name: dto.name,
        locationHint: dto.locationHint,
        playlistId: dto.playlistId,
        scheduleTimezone: dto.scheduleTimezone,
        weeklySchedule: dto.weeklySchedule,
      },
      allowed,
    );
  }

  @Post('screens/:id/regenerate-token')
  async regenerate(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedIds(req);
    return this.bostonTv.rotateScreenToken(id, allowed);
  }

  @Delete('screens/:id')
  async deleteScreen(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedIds(req);
    await this.bostonTv.deleteScreen(id, allowed);
    return { ok: true };
  }
}
