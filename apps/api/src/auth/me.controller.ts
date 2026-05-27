import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from './jwt-auth.guard';
import { DashboardRolesGuard } from './roles.guard';
import { MeService } from './me.service';
import { ModulesService } from '../modules/modules.service';
import { TenantAccessService } from './tenant-access.service';

export type MeRole =
  | 'super_admin'
  | 'company_admin'
  | 'editor'
  | 'gerente'
  | 'administrativo'
  | 'analista'
  | 'diretoria'
  | 'medico'
  | 'psicologo'
  | 'comissao'
  | 'user';

export interface MeResponse {
  user: { id: string; email: string; name: string | null; cognitoSub: string };
  groups: string[];
  role: MeRole;
  /** null = sem escopo (todas as empresas). Lista = só esses tenantIds. */
  tenantIds: string[] | null;
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly modulesService: ModulesService,
    private readonly tenantAccess: TenantAccessService,
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
    const tenantIds = await this.tenantAccess.getAllowedTenantIds(user.id, role);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        cognitoSub: user.cognitoSub ?? sub,
      },
      groups: groups.length ? groups : [role],
      role,
      tenantIds,
    };
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
}
