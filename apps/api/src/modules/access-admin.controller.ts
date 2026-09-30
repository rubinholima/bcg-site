import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { EffectiveAccessService } from './effective-access.service';
import { ModulesService } from './modules.service';

@Controller('settings/access')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AccessAdminController {
  constructor(
    private readonly effectiveAccess: EffectiveAccessService,
    private readonly modulesService: ModulesService,
  ) {}

  @Get('modules')
  listModules() {
    return this.effectiveAccess.listModulesForAdmin();
  }

  @Get('functions')
  listFunctions() {
    return this.effectiveAccess.listPlatformFunctions();
  }

  @Put('functions/:id/defaults')
  async updateFunctionDefaults(
    @Param('id') id: string,
    @Body() body: { moduleSlugs?: string[] },
  ) {
    await this.effectiveAccess.updatePlatformFunctionDefaults(id, body.moduleSlugs ?? []);
    return { ok: true };
  }

  @Get('users/:userId')
  async getUserAccess(@Param('userId') userId: string) {
    const breakdown = await this.effectiveAccess.getBreakdownForUser(userId);
    if (!breakdown) throw new NotFoundException('Usuário não encontrado');
    return breakdown;
  }

  @Patch('users/:userId')
  async patchUserAccess(
    @Param('userId') userId: string,
    @Body()
    body: {
      platformFunctionId?: string | null;
      allowSlugs?: string[];
      denySlugs?: string[];
    },
  ) {
    await this.effectiveAccess.updateUserAccess(userId, body);
    return this.effectiveAccess.getBreakdownForUser(userId);
  }

  @Get('audit')
  async getAudit() {
    const entries = await this.modulesService.getRecentAuditEntries(40);
    return entries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
