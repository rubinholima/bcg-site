import { Controller, Get, Patch, Body, Req, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from './jwt-auth.guard';
import { DashboardRolesGuard } from './roles.guard';
import { MeService } from './me.service';
import { ModulesService } from '../modules/modules.service';
import { TenantAccessService } from './tenant-access.service';
import { CredentialsAuthService } from './credentials-auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { validatePlatformPassword } from './password-policy.util';

import { isDashboardRole } from '../roles/roles.cache';

export type MeRole = string;

export interface MeResponse {
  user: {
    id: string;
    email: string;
    username: string;
    name: string | null;
    cognitoSub: string;
  };
  groups: string[];
  role: MeRole;
  canAccessDashboard: boolean;
  mustChangePassword: boolean;
  tenantIds: string[] | null;
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly modulesService: ModulesService,
    private readonly tenantAccess: TenantAccessService,
    private readonly credentialsAuth: CredentialsAuthService,
  ) {}

  @Get()
  async me(@Req() req: Request & { user: CognitoJwtPayload }): Promise<MeResponse> {
    const payload = req.user;
    const sub = payload.sub;
    const groups: string[] = payload['cognito:groups'] ?? [];
    let role: MeRole = (payload.role as MeRole) ?? 'user';
    if (groups.length > 0 && (!role || role === 'user')) {
      const r = groups.find(
        (g) =>
          g === 'super_admin' ||
          g === 'company_admin' ||
          g === 'editor' ||
          g === 'gerente' ||
          g === 'administrativo' ||
          g === 'analista' ||
          g === 'diretoria' ||
          g === 'medico' ||
          g === 'psicologo' ||
          g === 'comissao',
      );
      if (r) role = r as MeRole;
    }

    const user =
      (await this.meService.findUserByCognitoSub(sub)) ??
      (await this.meService.findUserById(sub));
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const roleFromDb = (user.role as MeRole) ?? role;
    role = roleFromDb;
    const tenantIds = await this.tenantAccess.getAllowedTenantIds(user.id, role);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        cognitoSub: user.cognitoSub ?? sub,
      },
      groups: groups.length ? groups : [role],
      role,
      canAccessDashboard: isDashboardRole(role),
      mustChangePassword: user.mustChangePassword,
      tenantIds,
    };
  }

  @Patch('change-password')
  async changePassword(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: ChangePasswordDto,
  ) {
    const user =
      (await this.meService.findUserByCognitoSub(req.user.sub)) ??
      (await this.meService.findUserById(req.user.sub));
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.mustChangePassword) {
      throw new BadRequestException('Troca de senha não é obrigatória para este usuário.');
    }
    const policyError = validatePlatformPassword(dto.newPassword);
    if (policyError) {
      throw new BadRequestException(policyError);
    }
    await this.credentialsAuth.changePassword(user.id, dto.newPassword);
    return { ok: true };
  }

  /** Lista de slugs de módulos que o usuário pode acessar (para montar o menu). */
  @Get('modules')
  @UseGuards(DashboardRolesGuard)
  async modules(@Req() req: Request & { user: CognitoJwtPayload }): Promise<{ modules: string[] }> {
    const role =
      req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const user =
      (await this.meService.findUserByCognitoSub(req.user.sub)) ??
      (await this.meService.findUserById(req.user.sub));
    const modules = user
      ? await this.modulesService.getSlugsForUser(user.id, role)
      : await this.modulesService.getSlugsForRole(role);
    return { modules };
  }

  @Get('dashboard-shortcuts')
  @UseGuards(DashboardRolesGuard)
  async dashboardShortcuts(@Req() req: Request & { user: CognitoJwtPayload }) {
    const user =
      (await this.meService.findUserByCognitoSub(req.user.sub)) ??
      (await this.meService.findUserById(req.user.sub));
    if (!user) throw new UnauthorizedException('User not found');
    return this.meService.getDashboardShortcuts(user.id);
  }

  @Patch('dashboard-shortcuts')
  @UseGuards(DashboardRolesGuard)
  async updateDashboardShortcuts(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: { slots?: unknown },
  ) {
    const user =
      (await this.meService.findUserByCognitoSub(req.user.sub)) ??
      (await this.meService.findUserById(req.user.sub));
    if (!user) throw new UnauthorizedException('User not found');
    if (!Array.isArray(body?.slots)) {
      throw new BadRequestException('slots must be an array');
    }
    return this.meService.updateDashboardShortcuts(user.id, body.slots);
  }
}
