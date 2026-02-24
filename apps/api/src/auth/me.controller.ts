import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from './jwt-auth.guard';
import { DashboardRolesGuard } from './roles.guard';
import { MeService } from './me.service';
import { ModulesService } from '../modules/modules.service';

export type MeRole = 'super_admin' | 'company_admin' | 'editor' | 'user';

export interface MeResponse {
  user: { id: string; email: string; name: string | null; cognitoSub: string };
  groups: string[];
  role: MeRole;
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly modulesService: ModulesService,
  ) {}

  @Get()
  async me(@Req() req: Request & { user: CognitoJwtPayload }): Promise<MeResponse> {
    const payload = req.user;
    const sub = payload.sub;
    const groups: string[] = payload['cognito:groups'] ?? [];
    let role: MeRole = (payload.role as MeRole) ?? 'user';
    if (groups.length > 0 && !role) {
      if (groups.includes('super_admin')) role = 'super_admin';
      else if (groups.includes('company_admin')) role = 'company_admin';
      else if (groups.includes('editor')) role = 'editor';
    }

    const user = await this.meService.findUserById(sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        cognitoSub: user.cognitoSub ?? sub,
      },
      groups: groups.length ? groups : [role],
      role,
    };
  }

  /** Lista de slugs de módulos que o usuário pode acessar (para montar o menu). */
  @Get('modules')
  @UseGuards(DashboardRolesGuard)
  async modules(@Req() req: Request & { user: CognitoJwtPayload }): Promise<{ modules: string[] }> {
    const groups: string[] = req.user['cognito:groups'] ?? [];
    let role = 'user';
    if (groups.includes('super_admin')) role = 'super_admin';
    else if (groups.includes('company_admin')) role = 'company_admin';
    else if (groups.includes('editor')) role = 'editor';
    const modules = await this.modulesService.getSlugsForRole(role);
    return { modules };
  }
}
