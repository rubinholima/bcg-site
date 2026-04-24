import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CognitoJwtPayload } from './jwt-auth.guard';

/**
 * Guard que permite apenas super_admin.
 * Deve ser usado após JwtAuthGuard.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }
    const groups: string[] = user['cognito:groups'] ?? [];
    if (groups.includes('super_admin') || user.role === 'super_admin') {
      return true;
    }
    const received = groups.length ? groups.join(', ') : '(nenhum role)';
    throw new ForbiddenException(
      `Acesso restrito a super admin. Seu usuário tem role: ${received}. Altere no banco (User.role) ou em Configurações → Usuários.`,
    );
  }
}
