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
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { FutebolJogosService } from './futebol-jogos.service';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('futebol-jogos')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_jogos')
export class FutebolJogosController {
  constructor(private readonly service: FutebolJogosService) {}

  @Get()
  listGames(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('season') season?: string,
    @Query('status') status?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    const seasonNum = season ? Number(season) : undefined;
    return this.service.listGames({
      tenantId: tenantId.trim(),
      category: category?.trim() || undefined,
      season: Number.isFinite(seasonNum) ? seasonNum : undefined,
      status: status?.trim() || undefined,
    });
  }

  @Delete('incidents/:id')
  deleteIncident(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.deleteIncident(tenantId.trim(), id);
  }

  @Patch('incidents/:id')
  updateIncident(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.updateIncident({
      tenantId: tenantId.trim(),
      incidentId: id,
      kind: body.kind,
      description: body.description,
      minute: body.minute,
      period: body.period,
    });
  }

  @Delete('attachments/:id')
  deleteAttachment(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.deleteAttachment(tenantId.trim(), id);
  }

  @Post(':gameKey/incidents')
  createIncident(
    @Param('gameKey') gameKey: string,
    @Query('tenantId') tenantId: string,
    @Req() req: AuthedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.createIncident({
      tenantId: tenantId.trim(),
      gameKey,
      kind: body.kind,
      description: body.description,
      minute: body.minute,
      period: body.period,
      authorUserId: req.user?.sub,
    });
  }

  @Post(':gameKey/attachments')
  createAttachment(
    @Param('gameKey') gameKey: string,
    @Query('tenantId') tenantId: string,
    @Req() req: AuthedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.createAttachment({
      tenantId: tenantId.trim(),
      gameKey,
      label: body.label,
      fileUrl: body.fileUrl,
      kind: body.kind,
      authorUserId: req.user?.sub,
    });
  }

  @Get(':gameKey')
  getGameDetail(
    @Param('gameKey') gameKey: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    return this.service.getGameDetail(tenantId.trim(), gameKey);
  }
}
