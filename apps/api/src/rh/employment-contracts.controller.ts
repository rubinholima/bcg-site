import {
  Controller,
  Get,
  Post,
  Delete,
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
import { ContractTemplatesService } from '../cadastros/contract-templates.service';
import { templateMatchesEmploymentContractType } from '../common/contract-data.util';
import { EmploymentContractsService } from './employment-contracts.service';

@Controller('rh')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('adm_rh')
export class EmploymentContractsController {
  constructor(
    private readonly contracts: EmploymentContractsService,
    private readonly templates: ContractTemplatesService,
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
  list(@Param('employmentId') employmentId: string) {
    return this.contracts.findByEmployment(employmentId);
  }

  @Post('employments/:employmentId/contracts/generate')
  generate(
    @Param('employmentId') employmentId: string,
    @Body('templateId') templateId?: string,
    @Body('name') name?: string,
  ) {
    if (!templateId?.trim()) {
      throw new BadRequestException('Campo "templateId" é obrigatório.');
    }
    return this.contracts.generate(employmentId, templateId.trim(), name?.trim());
  }

  @Post('employments/:employmentId/contracts/:id/send-for-signature')
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

  @Post('employments/:employmentId/contracts/:id/sync')
  sync(@Param('employmentId') employmentId: string, @Param('id') id: string) {
    return this.contracts.syncFromHelloSign(employmentId, id);
  }

  @Get('employments/:employmentId/contracts/:id/download')
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

  @Delete('employments/:employmentId/contracts/:id')
  remove(@Param('employmentId') employmentId: string, @Param('id') id: string) {
    return this.contracts.remove(employmentId, id);
  }
}
