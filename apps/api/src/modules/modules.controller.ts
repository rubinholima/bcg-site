import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { ModulesService, ModuleWithPermissions } from './modules.service';

@Controller('settings/modules')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  async getAll(): Promise<ModuleWithPermissions[]> {
    return this.modulesService.getAllWithPermissions();
  }

  @Patch()
  async updatePermissions(
    @Body() body: { permissions: Record<string, { company_admin?: boolean; editor?: boolean }> },
  ): Promise<{ ok: boolean }> {
    await this.modulesService.updatePermissions(body.permissions ?? {});
    return { ok: true };
  }
}
