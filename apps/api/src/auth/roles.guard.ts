import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CognitoJwtPayload } from './jwt-auth.guard';

const DASHBOARD_ROLES = new Set([
  'super_admin',
  'company_admin',
  'editor',
  'gerente',
  'administrativo',
  'analista',
  'diretoria',
  'medico',
  'psicologo',
  'comissao',
]);

/**
 * Guard que permite roles com acesso ao dashboard.
 * Deve ser usado após JwtAuthGuard (para ter req.user preenchido).
 */
@Injectable()
export class DashboardRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }
    const role = user.role ?? user['cognito:groups']?.[0];
    const groups: string[] = user['cognito:groups'] ?? [];
    const hasAccess =
      (role && DASHBOARD_ROLES.has(role)) || groups.some((g) => DASHBOARD_ROLES.has(g));
    if (hasAccess) return true;
    throw new ForbiddenException('Acesso restrito ao dashboard');
  }
}
