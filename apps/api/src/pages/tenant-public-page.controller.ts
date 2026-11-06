import { Body, Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PagesService } from './pages.service';

@Controller('tenants/:tenantId/pages')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('paginas')
export class TenantPublicPageController {
  constructor(private readonly pages: PagesService) {}

  /** Define a página principal pública do tenant (determinístico). */
  @Patch('public-main')
  setMainPublicPage(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Body() body: { pageId?: string },
  ) {
    return this.pages.setMainPublicPageForTenant(tenantId, body.pageId ?? '', req.user);
  }
}
