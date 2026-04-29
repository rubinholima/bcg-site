import { Body, Controller, Get, Patch, Req, Query, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CognitoJwtPayload, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import {
  computeMatrixChanges,
  MatrixChangeRow,
  ModulesService,
  ModuleWithPermissions,
} from './modules.service';

export type PermissionsBody = Record<
  string,
  {
    company_admin?: boolean;
    editor?: boolean;
    analista?: boolean;
    diretoria?: boolean;
    medico?: boolean;
    psicologo?: boolean;
  }
>;

@Controller('settings/modules')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  /** Histórico de alterações na matriz (somente auditoria — não interfere em autorização). */
  @Get('audit')
  async getAuditHistory(
    @Query('details') details?: string,
  ): Promise<{
    entries: Array<{
      id: string;
      createdAt: string;
      actorSub: string;
      actorEmail: string | null;
      changeCount: number;
      changes?: MatrixChangeRow[];
    }>;
  }> {
    const includeChanges = details === '1' || details === 'true';
    const entries = await this.modulesService.getRecentAuditEntries(40, { includeChanges });
    return {
      entries: entries.map((e) => ({
        id: e.id,
        actorSub: e.actorSub,
        actorEmail: e.actorEmail,
        changeCount: e.changeCount,
        createdAt: e.createdAt.toISOString(),
        ...(includeChanges && e.changes ? { changes: e.changes } : {}),
      })),
    };
  }

  @Get()
  async getAll(): Promise<ModuleWithPermissions[]> {
    return this.modulesService.getAllWithPermissions();
  }

  @Patch()
  async updatePermissions(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Body() body: { permissions: PermissionsBody },
  ): Promise<{ ok: boolean; changedCells?: number }> {
    const permissions = body.permissions ?? {};
    const touched = new Set(Object.keys(permissions));
    const before = await this.modulesService.getAllWithPermissions();
    await this.modulesService.updatePermissions(permissions);
    const after = await this.modulesService.getAllWithPermissions();
    const changes = computeMatrixChanges(before, after, touched);
    const user = req.user;
    if (user?.sub && changes.length) {
      await this.modulesService.insertAudit(user.sub, user.email, changes);
    }
    return { ok: true, changedCells: changes.length };
  }
}