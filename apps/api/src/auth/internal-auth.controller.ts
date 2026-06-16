import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { IsString } from 'class-validator';
import { CredentialsAuthService } from './credentials-auth.service';

class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[internal-auth] raw body:', JSON.stringify(req.body));
      console.log('[internal-auth] dto:', dto ? { username: !!dto.username, passwordType: typeof dto?.password } : 'null');
    }
    if (!dto?.username || typeof dto.password !== 'string') {
      throw new UnauthorizedException('Usuário e senha são obrigatórios');
    }
    return this.credentialsAuth.login(dto.username.trim(), dto.password);
  }
}
