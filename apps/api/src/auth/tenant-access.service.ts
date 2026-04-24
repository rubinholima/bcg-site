import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Escopo de tenants por utilizador.
 * - super_admin: sempre sem restrição (retorna null).
 * - Outros: sem linhas em UserTenant = sem restrição (null), compatível com instalações existentes.
 * - Com uma ou mais linhas: retorna lista de tenantIds permitidos (restrição ativa).
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

  /**
   * null = pode aceder a qualquer tenant (no sentido da app: todas as empresas exceto regras de negócio).
   * string[] (não vazio) = apenas esses IDs.
   */
  async getAllowedTenantIds(jwtSub: string, role: string | undefined): Promise<string[] | null> {
    if (role === 'super_admin') return null;
    const userId = await this.resolveInternalUserId(jwtSub);
    if (!userId) return null;
    const rows = await this.prisma.userTenant.findMany({
      where: { userId },
      select: { tenantId: true },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => r.tenantId);
  }

  assertCanAccessTenant(allowedTenantIds: string[] | null, tenantId: string): void {
    if (allowedTenantIds === null) return;
    if (!allowedTenantIds.includes(tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }
  }

  /**
   * Quem pode gravar UserTenant noutro utilizador: super_admin livre;
   * outros só podem atribuir subconjunto do próprio escopo (se tiverem escopo restrito).
   */
  async assertActorCanAssignTenants(
    actorJwtSub: string,
    actorRole: string | undefined,
    targetTenantIds: string[],
  ): Promise<void> {
    if (actorRole === 'super_admin') return;
    const actorAllowed = await this.getAllowedTenantIds(actorJwtSub, actorRole);
    if (actorAllowed === null) return;
    const invalid = targetTenantIds.filter((id) => !actorAllowed.includes(id));
    if (invalid.length > 0) {
      throw new ForbiddenException('Não pode atribuir empresas fora do seu escopo.');
    }
  }
}
