import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

export type UserRole =
  | 'super_admin'
  | 'company_admin'
  | 'editor'
  | 'analista'
  | 'diretoria'
  | 'medico'
  | 'psicologo'
  | 'user';

export interface UserListItem {
  id: string | null;
  cognitoSub: string;
  username: string;
  email: string;
  name: string | null;
  role: UserRole;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserListItem[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { email: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      cognitoSub: u.cognitoSub ?? u.id,
      username: u.email,
      email: u.email,
      name: u.name,
      role: (u.role as UserRole) ?? 'editor',
      enabled: Boolean(u.passwordHash || u.cognitoSub),
      createdAt: u.createdAt?.toISOString(),
      updatedAt: u.updatedAt?.toISOString(),
    }));
  }

  async findOne(username: string): Promise<UserListItem | null> {
    const email = decodeURIComponent(username).trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) return null;
    return {
      id: user.id,
      cognitoSub: user.cognitoSub ?? user.id,
      username: user.email,
      email: user.email,
      name: user.name,
      role: (user.role as UserRole) ?? 'editor',
      enabled: Boolean(user.passwordHash || user.cognitoSub),
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    };
  }

  async create(dto: CreateUserDto): Promise<{ username: string; sub: string }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Já existe um usuário com este email');
    }
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name ?? null,
        passwordHash,
        role: (dto.role as UserRole) ?? 'editor',
      },
    });
    return { username: user.email, sub: user.id };
  }

  async updateRole(username: string, role: UserRole): Promise<void> {
    const user = await this.findByUsername(username);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { role, updatedAt: new Date() },
    });
  }

  async update(
    username: string,
    dto: { name?: string | null; email?: string; role?: UserRole; password?: string },
  ): Promise<void> {
    const user = await this.findByUsername(username);
    const data: { name?: string | null; email?: string; role?: string; passwordHash?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== user.email) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) throw new ConflictException('Já existe um usuário com este email');
        data.email = email;
      }
    }
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.password !== undefined && dto.password.length > 0) {
      data.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data,
    });
  }

  async remove(username: string): Promise<void> {
    const user = await this.findByUsername(username);
    await this.prisma.user.delete({ where: { id: user.id } });
  }

  private async findByUsername(username: string) {
    const email = decodeURIComponent(username).trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException(`Usuário não encontrado: ${username}`);
    }
    return user;
  }
}
