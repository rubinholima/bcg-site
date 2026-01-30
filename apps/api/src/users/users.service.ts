import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CognitoService, CognitoRole } from '../cognito/cognito.service';
import { CreateUserDto } from './dto/create-user.dto';

export interface UserListItem {
  id: string | null;
  cognitoSub: string;
  username: string;
  email: string;
  name: string | null;
  role: CognitoRole;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cognito: CognitoService,
  ) {}

  async findAll(): Promise<UserListItem[]> {
    const cognitoUsers = await this.cognito.listUsers();
    const subs = cognitoUsers.map((u) => u.sub).filter(Boolean);
    const dbUsers = await this.prisma.user.findMany({
      where: { cognitoSub: { in: subs } },
    });
    const bySub = new Map(dbUsers.map((u) => [u.cognitoSub ?? '', u]));
    return cognitoUsers.map((u) => {
      const db = bySub.get(u.sub);
      return {
        id: db?.id ?? null,
        cognitoSub: u.sub,
        username: u.username,
        email: u.email,
        name: u.name ?? db?.name ?? null,
        role: u.role,
        enabled: u.enabled,
        createdAt: db?.createdAt?.toISOString(),
        updatedAt: db?.updatedAt?.toISOString(),
      };
    });
  }

  async create(dto: CreateUserDto): Promise<{ username: string; sub: string }> {
    const { username, sub } = await this.cognito.createUser({
      email: dto.email,
      name: dto.name ?? null,
      temporaryPassword: dto.temporaryPassword,
      role: dto.role as CognitoRole,
    });
    await this.prisma.user.upsert({
      where: { cognitoSub: sub },
      create: {
        cognitoSub: sub,
        email: dto.email,
        name: dto.name ?? null,
      },
      update: {
        email: dto.email,
        name: dto.name ?? null,
        updatedAt: new Date(),
      },
    });
    return { username, sub };
  }

  async updateRole(username: string, role: CognitoRole): Promise<void> {
    const found = await this.cognito.getUser(username);
    if (!found) {
      throw new NotFoundException(`Usuário não encontrado: ${username}`);
    }
    await this.cognito.setUserRole(username, role);
  }

  async findOne(username: string): Promise<UserListItem | null> {
    const cognitoUser = await this.cognito.getUser(username);
    if (!cognitoUser) return null;
    const dbUser = cognitoUser.sub
      ? await this.prisma.user.findUnique({
          where: { cognitoSub: cognitoUser.sub },
        })
      : null;
    return {
      id: dbUser?.id ?? null,
      cognitoSub: cognitoUser.sub,
      username: cognitoUser.username,
      email: cognitoUser.email,
      name: cognitoUser.name ?? dbUser?.name ?? null,
      role: cognitoUser.role,
      enabled: cognitoUser.enabled,
      createdAt: dbUser?.createdAt?.toISOString(),
      updatedAt: dbUser?.updatedAt?.toISOString(),
    };
  }

  async update(
    username: string,
    dto: { name?: string | null; email?: string; role?: CognitoRole },
  ): Promise<void> {
    const found = await this.cognito.getUser(username);
    if (!found) {
      throw new NotFoundException(`Usuário não encontrado: ${username}`);
    }
    if (dto.name !== undefined || dto.email !== undefined) {
      await this.cognito.updateUserAttributes(username, {
        name: dto.name,
        email: dto.email,
      });
    }
    if (dto.role !== undefined) {
      await this.cognito.setUserRole(username, dto.role);
    }
    if (found.sub && (dto.name !== undefined || dto.email !== undefined)) {
      await this.prisma.user.upsert({
        where: { cognitoSub: found.sub },
        create: {
          cognitoSub: found.sub,
          email: dto.email ?? found.email,
          name: dto.name ?? found.name ?? null,
        },
        update: {
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.name !== undefined && { name: dto.name ?? null }),
          updatedAt: new Date(),
        },
      });
    }
  }

  async remove(username: string): Promise<void> {
    const found = await this.cognito.getUser(username);
    if (!found) {
      throw new NotFoundException(`Usuário não encontrado: ${username}`);
    }
    await this.cognito.deleteUser(username);
    if (found.sub) {
      await this.prisma.user.deleteMany({ where: { cognitoSub: found.sub } });
    }
  }
}
