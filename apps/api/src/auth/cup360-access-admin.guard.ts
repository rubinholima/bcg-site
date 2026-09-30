import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { CognitoJwtPayload } from './jwt-auth.guard';

const ACCESS_ADMIN_ROLES = new Set(['super_admin', 'company_admin']);

/**
 * Configurações → Pessoas e acessos (administração de função/acesso).
 */
@Injectable()
export class Cup360AccessAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) {
      throw new ForbiddenException('Não autenticado');
    }
    const role = (user.role ?? user['cognito:groups']?.[0] ?? '').trim();
    if (ACCESS_ADMIN_ROLES.has(role)) {
      return true;
    }
    throw new ForbiddenException('Acesso restrito a administradores da plataforma.');
  }
}
