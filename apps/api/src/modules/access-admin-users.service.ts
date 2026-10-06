import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import {
  COMPANY_ADMIN_CREATED_USER_LEGACY_ROLE,
  PRIVILEGED_LEGACY_ROLES,
  isPlatformIdentityAdmin,
} from './user-identity-admin.constants';
import type { UserListItem } from '../users/users.service';
import { normalizeUsernameInput } from '../users/user-username.util';

export type AccessAdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  platformFunctionId: string | null;
  platformFunctionName: string | null;
  tenantIds: string[];
  tenantNames: string[];
  blocked: boolean;
};

@Injectable()
export class AccessAdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  /** Todos os tenants do alvo devem estar no escopo do ator (CA). */
  isTargetFullyInTenantScope(targetTenantIds: string[], allowed: string[]): boolean {
    if (targetTenantIds.length === 0) return false;
    return targetTenantIds.every((id) => allowed.includes(id));
  }

  assertCanCreateOrManageIdentities(actorRole: string): void {
    if (!isPlatformIdentityAdmin(actorRole)) {
      throw new ForbiddenException(
        'Apenas super admin ou company admin podem criar ou gerenciar usuários.',
      );
    }
  }

  assertCompanyAdminCreatePayload(
    tenantIds: string[] | undefined,
    requestedRole: string | undefined,
  ): void {
    const role = (requestedRole ?? '').trim();
    if (role === 'super_admin' || role === 'company_admin') {
      throw new ForbiddenException('Company admin não pode criar usuários com perfil elevado.');
    }
    const ids = tenantIds ?? [];
    if (ids.length === 0) {
      throw new BadRequestException('Selecione ao menos uma empresa para o novo usuário.');
    }
  }

  assertCompanyAdminRoleChange(requestedRole: string | undefined): void {
    const role = (requestedRole ?? '').trim();
    if (!role) return;
    if (PRIVILEGED_LEGACY_ROLES.has(role)) {
      throw new ForbiddenException('Company admin não pode atribuir perfil elevado.');
    }
  }

  async listManageableUsers(actorJwtSub: string, actorRole: string): Promise<AccessAdminUserRow[]> {
    const role = (actorRole ?? '').trim();
    if (role === 'super_admin') {
      const rows = await this.prisma.user.findMany({
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          platformFunctionId: true,
          blocked: true,
          platformFunction: { select: { id: true, name: true } },
          userTenants: { include: { tenant: { select: { id: true, name: true } } } },
        },
      });
      return rows.map((u) => this.toDto(u));
    }
    if (role === 'company_admin') {
      const allowed = await this.tenantAccess.getAllowedTenantIds(actorJwtSub, role);
      if (allowed === null || allowed.length === 0) return [];
      return this.listCompanyAdminScopedRows(allowed);
    }
    throw new ForbiddenException('Acesso restrito a administradores da plataforma.');
  }

  async assertActorCanManageUser(
    actorJwtSub: string,
    actorRole: string,
    targetUserId: string,
  ): Promise<void> {
    const role = (actorRole ?? '').trim();
    if (role === 'super_admin') return;

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        userTenants: { select: { tenantId: true } },
      },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    if (target.role === 'super_admin') {
      throw new ForbiddenException('Não é permitido alterar usuários super admin.');
    }
    if (target.role === 'company_admin') {
      throw new ForbiddenException('Não é permitido alterar usuários company admin.');
    }

    const allowed = await this.tenantAccess.getAllowedTenantIds(actorJwtSub, role);
    if (allowed === null) return;
    if (allowed.length === 0) {
      throw new ForbiddenException('Seu usuário não tem empresas vinculadas.');
    }
    const targetTenantIds = target.userTenants.map((t) => t.tenantId);
    if (!this.isTargetFullyInTenantScope(targetTenantIds, allowed)) {
      throw new ForbiddenException(
        'Usuário vinculado a empresas fora do seu escopo — gestão não permitida.',
      );
    }
  }

  async assertActorCanManageUserByUsername(
    actorJwtSub: string,
    actorRole: string,
    username: string,
  ): Promise<{ id: string }> {
    const login = normalizeUsernameInput(username);
    const target = await this.prisma.user.findUnique({
      where: { username: login },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    await this.assertActorCanManageUser(actorJwtSub, actorRole, target.id);
    return target;
  }

  async listManageableUsersAsListItems(
    actorJwtSub: string,
    actorRole: string,
  ): Promise<UserListItem[]> {
    const role = (actorRole ?? '').trim();
    if (role === 'super_admin') {
      const users = await this.prisma.user.findMany({
        orderBy: { name: 'asc' },
        include: {
          userTenants: { include: { tenant: { select: { id: true, name: true } } } },
        },
      });
      return users.map((u) => this.toUserListItem(u));
    }
    if (role === 'company_admin') {
      const allowed = await this.tenantAccess.getAllowedTenantIds(actorJwtSub, role);
      if (allowed === null || allowed.length === 0) return [];
      const rows = await this.listCompanyAdminScopedRows(allowed);
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return [];
      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        orderBy: { name: 'asc' },
        include: {
          userTenants: { include: { tenant: { select: { id: true, name: true } } } },
        },
      });
      return users.map((u) => this.toUserListItem(u));
    }
    throw new ForbiddenException('Acesso restrito a administradores da plataforma.');
  }

  /** Mescla tenants: preserva vínculos fora do escopo do company_admin. */
  mergeTenantIdsForCompanyAdminUpdate(
    currentTenantIds: string[],
    requestedTenantIds: string[],
    actorAllowed: string[],
  ): string[] {
    const requested = [...new Set(requestedTenantIds.map((id) => id.trim()).filter(Boolean))];
    const invalid = requested.filter((id) => !actorAllowed.includes(id));
    if (invalid.length > 0) {
      throw new ForbiddenException('Não pode atribuir empresas fora do seu escopo.');
    }
    const preservedOutside = currentTenantIds.filter((id) => !actorAllowed.includes(id));
    return [...new Set([...preservedOutside, ...requested])];
  }

  resolveCreateRoleForActor(actorRole: string, requestedRole?: string): string {
    if (actorRole === 'company_admin') {
      return COMPANY_ADMIN_CREATED_USER_LEGACY_ROLE;
    }
    return requestedRole?.trim() || 'editor';
  }

  private async listCompanyAdminScopedRows(allowed: string[]): Promise<AccessAdminUserRow[]> {
    const links = await this.prisma.userTenant.findMany({
      where: { tenantId: { in: allowed } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const ids = links.map((l) => l.userId);
    if (ids.length === 0) return [];

    const rows = await this.prisma.user.findMany({
      where: {
        id: { in: ids },
        role: { notIn: ['super_admin', 'company_admin'] },
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        platformFunctionId: true,
        blocked: true,
        platformFunction: { select: { id: true, name: true } },
        userTenants: { include: { tenant: { select: { id: true, name: true } } } },
      },
    });
    return rows
      .filter((u) =>
        this.isTargetFullyInTenantScope(
          u.userTenants.map((t) => t.tenant.id),
          allowed,
        ),
      )
      .map((u) => this.toDto(u));
  }

  private toUserListItem(u: {
    id: string;
    cognitoSub: string | null;
    username: string;
    email: string;
    name: string | null;
    role: string | null;
    passwordHash: string | null;
    mustChangePassword: boolean;
    blocked: boolean;
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
      role: (u.role as UserListItem['role']) ?? 'editor',
      enabled: Boolean(u.passwordHash || u.cognitoSub) && !u.blocked,
      blocked: u.blocked,
      mustChangePassword: u.mustChangePassword,
      tenantIds: u.userTenants.map((t) => t.tenantId),
      tenants: u.userTenants.map((t) => ({ id: t.tenant.id, name: t.tenant.name })),
      createdAt: u.createdAt?.toISOString(),
      updatedAt: u.updatedAt?.toISOString(),
    };
  }

  private toDto(
    u: {
      id: string;
      email: string;
      name: string | null;
      role: string | null;
      platformFunctionId: string | null;
      blocked: boolean;
      platformFunction: { id: string; name: string } | null;
      userTenants: Array<{ tenant: { id: string; name: string } }>;
    },
  ): AccessAdminUserRow {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      platformFunctionId: u.platformFunctionId,
      platformFunctionName: u.platformFunction?.name ?? null,
      tenantIds: u.userTenants.map((t) => t.tenant.id),
      tenantNames: u.userTenants.map((t) => t.tenant.name),
      blocked: u.blocked,
    };
  }
}
