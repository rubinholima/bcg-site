import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { LocalJwtPayload, JWT_ISSUER } from './credentials-auth.service';

/**
 * Payload que pode vir do nosso JWT (login próprio) ou do Cognito (legado).
 * Guards e controllers usam: sub, email, name, role ou cognito:groups.
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
  [key: string]: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
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
      const user: CognitoJwtPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        'cognito:groups': [payload.role],
      };
      (request as Request & { user: CognitoJwtPayload }).user = user;
      return true;
    } catch {
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
