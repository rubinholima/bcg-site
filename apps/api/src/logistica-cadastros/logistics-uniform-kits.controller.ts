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
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { UniformKitAccess } from '../auth/require-module.decorator';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { LogisticsUniformKitsService } from './logistics-uniform-kits.service';
import {
  CreateLogisticsUniformKitDto,
  UpdateLogisticsUniformKitDto,
} from './dto/create-logistics-uniform-kit.dto';

@Controller('logistica-cadastros/uniform-kits')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
export class LogisticsUniformKitsController {
  constructor(private readonly kits: LogisticsUniformKitsService) {}

  private actor(req: Request & { user?: CognitoJwtPayload }) {
    const user = req.user!;
    const role = user.role ?? user['cognito:groups']?.[0] ?? 'user';
    return { sub: user.sub, role };
  }

  @Get()
  @UniformKitAccess('logistics_read')
  findUniformKits(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
    @Query('uniformTypeId') uniformTypeId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.kits.findUniformKits(
      this.actor(req),
      activeOnly,
      search,
      uniformTypeId,
      tenantId,
    );
  }

  @Post()
  @UniformKitAccess('manage')
  createUniformKit(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Body() dto: CreateLogisticsUniformKitDto,
  ) {
    return this.kits.createUniformKit(this.actor(req), dto);
  }

  @Get(':id')
  @UniformKitAccess('logistics_read')
  findUniformKit(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    return this.kits.findUniformKit(this.actor(req), id);
  }

  @Patch(':id')
  @UniformKitAccess('manage')
  updateUniformKit(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsUniformKitDto,
  ) {
    return this.kits.updateUniformKit(this.actor(req), id, dto);
  }

  @Delete(':id')
  @UniformKitAccess('manage')
  removeUniformKit(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    return this.kits.removeUniformKit(this.actor(req), id);
  }
}
