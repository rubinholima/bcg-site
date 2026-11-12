import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { JuridicoPersonsService } from './juridico-persons.service';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('juridico')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('juridico')
export class JuridicoPersonsController {
  constructor(
    private readonly persons: JuridicoPersonsService,
    private readonly scope: RhScopeService,
  ) {}

  /** Colaboradores do RH para filtro por nome (Jurídico). */
  @Get('person-options')
  async listPersonOptions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.persons.listPersonOptions(
      {
        tenantId: tenantId?.trim() || undefined,
        category: category?.trim() || undefined,
        search: search?.trim() || undefined,
      },
      allowed,
    );
  }
}
