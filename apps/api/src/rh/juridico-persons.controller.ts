import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { JuridicoPersonsService } from './juridico-persons.service';

@Controller('juridico')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('juridico')
export class JuridicoPersonsController {
  constructor(private readonly persons: JuridicoPersonsService) {}

  /** Colaboradores do RH para filtro por nome (Jurídico). */
  @Get('person-options')
  listPersonOptions(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.persons.listPersonOptions({
      tenantId: tenantId?.trim() || undefined,
      category: category?.trim() || undefined,
      search: search?.trim() || undefined,
    });
  }
}
