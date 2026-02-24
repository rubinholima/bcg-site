import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export const JWT_ISSUER = 'bcg-platform';

export interface LocalJwtPayload {
  sub: string;
  email: string;
  role: string;
  iss: string;
  exp?: number;
  iat?: number;
}

@Injectable()
export class CredentialsAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<{ id: string; email: string; name: string | null; role: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user?.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? 'editor',
    };
  }

  async login(email: string, password: string): Promise<{ access_token: string; user: { id: string; email: string; name: string | null; role: string } }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    const payload: LocalJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iss: JWT_ISSUER,
    };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: '7d',
      issuer: JWT_ISSUER,
    });
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
