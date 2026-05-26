import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { RejectRegistrationDto } from './dto/reject-registration.dto';
import { RegistrationInviteService } from './registration-invite.service';

class CreateInviteBodyDto {
  sendEmail?: boolean;
  expiresInDays?: number;
}

@Controller('registration-invites')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class RegistrationInviteController {
  constructor(private readonly service: RegistrationInviteService) {}

  @Post('player/:playerId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('cad_jogadores')
  createForPlayer(
    @Param('playerId') playerId: string,
    @Body() body: CreateInviteBodyDto,
    @Req() req: Request & { user: { sub?: string } },
  ) {
    return this.service.createForPlayer(playerId, {
      sendEmail: body.sendEmail !== false,
      expiresInDays: body.expiresInDays,
      createdByUserId: req.user.sub,
    });
  }

  @Post('employee/:employeeId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  createForEmployee(
    @Param('employeeId') employeeId: string,
    @Body() body: CreateInviteBodyDto,
    @Req() req: Request & { user: { sub?: string } },
  ) {
    return this.service.createForEmployee(employeeId, {
      sendEmail: body.sendEmail !== false,
      expiresInDays: body.expiresInDays,
      createdByUserId: req.user.sub,
    });
  }

  @Post('player/:playerId/whatsapp')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('cad_jogadores')
  createForPlayerWhatsApp(
    @Param('playerId') playerId: string,
    @Body() body: CreateInviteBodyDto,
    @Req() req: Request & { user: { sub?: string } },
  ) {
    return this.service.createForPlayer(playerId, {
      sendEmail: false,
      expiresInDays: body.expiresInDays,
      createdByUserId: req.user.sub,
    });
  }

  @Post('employee/:employeeId/whatsapp')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  createForEmployeeWhatsApp(
    @Param('employeeId') employeeId: string,
    @Body() body: CreateInviteBodyDto,
    @Req() req: Request & { user: { sub?: string } },
  ) {
    return this.service.createForEmployee(employeeId, {
      sendEmail: false,
      expiresInDays: body.expiresInDays,
      createdByUserId: req.user.sub,
    });
  }

  @Get('pending')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  listPending(@Query('tenantId') tenantId?: string) {
    return this.service.listPendingReviews(tenantId);
  }

  @Get('pending/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  getPendingDetail(@Param('id') id: string) {
    return this.service.getReviewDetail(id);
  }

  @Post('pending/:id/approve')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  approve(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub?: string } },
  ) {
    return this.service.approveReview(id, req.user.sub);
  }

  @Post('pending/:id/reject')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  reject(
    @Param('id') id: string,
    @Body() body: RejectRegistrationDto,
    @Req() req: Request & { user: { sub?: string } },
  ) {
    return this.service.rejectReview(id, body, req.user.sub);
  }
}
