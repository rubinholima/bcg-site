import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { SocialPedagogyCasesService } from './social-pedagogy-cases.service';
import { CreateSocialPedagogyCaseDto } from './dto/create-social-pedagogy-case.dto';
import { UpdateSocialPedagogyCaseDto } from './dto/update-social-pedagogy-case.dto';

@Controller('assistencia-social/cases')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_assistencia_social')
export class SocialPedagogyCasesController {
  constructor(private readonly service: SocialPedagogyCasesService) {}

  @Get()
  findByTenant(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('playerId') playerId?: string,
  ) {
    return this.service.findByTenant(tenantId, status, playerId);
  }

  @Get('by-player/:playerId')
  findByPlayer(@Param('playerId') playerId: string) {
    return this.service.findByPlayer(playerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSocialPedagogyCaseDto, @Req() req: Request & { user: CognitoJwtPayload }) {
    return this.service.create(dto, req.user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSocialPedagogyCaseDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/advance')
  advance(@Param('id') id: string) {
    return this.service.advanceStatus(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
