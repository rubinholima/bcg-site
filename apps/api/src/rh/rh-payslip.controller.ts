import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { RhPayslipService } from './rh-payslip.service';
import { RhScopeService } from './rh-scope.service';
import { ModulesService } from '../modules/modules.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';
import { S3Service } from '../s3/s3.service';

@Controller('rh/payslips')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, RhCapabilityGuard)
@RequireModule(['adm_rh', 'rh_payslip_batch', 'rh_payslip_individual'])
export class RhPayslipController {
  constructor(
    private readonly service: RhPayslipService,
    private readonly scope: RhScopeService,
    private readonly modules: ModulesService,
    private readonly s3: S3Service,
  ) {}

  @Get('batches')
  @RequireRh('rh_payslip_batch')
  batches(@Req() req: Request & { user: CognitoJwtPayload }, @Query('tenantId') tenantId?: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.listBatches(tenantId, allowed));
  }

  @Post('batches/upload')
  @RequireRh('rh_payslip_batch')
  @UseInterceptors(FileInterceptor('file'))
  uploadBatch(
    @Req() req: Request & { user: CognitoJwtPayload },
    @UploadedFile() file: { buffer: Buffer; originalname?: string },
    @Body() body: { tenantId: string; referenceMonth: string; notes?: string },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Envie o PDF do lote.');
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.uploadBatch(
        {
          tenantId: body.tenantId,
          referenceMonth: body.referenceMonth,
          notes: body.notes,
          fileName: file.originalname || 'contracheques.pdf',
          buffer: file.buffer,
        },
        allowed,
        getRhActor(this.scope, req),
      ),
    );
  }

  @Post('batches/:id/assign-pages')
  @RequireRh('rh_payslip_batch')
  assignPages(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { assignments: Array<{ employeeId: string; employmentId?: string; pageFrom: number; pageTo: number }> },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.assignPages(id, body.assignments ?? [], allowed, getRhActor(this.scope, req)),
    );
  }

  @Post('batches/:id/extract')
  @RequireRh('rh_payslip_batch')
  extract(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.extractIndividuals(id, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post('individuals/:id/transition')
  @RequireRh('rh_payslip_individual')
  transition(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { toStatus: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then(async (allowed) => {
      const slugs = await this.modules.getSlugsForActor(req.user.sub, req.user.role ?? 'user');
      return this.service.transitionIndividual(
        id,
        body.toStatus,
        allowed,
        getRhActor(this.scope, req),
        slugs,
      );
    });
  }

  @Get('individuals/:id')
  @RequireRh('rh_payslip_individual')
  getOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then(async (allowed) => {
      const slugs = await this.modules.getSlugsForActor(req.user.sub, req.user.role ?? 'user');
      return this.service.getIndividualForViewer(id, allowed, slugs, req.user.role, undefined);
    });
  }

  @Get('individuals/:id/download')
  @RequireRh('rh_payslip_individual')
  async download(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    const slugs = await this.modules.getSlugsForActor(req.user.sub, req.user.role ?? 'user');
    const row = await this.service.getIndividualForViewer(id, allowed, slugs, req.user.role, undefined);
    if (!row.extractedFileKey || !row.canDownload) {
      throw new BadRequestException('Download não permitido.');
    }
    const buf = await this.s3.getObjectBuffer(row.extractedFileKey);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buf);
  }

  @Get('by-employee/:employeeId')
  @RequireRh('rh_payslip_individual')
  byEmployee(@Req() req: Request & { user: CognitoJwtPayload }, @Param('employeeId') employeeId: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.listByEmployee(employeeId, allowed),
    );
  }
}
