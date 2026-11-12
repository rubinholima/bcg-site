import {
  Body,
  Controller,
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
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { HiringRequestsService } from './hiring-requests.service';
import {
  CreateRhHiringRequestDto,
  TransitionRhHiringStatusDto,
  UpdateRhHiringRequestDto,
} from './dto/hiring-request.dto';
import { RhScopeService } from './rh-scope.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';

@Controller('rh/hiring-requests')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, RhCapabilityGuard)
@RequireModule(['adm_rh', 'rh_hiring_view', 'rh_hiring_manage'])
export class HiringRequestsController {
  constructor(
    private readonly service: HiringRequestsService,
    private readonly scope: RhScopeService,
  ) {}

  @Get()
  @RequireRh('rh_hiring_view')
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findAll({ tenantId, status }, allowed);
  }

  @Get(':id')
  @RequireRh('rh_hiring_view')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findOne(id, allowed);
  }

  @Post()
  @RequireRh('rh_hiring_manage')
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateRhHiringRequestDto) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(dto, allowed, getRhActor(this.scope, req));
  }

  @Patch(':id')
  @RequireRh('rh_hiring_manage')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateRhHiringRequestDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.update(id, dto, allowed, getRhActor(this.scope, req));
  }

  @Post(':id/transition')
  @RequireRh('rh_hiring_manage')
  async transition(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: TransitionRhHiringStatusDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.transition(id, dto, allowed, getRhActor(this.scope, req));
  }
}
