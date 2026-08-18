import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeUsernameInput } from '../users/user-username.util';

export const JWT_ISSUER = 'bcg-platform';

export interface LocalJwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  exp?: number;
  iat?: number;
}

export interface AuthUserResult {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: string;
  mustChangePassword: boolean;
}

@Injectable()
export class CredentialsAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<AuthUserResult | null> {
    const login = normalizeUsernameInput(username);
    const user = await this.prisma.user.findUnique({
      where: { username: login },
    });
    if (!user?.passwordHash) return null;
    if (user.blocked) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role ?? 'editor',
      mustChangePassword: user.mustChangePassword,
    };
  }

  async login(
    username: string,
    password: string,
  ): Promise<{
    access_token: string;
    mustChangePassword: boolean;
    user: AuthUserResult;
  }> {
    const login = normalizeUsernameInput(username);
    const dbUser = await this.prisma.user.findUnique({ where: { username: login } });
    if (dbUser?.blocked) {
      throw new ForbiddenException('Usuário bloqueado. Contate o administrador.');
    }
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }
    const payload: LocalJwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: '7d',
      issuer: JWT_ISSUER,
    });
    return {
      access_token,
      mustChangePassword: user.mustChangePassword,
      user,
    };
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    });
  }
}
