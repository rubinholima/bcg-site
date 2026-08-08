import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsString } from 'class-validator';
import { CredentialsAuthService } from './credentials-auth.service';

class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

/** Rate limit simples em memória por IP (protege brute force no login). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 40;

function assertLoginNotThrottled(ip: string): void {
  const now = Date.now();
  const key = ip || 'unknown';
  let entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    throw new HttpException(
      'Muitas tentativas de login. Aguarde alguns minutos.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * POST /internal/auth/login
 * Chamado apenas pelo Next.js (server-side). Valida username/senha e retorna JWT.
 */
@Controller('internal/auth')
export class InternalAuthController {
  constructor(private readonly credentialsAuth: CredentialsAuthService) {}

  @Post('login')
  async login(@Req() req: Request, @Body() dto: LoginDto) {
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    assertLoginNotThrottled(ip);

    if (!dto?.username || typeof dto.password !== 'string') {
      throw new UnauthorizedException('Usuário e senha são obrigatórios');
    }
    return this.credentialsAuth.login(dto.username.trim(), dto.password);
  }
}
