import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CognitoJwtPayload } from './jwt-auth.guard';

/**
 * Guard que permite super_admin, company_admin ou editor (acesso ao dashboard).
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
    const groups: string[] = user['cognito:groups'] ?? [];
    if (
      groups.includes('super_admin') ||
      groups.includes('company_admin') ||
      groups.includes('editor')
    ) {
      return true;
    }
    throw new ForbiddenException('Acesso restrito a super_admin, company_admin ou editor');
  }
}
