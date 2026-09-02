import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { FutebolExecutiveService } from './futebol-executive.service';

@Controller('futebol-executive')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class FutebolExecutiveController {
  constructor(private readonly service: FutebolExecutiveService) {}

  @Get('dashboard')
  getDashboard(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('periodDays') periodDays?: string,
  ) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const parsedPeriod = periodDays ? Number.parseInt(periodDays, 10) : undefined;
    return this.service.getDashboard(req.user.sub, role, {
      tenantId,
      category,
      periodDays: Number.isFinite(parsedPeriod) ? parsedPeriod : undefined,
    });
  }
}
