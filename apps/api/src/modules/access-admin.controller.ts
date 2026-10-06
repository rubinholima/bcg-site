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
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { UsersService } from '../users/users.service';
import { EffectiveAccessService } from './effective-access.service';
import { AccessAdminUsersService } from './access-admin-users.service';
import { CreateAccessUserDto } from './dto/create-access-user.dto';
import { ModulesService } from './modules.service';

@Controller('settings/access')
@UseGuards(JwtAuthGuard, Cup360AccessAdminGuard)
export class AccessAdminController {
  constructor(
    private readonly effectiveAccess: EffectiveAccessService,
    private readonly modulesService: ModulesService,
    private readonly accessAdminUsers: AccessAdminUsersService,
    private readonly usersService: UsersService,
    private readonly tenantAccess: TenantAccessService,
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

  @Post('users')
  async createUser(
    @Req() req: Request & { user?: CognitoJwtPayload },
    @Body() body: CreateAccessUserDto,
  ) {
    const actorRole = this.actorRole(req);
    this.accessAdminUsers.assertCanCreateOrManageIdentities(actorRole);
    const tenantIds = body.tenantIds ?? [];
    if (actorRole === 'company_admin') {
      this.accessAdminUsers.assertCompanyAdminCreatePayload(tenantIds, undefined);
    }
    if (tenantIds.length > 0) {
      await this.tenantAccess.assertActorCanAssignTenants(
        req.user?.sub ?? '',
        actorRole,
        tenantIds,
      );
    }
    await this.effectiveAccess.assertActivePlatformFunction(body.platformFunctionId);

    const legacyRole = this.accessAdminUsers.resolveCreateRoleForActor(actorRole, undefined);
    const created = await this.usersService.create({
      email: body.email,
      username: body.username,
      name: body.name,
      role: legacyRole,
      tenantIds,
    });

    const platformFunctionId = body.platformFunctionId?.trim() || null;
    await this.effectiveAccess.auditUserIdentityCreated(created.userId, req.user, {
      email: body.email.trim().toLowerCase(),
      name: body.name ?? null,
      legacyRole,
      tenantIds,
      platformFunctionId,
    });
    if (platformFunctionId) {
      await this.effectiveAccess.updateUserAccess(
        created.userId,
        { platformFunctionId },
        req.user,
      );
    }

    return {
      id: created.userId,
      username: created.username,
      sub: created.sub,
      temporaryPassword: created.temporaryPassword,
      name: body.name ?? null,
      email: body.email.trim().toLowerCase(),
    };
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
  @UseGuards(SuperAdminGuard)
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
  @UseGuards(SuperAdminGuard)
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
  @UseGuards(SuperAdminGuard)
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
    if (body.platformFunctionId !== undefined) {
      await this.effectiveAccess.assertActivePlatformFunction(body.platformFunctionId);
    }
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
