import {
  BadRequestException,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TryoutWorkflowService } from './tryout-workflow.service';
import { TryoutSupervisionValidateDto } from './dto/tryout-supervision.dto';
import { TryoutRenewPeriodDto, TryoutEarlyApprovalDto } from './dto/tryout-renewal.dto';
import { CreateTryoutCoachEvaluationDto } from './dto/tryout-coach-evaluation.dto';
import { UpdateTryoutRegistrationDto } from './dto/tryout-registration.dto';
import { TryoutArrivalDto } from './dto/tryout-arrival.dto';
import { ManagerDecisionDto } from '../captacao/dto/manager-decision.dto';

@Controller('tryout-workflow')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class TryoutWorkflowController {
  constructor(private readonly service: TryoutWorkflowService) {}

  @Get('hub')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  hub(@Query('tenantId') tenantId: string, @Query('stage') stage?: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obrigatório');
    return this.service.getHub(tenantId.trim(), stage);
  }

  @Get('reporting')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  reporting(
    @Query('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('targetCategory') targetCategory?: string,
    @Query('referralSource') referralSource?: string,
    @Query('stage') stage?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obrigatório');
    return this.service.getReporting(tenantId.trim(), {
      from,
      to,
      targetCategory,
      referralSource,
      stage,
    });
  }

  @Get('prospects/:id/dossier')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  dossier(@Param('id') id: string) {
    return this.service.getDossier(id);
  }

  @Patch('prospects/:id/arrival')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  arrival(@Param('id') id: string, @Body() dto: TryoutArrivalDto) {
    return this.service.setArrival(id, dto);
  }

  @Post('prospects/:id/supervision/validate')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  supervisionValidate(
    @Param('id') id: string,
    @Body() dto: TryoutSupervisionValidateDto,
    @Req() req: { user: { name?: string; email?: string } },
  ) {
    const actor =
      (req.user?.name as string) || (req.user?.email as string) || 'Supervisão';
    return this.service.validateSupervision(id, dto, actor);
  }

  @Post('prospects/:id/renew-period')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  renew(
    @Param('id') id: string,
    @Body() dto: TryoutRenewPeriodDto,
    @Req() req: { user: { name?: string; email?: string } },
  ) {
    const actor =
      (req.user?.name as string) || (req.user?.email as string) || 'Operação';
    return this.service.renewPeriod(id, dto, actor);
  }

  @Post('prospects/:id/early-approval')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  earlyApproval(
    @Param('id') id: string,
    @Body() dto: TryoutEarlyApprovalDto,
    @Req() req: { user: { name?: string; email?: string } },
  ) {
    const actor =
      (req.user?.name as string) || (req.user?.email as string) || 'Operação';
    return this.service.earlyApproval(id, dto, actor);
  }

  @Post('prospects/:id/coach-evaluation')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_treinadores', 'futebol_captacao'])
  coachEvaluation(
    @Param('id') id: string,
    @Body() dto: CreateTryoutCoachEvaluationDto,
    @Req() req: { user: { sub?: string; id?: string } },
  ) {
    const userId = (req.user?.sub as string) || (req.user?.id as string);
    return this.service.createCoachEvaluation(id, dto, userId);
  }

  @Post('prospects/:id/manager-decision')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  managerDecision(
    @Param('id') id: string,
    @Body() dto: ManagerDecisionDto,
    @Req() req: { user: { name?: string; email?: string; role?: string } },
  ) {
    return this.service.recordTryoutManagerDecision(id, dto, {
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role,
    });
  }

  @Patch('prospects/:id/registration')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  registration(@Param('id') id: string, @Body() dto: UpdateTryoutRegistrationDto) {
    return this.service.updateRegistration(id, dto);
  }
}
