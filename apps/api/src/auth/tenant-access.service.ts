import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Escopo de tenants por usuário.
 * - super_admin: null = sem restrição (todas as empresas).
 * - Demais: lista de UserTenant; sem vínculos = [] (nenhum acesso) — deny-by-default.
 */
@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** JWT `sub` pode ser o id interno (login local) ou o Cognito sub — resolve para `User.id`. */
  async resolveInternalUserId(jwtSub: string): Promise<string | null> {
    const u = await this.prisma.user.findFirst({
      where: { OR: [{ id: jwtSub }, { cognitoSub: jwtSub }] },
      select: { id: true },
    });
    return u?.id ?? null;
  }

  /** true só para super_admin (allowed === null). */
  isUnrestricted(allowedTenantIds: string[] | null | undefined): boolean {
    return allowedTenantIds === null;
  }

  canAccessTenant(allowedTenantIds: string[] | null | undefined, tenantId: string): boolean {
    if (allowedTenantIds === null) return true;
    return Array.isArray(allowedTenantIds) && allowedTenantIds.includes(tenantId);
  }

  /**
   * null = pode aceder a qualquer tenant (somente super_admin).
   * [] = nenhum tenant.
   * string[] = apenas esses IDs.
   */
  async getAllowedTenantIds(jwtSub: string, role: string | undefined): Promise<string[] | null> {
    if (role === 'super_admin') return null;
    const userId = await this.resolveInternalUserId(jwtSub);
    if (!userId) return [];
    const rows = await this.prisma.userTenant.findMany({
      where: { userId },
      select: { tenantId: true },
    });
    return rows.map((r) => r.tenantId);
  }

  assertCanAccessTenant(allowedTenantIds: string[] | null, tenantId: string): void {
    if (!this.canAccessTenant(allowedTenantIds, tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }
  }

  /**
   * Quem pode gravar UserTenant noutro usuário: super_admin livre;
   * outros só podem atribuir subconjunto do próprio escopo.
   */
  async assertActorCanAssignTenants(
    actorJwtSub: string,
    actorRole: string | undefined,
    targetTenantIds: string[],
  ): Promise<void> {
    if (actorRole === 'super_admin') return;
    const actorAllowed = await this.getAllowedTenantIds(actorJwtSub, actorRole);
    if (actorAllowed === null) return;
    if (actorAllowed.length === 0 && targetTenantIds.length > 0) {
      throw new ForbiddenException(
        'Seu usuário não tem empresas vinculadas; peça ao super admin para definir o escopo.',
      );
    }
    const invalid = targetTenantIds.filter((id) => !actorAllowed.includes(id));
    if (invalid.length > 0) {
      throw new ForbiddenException('Não pode atribuir empresas fora do seu escopo.');
    }
  }
}
