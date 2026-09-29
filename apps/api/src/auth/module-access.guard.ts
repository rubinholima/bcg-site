import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CognitoJwtPayload } from './jwt-auth.guard';
import {
  REQUIRED_MODULE_KEY,
  SEASON_HIGHLIGHTS_ACCESS_KEY,
  TEAM_REPORT_READ_KEY,
} from './require-module.decorator';
import { ModulesService } from '../modules/modules.service';
import { canAccessSeasonHighlights } from '../season-highlights/season-highlights-access.util';

const TEAM_REPORT_READ_MODULES = ['futebol_treinadores', 'diretoria', 'relatorios_futebol'];

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly modulesService: ModulesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | string[] | undefined>(
      REQUIRED_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const seasonHighlightsAccess = this.reflector.getAllAndOverride<boolean>(
      SEASON_HIGHLIGHTS_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const teamReportRead = this.reflector.getAllAndOverride<boolean>(TEAM_REPORT_READ_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required && !seasonHighlightsAccess && !teamReportRead) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const role = user.role ?? user['cognito:groups']?.[0] ?? 'user';
    if (role === 'super_admin') return true;

    if (seasonHighlightsAccess) {
      if (role === 'company_admin') return true;
      const slugs = await this.modulesService.getSlugsForActor(user.sub, role);
      if (canAccessSeasonHighlights(role, slugs)) return true;
      throw new ForbiddenException(
        'Acesso negado: Melhores da Temporada é para gerentes, gestores e treinadores.',
      );
    }

    if (teamReportRead) {
      if (role === 'company_admin') return true;
      const slugsRead = await this.modulesService.getSlugsForActor(user.sub, role);
      if (TEAM_REPORT_READ_MODULES.some((s) => slugsRead.includes(s))) return true;
      throw new ForbiddenException(
        `Acesso negado: um dos módulos requeridos: ${TEAM_REPORT_READ_MODULES.join(', ')}`,
      );
    }

    if (required) {
      const slugs = await this.modulesService.getSlugsForActor(user.sub, role);
      const needed = Array.isArray(required) ? required : [required];
      if (needed.some((s) => slugs.includes(s))) return true;
      throw new ForbiddenException(
        `Acesso negado: um dos módulos requeridos: ${needed.join(', ')}`,
      );
    }

    throw new ForbiddenException('Acesso negado.');
  }
}
