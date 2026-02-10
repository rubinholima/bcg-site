import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CognitoJwtPayload } from './jwt-auth.guard';
import { REQUIRED_MODULE_KEY } from './require-module.decorator';
import { ModulesService } from '../modules/modules.service';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly modulesService: ModulesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredSlug = this.reflector.get<string | undefined>(
      REQUIRED_MODULE_KEY,
      context.getHandler(),
    );
    if (!requiredSlug) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const groups: string[] = user['cognito:groups'] ?? [];
    let role = 'user';
    if (groups.includes('super_admin')) role = 'super_admin';
    else if (groups.includes('company_admin')) role = 'company_admin';
    else if (groups.includes('editor')) role = 'editor';

    const slugs = await this.modulesService.getSlugsForRole(role);
    if (slugs.includes(requiredSlug)) return true;

    throw new ForbiddenException(`Acesso negado: módulo ${requiredSlug} requerido`);
  }
}
