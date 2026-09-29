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
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { MedicalEncountersService } from './medical-encounters.service';
import {
  CreateMedicalEncounterDto,
  UpdateMedicalEncounterDto,
} from './dto/medical-encounter.dto';

@Controller('medical-encounters')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('medico')
export class MedicalEncountersController {
  constructor(
    private readonly service: MedicalEncountersService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get('referral-options/:playerId')
  async referralOptions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    return this.service.getReferralOptions(playerId, await this.allowedTenants(req));
  }

  @Get('timeline/:playerId')
  async timeline(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    return this.service.getTimeline(playerId, await this.allowedTenants(req));
  }

  @Get()
  async list(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('playerId') playerId?: string,
  ) {
    return this.service.listEncounters(
      { tenantId, playerId },
      await this.allowedTenants(req),
    );
  }

  @Get(':id')
  async findOne(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    return this.service.findOne(id, await this.allowedTenants(req));
  }

  @Post()
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateMedicalEncounterDto,
  ) {
    return this.service.create(dto, await this.allowedTenants(req), req.user.sub);
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateMedicalEncounterDto,
  ) {
    return this.service.update(id, dto, await this.allowedTenants(req));
  }
}
