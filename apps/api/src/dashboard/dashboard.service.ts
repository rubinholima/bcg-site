import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkMailService } from '../workmail/workmail.service';

/** Mesmo slug excluído da listagem de empresas (grupo master). */
const TENANT_COUNT_EXCLUDE_SLUG = 'bcg';

export interface LastActivityDto {
  name: string;
  createdAt: string;
}

export interface DashboardStatsDto {
  tenantsCount: number;
  tenantKindsCount: number;
  usersCount: number;
  workmailOrgsCount: number;
  workmailAccountsCount: number;
  pagesCount: number;
  lastTenant: LastActivityDto | null;
  lastUser: LastActivityDto | null;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workMailService: WorkMailService,
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [
      tenantsCount,
      tenantKindsCount,
      usersCount,
      workmailOrgsCount,
      workmailAccountsCountFromDb,
      pagesCountFromDb,
      lastTenantRow,
      lastUserRow,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { slug: { not: TENANT_COUNT_EXCLUDE_SLUG } } }),
      this.prisma.tenantKind.count(),
      this.prisma.user.count(),
      this.prisma.tenant.count({ where: { workmailOrganizationId: { not: null } } }),
      this.prisma.workMailAccount.count(),
      this.prisma.page.count(),
      this.prisma.tenant.findFirst({
        where: { slug: { not: TENANT_COUNT_EXCLUDE_SLUG } },
        orderBy: { createdAt: 'desc' },
        select: { name: true, createdAt: true },
      }),
      this.prisma.user.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { name: true, email: true, createdAt: true },
      }),
    ]);

    // Páginas publicadas = home do grupo (1) + páginas de empresas (tenant pages)
    const pagesCount = 1 + pagesCountFromDb;

    let workmailAccountsCount = workmailAccountsCountFromDb;
    try {
      workmailAccountsCount = await this.workMailService.getTotalAccountsCount();
    } catch {
      // Se AWS falhar (credenciais, rede, etc.), mantém o valor do banco
    }

    const lastTenant: LastActivityDto | null = lastTenantRow
      ? {
          name: lastTenantRow.name,
          createdAt: lastTenantRow.createdAt.toISOString(),
        }
      : null;

    const lastUser: LastActivityDto | null = lastUserRow
      ? {
          name: lastUserRow.name ?? lastUserRow.email,
          createdAt: lastUserRow.createdAt.toISOString(),
        }
      : null;

    return {
      tenantsCount,
      tenantKindsCount,
      usersCount,
      workmailOrgsCount,
      workmailAccountsCount,
      pagesCount,
      lastTenant,
      lastUser,
    };
  }
}
