import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LocalJwtPayload, JWT_ISSUER } from './credentials-auth.service';
import {
  assertTokenVersionMatches,
  resolveTokenVersionFromPayload,
} from './session-token.util';

/**
 * Payload do nosso JWT (login direto email/senha). role vem do User no banco.
 * Guards usam: sub, email, role; cognito:groups = [role] por compatibilidade.
 */
export interface CognitoJwtPayload {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  'cognito:groups'?: string[];
  token_use?: 'id' | 'access';
  iss?: string;
  aud?: string | string[];
  client_id?: string;
  exp?: number;
  iat?: number;
  tokenVersion?: number;
  [key: string]: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.getToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header or cookie');
    }

    try {
      const payload = this.jwtService.verify<LocalJwtPayload>(token, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
      });

      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { blocked: true, role: true, tokenVersion: true },
      });
      if (!dbUser || dbUser.blocked) {
        throw new UnauthorizedException('Usuário inválido ou bloqueado');
      }

      assertTokenVersionMatches(
        resolveTokenVersionFromPayload(payload),
        dbUser.tokenVersion ?? 0,
      );

      const role = dbUser.role ?? payload.role ?? 'user';
      const user: CognitoJwtPayload = {
        sub: payload.sub,
        email: payload.email,
        role,
        tokenVersion: dbUser.tokenVersion ?? 0,
        'cognito:groups': [role],
      };
      (request as Request & { user: CognitoJwtPayload }).user = user;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid token');
    }
  }

  private getToken(request: Request): string | null {
    const cookie = request.headers.cookie;
    if (cookie) {
      const match = cookie.match(/access_token=([^;]+)/);
      if (match?.[1]) return decodeURIComponent(match[1].trim());
    }
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }
}
