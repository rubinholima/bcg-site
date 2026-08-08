import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { cadastroUpper } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { generateTemporaryPassword } from './user-credentials.constants';
import { ensureUniqueUsername, normalizeUsernameInput } from './user-username.util';

export type UserRole = string;

export interface UserListItem {
  id: string | null;
  cognitoSub: string;
  username: string;
  email: string;
  name: string | null;
  role: UserRole;
  enabled: boolean;
  mustChangePassword: boolean;
  /** Empresas/clubes atribuídos (escopo). Vazio = sem linhas em UserTenant (ver todas, exceto super_admin). */
  tenantIds?: string[];
  /** Nomes para exibição na lista (mesmo conjunto que tenantIds). */
  tenants?: { id: string; name: string }[];
  createdAt?: string;
  updatedAt?: string;
}

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
  ) {}

  private async assertAssignableRole(role: string) {
    const ok = await this.rolesService.isAssignableRole(role);
    if (!ok) {
      throw new BadRequestException('Perfil inválido ou inativo');
    }
  }

  private mapUser(u: {
    id: string;
    cognitoSub: string | null;
    username: string;
    email: string;
    name: string | null;
    role: string | null;
    passwordHash: string | null;
    mustChangePassword: boolean;
    createdAt: Date;
    updatedAt: Date;
    userTenants: { tenantId: string; tenant: { id: string; name: string } }[];
  }): UserListItem {
    return {
      id: u.id,
      cognitoSub: u.cognitoSub ?? u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      role: (u.role as UserRole) ?? 'editor',
      enabled: Boolean(u.passwordHash || u.cognitoSub),
      mustChangePassword: u.mustChangePassword,
      tenantIds: u.userTenants.map((t) => t.tenantId),
      tenants: u.userTenants.map((t) => ({ id: t.tenant.id, name: t.tenant.name })),
      createdAt: u.createdAt?.toISOString(),
      updatedAt: u.updatedAt?.toISOString(),
    };
  }

  private userInclude() {
    return {
      userTenants: {
        include: { tenant: { select: { id: true, name: true } } },
      },
    } as const;
  }

  async findAll(): Promise<UserListItem[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: this.userInclude(),
    });
    return users.map((u) => this.mapUser(u));
  }

  async findOne(username: string): Promise<UserListItem | null> {
    const login = normalizeUsernameInput(decodeURIComponent(username));
    const user = await this.prisma.user.findUnique({
      where: { username: login },
      include: this.userInclude(),
    });
    if (!user) return null;
    return this.mapUser(user);
  }

  async create(
    dto: CreateUserDto,
  ): Promise<{ username: string; sub: string; temporaryPassword: string }> {
    const role = dto.role?.trim() || 'editor';
    await this.assertAssignableRole(role);
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Já existe um usuário com este email');
    }
    const username = normalizeUsernameInput(dto.username);
    const usernameTaken = await this.prisma.user.findUnique({ where: { username } });
    if (usernameTaken) {
      throw new ConflictException('Já existe um usuário com este username');
    }
    const temporaryPassword = generateTemporaryPassword(12);
    const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name: dto.name != null ? cadastroUpper(dto.name) : null,
        passwordHash,
        mustChangePassword: true,
        role,
      },
    });
    if (dto.tenantIds !== undefined) {
      await this.replaceUserTenants(user.id, dto.tenantIds);
    }
    return { username: user.username, sub: user.id, temporaryPassword };
  }

  async updateRole(username: string, role: UserRole): Promise<void> {
    await this.assertAssignableRole(role);
    const user = await this.findByUsername(username);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { role, updatedAt: new Date() },
    });
  }

  async update(
    username: string,
    dto: {
      name?: string | null;
      email?: string;
      username?: string;
      role?: UserRole;
      password?: string;
      tenantIds?: string[];
    },
  ): Promise<void> {
    const user = await this.findByUsername(username);
    const data: {
      name?: string | null;
      email?: string;
      username?: string;
      role?: string;
      passwordHash?: string;
      mustChangePassword?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) data.name = dto.name != null ? cadastroUpper(dto.name) : null;
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== user.email) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) throw new ConflictException('Já existe um usuário com este email');
        data.email = email;
      }
    }
    if (dto.username !== undefined) {
      const nextUsername = normalizeUsernameInput(dto.username);
      if (nextUsername !== user.username) {
        const existing = await this.prisma.user.findUnique({ where: { username: nextUsername } });
        if (existing) throw new ConflictException('Já existe um usuário com este username');
        data.username = nextUsername;
      }
    }
    if (dto.role !== undefined) {
      await this.assertAssignableRole(dto.role);
      data.role = dto.role;
    }
    if (dto.password !== undefined && dto.password.length > 0) {
      data.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      data.mustChangePassword = false;
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data,
    });
    if (dto.tenantIds !== undefined) {
      await this.replaceUserTenants(user.id, dto.tenantIds);
    }
  }

  private async replaceUserTenants(userId: string, tenantIds: string[]): Promise<void> {
    const unique = [...new Set(tenantIds.map((id) => id.trim()).filter(Boolean))];
    if (unique.length > 0) {
      const count = await this.prisma.tenant.count({
        where: { id: { in: unique }, slug: { not: 'bcg' } },
      });
      if (count !== unique.length) {
        throw new BadRequestException('Uma ou mais empresas são inválidas.');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.userTenant.deleteMany({ where: { userId } });
      if (unique.length > 0) {
        await tx.userTenant.createMany({
          data: unique.map((tenantId) => ({ userId, tenantId })),
        });
      }
    });
  }

  async remove(username: string): Promise<void> {
    const user = await this.findByUsername(username);
    await this.prisma.user.delete({ where: { id: user.id } });
  }

  private async findByUsername(username: string) {
    const login = normalizeUsernameInput(decodeURIComponent(username));
    const user = await this.prisma.user.findUnique({
      where: { username: login },
      include: this.userInclude(),
    });
    if (!user) {
      throw new NotFoundException(`Usuário não encontrado: ${username}`);
    }
    return user;
  }
}
