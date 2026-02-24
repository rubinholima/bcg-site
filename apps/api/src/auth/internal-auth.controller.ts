import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { CredentialsAuthService } from './credentials-auth.service';

class LoginDto {
  email!: string;
  password!: string;
}

/**
 * POST /internal/auth/login
 * Chamado apenas pelo Next.js (server-side). Valida email/senha e retorna JWT.
 */
@Controller('internal/auth')
export class InternalAuthController {
  constructor(private readonly credentialsAuth: CredentialsAuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    if (!dto?.email || typeof dto.password !== 'string') {
      throw new UnauthorizedException('Email e senha são obrigatórios');
    }
    return this.credentialsAuth.login(dto.email.trim(), dto.password);
  }
}
