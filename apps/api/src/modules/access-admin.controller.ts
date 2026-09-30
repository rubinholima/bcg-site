import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { Cup360AccessAdminGuard } from '../auth/cup360-access-admin.guard';
import { EffectiveAccessService } from './effective-access.service';
import { AccessAdminUsersService } from './access-admin-users.service';
import { ModulesService } from './modules.service';

@Controller('settings/access')
@UseGuards(JwtAuthGuard, Cup360AccessAdminGuard)
export class AccessAdminController {
  constructor(
    private readonly effectiveAccess: EffectiveAccessService,
    private readonly modulesService: ModulesService,
    private readonly accessAdminUsers: AccessAdminUsersService,
  ) {}

  private actorRole(req: Request & { user?: CognitoJwtPayload }): string {
    const u = req.user;
    return (u?.role ?? u?.['cognito:groups']?.[0] ?? 'user').trim();
  }

  @Get('users')
  listUsers(@Req() req: Request & { user?: CognitoJwtPayload }) {
    const sub = req.user?.sub ?? '';
    return this.accessAdminUsers.listManageableUsers(sub, this.actorRole(req));
  }

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
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Body()
    body: {
      name: string;
      code?: string;
      description?: string;
      platformFamily?: string;
      platformLegacyRole?: string;
    },
  ) {
    return this.effectiveAccess.createPlatformFunction(body, req.user);
  }

  @Patch('functions/:id')
  updateFunction(
    @Req() req: Request & { user?: CognitoJwtPayload },
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
    return this.effectiveAccess.updatePlatformFunction(id, body, req.user);
  }

  @Put('functions/:id/defaults')
  async updateFunctionDefaults(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { moduleSlugs?: string[] },
  ) {
    await this.effectiveAccess.updatePlatformFunctionDefaults(
      id,
      body.moduleSlugs ?? [],
      req.user,
    );
    return { ok: true };
  }

  @Get('users/:userId')
  async getUserAccess(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Param('userId') userId: string,
  ) {
    await this.accessAdminUsers.assertActorCanManageUser(
      req.user?.sub ?? '',
      this.actorRole(req),
      userId,
    );
    const breakdown = await this.effectiveAccess.getBreakdownForUser(userId);
    if (!breakdown) throw new NotFoundException('Usuário não encontrado');
    return breakdown;
  }

  @Post('users/:userId/restore-function-defaults')
  async restoreUserDefaults(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Param('userId') userId: string,
  ) {
    await this.accessAdminUsers.assertActorCanManageUser(
      req.user?.sub ?? '',
      this.actorRole(req),
      userId,
    );
    await this.effectiveAccess.restoreUserToFunctionDefaults(userId, req.user);
    return this.effectiveAccess.getBreakdownForUser(userId);
  }

  @Patch('users/:userId')
  async patchUserAccess(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Param('userId') userId: string,
    @Body()
    body: {
      platformFunctionId?: string | null;
      allowSlugs?: string[];
      denySlugs?: string[];
    },
  ) {
    await this.accessAdminUsers.assertActorCanManageUser(
      req.user?.sub ?? '',
      this.actorRole(req),
      userId,
    );
    await this.effectiveAccess.updateUserAccess(userId, body, req.user);
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
