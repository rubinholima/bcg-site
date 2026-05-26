import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmploymentContractsService } from './employment-contracts.service';

/** Jurídico: lista e assinatura de contratos gerados no RH (e outros fora do escopo de atleta). */
@Controller('employment-contracts')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('juridico')
export class JuridicoEmploymentContractsController {
  constructor(private readonly contracts: EmploymentContractsService) {}

  @Get()
  list(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.contracts.findAll({
      tenantId: tenantId?.trim() || undefined,
      status: status?.trim() || undefined,
      type: type?.trim() || undefined,
      employeeId: employeeId?.trim() || undefined,
    });
  }

  @Post(':employmentId/:id/send-for-signature')
  sendForSignature(
    @Param('employmentId') employmentId: string,
    @Param('id') id: string,
    @Body('signerEmail') signerEmail?: string,
    @Body('signerName') signerName?: string,
    @Body('signaturePage') signaturePage?: number,
  ) {
    if (!signerEmail?.trim()) {
      throw new BadRequestException('Campo "signerEmail" é obrigatório.');
    }
    return this.contracts.sendForSignature(
      employmentId,
      id,
      signerEmail.trim(),
      signerName?.trim(),
      signaturePage,
    );
  }

  @Post(':employmentId/:id/sync')
  sync(@Param('employmentId') employmentId: string, @Param('id') id: string) {
    return this.contracts.syncFromHelloSign(employmentId, id);
  }

  @Get(':employmentId/:id/download')
  async download(
    @Param('employmentId') employmentId: string,
    @Param('id') id: string,
    @Query('signed') signed?: string,
  ) {
    const { buffer, filename } = await this.contracts.downloadBuffer(
      employmentId,
      id,
      signed === 'true' || signed === '1',
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
