import {
  Controller,
  Get,
  Post,
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
import { EmploymentContractsService } from './employment-contracts.service';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

/** Jurídico: lista e assinatura de contratos gerados no RH (e outros fora do escopo de atleta). */
@Controller('employment-contracts')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('juridico')
export class JuridicoEmploymentContractsController {
  constructor(
    private readonly contracts: EmploymentContractsService,
    private readonly scope: RhScopeService,
  ) {}

  @Get()
  async list(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.contracts.findAll(
      {
        tenantId: tenantId?.trim() || undefined,
        status: status?.trim() || undefined,
        type: type?.trim() || undefined,
        employeeId: employeeId?.trim() || undefined,
      },
      allowed,
    );
  }

  @Post(':employmentId/:id/send-for-signature')
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

  @Post(':employmentId/:id/sync')
  async sync(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
    @Param('id') id: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.contracts.syncFromHelloSign(employmentId, id, allowed);
  }

  @Get(':employmentId/:id/download')
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
}
