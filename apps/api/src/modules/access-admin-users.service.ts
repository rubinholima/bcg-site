import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../auth/tenant-access.service';

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
      if (allowed === null) {
        const rows = await this.prisma.user.findMany({
          where: { role: { not: 'super_admin' } },
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
      if (allowed.length === 0) return [];

      const links = await this.prisma.userTenant.findMany({
        where: { tenantId: { in: allowed } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const ids = links.map((l) => l.userId);
      if (ids.length === 0) return [];

      const rows = await this.prisma.user.findMany({
        where: { id: { in: ids }, role: { not: 'super_admin' } },
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

    const allowed = await this.tenantAccess.getAllowedTenantIds(actorJwtSub, role);
    if (allowed === null) return;
    if (allowed.length === 0) {
      throw new ForbiddenException('Seu usuário não tem empresas vinculadas.');
    }
    const sharesTenant = target.userTenants.some((t) => allowed.includes(t.tenantId));
    if (!sharesTenant) {
      throw new ForbiddenException('Usuário fora do seu escopo de empresas.');
    }
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
