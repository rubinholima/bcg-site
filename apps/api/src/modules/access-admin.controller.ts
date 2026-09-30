import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
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

  @Post('functions')
  createFunction(
    @Body()
    body: {
      name: string;
      code?: string;
      description?: string;
      platformFamily?: string;
      platformLegacyRole?: string;
    },
  ) {
    return this.effectiveAccess.createPlatformFunction(body);
  }

  @Patch('functions/:id')
  updateFunction(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      code?: string;
      description?: string;
      platformFamily?: string;
      isActive?: boolean;
    },
  ) {
    return this.effectiveAccess.updatePlatformFunction(id, body);
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

  @Post('users/:userId/restore-function-defaults')
  async restoreUserDefaults(@Param('userId') userId: string) {
    await this.effectiveAccess.restoreUserToFunctionDefaults(userId);
    return this.effectiveAccess.getBreakdownForUser(userId);
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
    const [cup360, matrix] = await Promise.all([
      this.effectiveAccess.listCup360AccessAudit(40),
      this.modulesService.getRecentAuditEntries(20),
    ]);
    return {
      cup360: cup360.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
      matrix: matrix.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    };
  }
}
