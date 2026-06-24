import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { LegalDocumentsService } from './legal-documents.service';

@Controller('legal-documents')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('juridico')
export class AllLegalDocumentsController {
  constructor(private readonly service: LegalDocumentsService) {}

  @Get()
  list(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      tenantId: tenantId?.trim() || undefined,
      category: category?.trim() || undefined,
      type: type?.trim() || undefined,
      status: status?.trim() || undefined,
    });
  }
}
