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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { TimeRhService } from './time-rh.service';
import { RhScopeService } from './rh-scope.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';

@Controller('rh/time')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, RhCapabilityGuard)
@RequireModule(['adm_rh', 'rh_time_view', 'rh_time_manage'])
export class TimeRhController {
  constructor(
    private readonly service: TimeRhService,
    private readonly scope: RhScopeService,
  ) {}

  @Get('work-regimes')
  @RequireRh('rh_time_view')
  workRegimes(@Req() req: Request & { user: CognitoJwtPayload }, @Query('tenantId') tenantId?: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.listWorkRegimes(tenantId, allowed),
    );
  }

  @Post('work-regimes')
  @RequireRh('rh_work_regime_manage')
  upsertWorkRegime(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      id?: string;
      tenantId: string;
      code: string;
      name: string;
      description?: string;
      config?: object;
      active?: boolean;
    },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.upsertWorkRegime(body, allowed),
    );
  }

  @Post('work-regimes/assign')
  @RequireRh('rh_work_regime_manage')
  assignWorkRegime(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: { employmentId: string; workRegimeId: string; effectiveFrom: string; effectiveTo?: string | null },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.assignWorkRegime(body, allowed),
    );
  }

  @Get('occurrences')
  @RequireRh('rh_time_view')
  occurrences(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('employmentId') employmentId?: string,
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.listOccurrences({ tenantId, employmentId }, allowed),
    );
  }

  @Post('occurrences')
  @RequireRh('rh_time_manage')
  createOccurrence(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      employmentId: string;
      occurrenceType: string;
      occurrenceDate: string;
      hours?: number;
      days?: number;
      reason?: string;
      notes?: string;
      treatment?: string;
    },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.createOccurrence(body, allowed, getRhActor(this.scope, req)),
    );
  }

  @Get('time-bank/balance')
  @RequireRh('rh_time_bank_view')
  timeBankBalance(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('employmentId') employmentId: string,
  ) {
    if (!employmentId?.trim()) throw new BadRequestException('employmentId é obrigatório.');
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.getTimeBankBalance(employmentId.trim(), allowed),
    );
  }

  @Post('time-bank/movements')
  @RequireRh('rh_time_bank_manage')
  timeBankMovement(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      employmentId: string;
      movementType: 'CREDIT' | 'DEBIT';
      movementDate: string;
      hours: number;
      reason?: string;
      origin?: string;
    },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.createTimeBankMovement(body, allowed, getRhActor(this.scope, req)),
    );
  }

  @Patch('occurrences/:id')
  @RequireRh('rh_time_manage')
  patchOccurrence(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.updateOccurrence(id, body as never, allowed),
    );
  }

  @Delete('occurrences/:id')
  @RequireRh('rh_time_manage')
  deleteOccurrence(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.deleteOccurrence(id, allowed));
  }

  @Post('clock-batches/:id/employees')
  @RequireRh('rh_time_clock_docs')
  linkClockEmployees(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { links: Array<{ employmentId?: string; employeeId?: string; notes?: string }> },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.linkClockBatchEmployees(id, body.links ?? [], allowed),
    );
  }

  @Get('clock-batches')
  @RequireRh('rh_time_clock_docs')
  clockBatches(@Req() req: Request & { user: CognitoJwtPayload }, @Query('tenantId') tenantId?: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.listTimeClockBatches(tenantId, allowed),
    );
  }

  @Post('clock-batches/upload')
  @RequireRh('rh_time_clock_docs')
  @UseInterceptors(FileInterceptor('file'))
  async uploadClockBatch(
    @Req() req: Request & { user: CognitoJwtPayload },
    @UploadedFile() file: { buffer: Buffer; originalname?: string },
    @Body() body: { tenantId: string; referenceMonth: string; notes?: string },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Envie o PDF do espelho de ponto.');
    if (!body.tenantId?.trim() || !body.referenceMonth?.trim()) {
      throw new BadRequestException('tenantId e referenceMonth são obrigatórios.');
    }
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.uploadTimeClockBatch(
      {
        tenantId: body.tenantId.trim(),
        referenceMonth: body.referenceMonth.trim(),
        fileName: file.originalname || 'espelho-ponto.pdf',
        notes: body.notes,
        buffer: file.buffer,
      },
      allowed,
      getRhActor(this.scope, req),
    );
  }
}
