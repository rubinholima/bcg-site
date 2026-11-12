import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { ContractTemplatesService } from '../cadastros/contract-templates.service';
import { templateMatchesEmploymentContractType } from '../common/contract-data.util';
import { EmploymentContractsService } from './employment-contracts.service';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('rh')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('adm_rh')
export class EmploymentContractsController {
  constructor(
    private readonly contracts: EmploymentContractsService,
    private readonly templates: ContractTemplatesService,
    private readonly scope: RhScopeService,
  ) {}

  @Get('contract-templates')
  listTemplates(
    @Query('tenantId') tenantId?: string,
    @Query('type') type?: string,
    @Query('contractType') contractType?: string,
  ) {
    return this.templates.findAll({ tenantId, type, activeOnly: true }).then((rows) => {
      if (!contractType?.trim()) return rows;
      return rows.filter((r) =>
        templateMatchesEmploymentContractType(r.type, contractType.trim()),
      );
    });
  }

  @Get('employments/:employmentId/contracts')
  async list(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.contracts.findByEmployment(employmentId, allowed);
  }

  @Post('employments/:employmentId/contracts/generate')
  async generate(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
    @Body('templateId') templateId?: string,
    @Body('name') name?: string,
  ) {
    if (!templateId?.trim()) {
      throw new BadRequestException('Campo "templateId" é obrigatório.');
    }
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.contracts.generate(employmentId, templateId.trim(), name?.trim(), allowed);
  }

  @Post('employments/:employmentId/contracts/:id/send-for-signature')
  async sendForSignature(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
    @Param('id') id: string,
    @Body('signerEmail') signerEmail?: string,
    @Body('signerName') signerName?: string,
    @Body('signaturePage') signaturePage?: number,
  ) {
    if (!signerEmail?.trim()) {
      throw new BadRequestException('Campo "signerEmail" é obrigatório.');
    }
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.contracts.sendForSignature(
      employmentId,
      id,
      signerEmail.trim(),
      signerName?.trim(),
      signaturePage,
      allowed,
    );
  }

  @Post('employments/:employmentId/contracts/:id/sync')
  async sync(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
    @Param('id') id: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.contracts.syncFromHelloSign(employmentId, id, allowed);
  }

  @Get('employments/:employmentId/contracts/:id/download')
  async download(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
    @Param('id') id: string,
    @Query('signed') signed?: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    const { buffer, filename } = await this.contracts.downloadBuffer(
      employmentId,
      id,
      signed === 'true' || signed === '1',
      allowed,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Delete('employments/:employmentId/contracts/:id')
  async remove(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
    @Param('id') id: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.contracts.remove(employmentId, id, allowed);
  }
}
