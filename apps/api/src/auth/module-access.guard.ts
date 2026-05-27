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
    const required = this.reflector.getAllAndOverride<string | string[] | undefined>(
      REQUIRED_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const role = user.role ?? user['cognito:groups']?.[0] ?? 'user';
    if (role === 'super_admin') return true;
    const slugs = await this.modulesService.getSlugsForActor(user.sub, role);
    const needed = Array.isArray(required) ? required : [required];
    if (needed.some((s) => slugs.includes(s))) return true;

    throw new ForbiddenException(
      `Acesso negado: um dos módulos requeridos: ${needed.join(', ')}`,
    );
  }
}
