import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  lastTenant: LastActivityDto | null;
  lastUser: LastActivityDto | null;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [
      tenantsCount,
      tenantKindsCount,
      usersCount,
      workmailOrgsCount,
      workmailAccountsCount,
      lastTenantRow,
      lastUserRow,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenantKind.count(),
      this.prisma.user.count(),
      this.prisma.tenant.count({ where: { workmailOrganizationId: { not: null } } }),
      this.prisma.workMailAccount.count(),
      this.prisma.tenant.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { name: true, createdAt: true },
      }),
      this.prisma.user.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { name: true, email: true, createdAt: true },
      }),
    ]);

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
      lastTenant,
      lastUser,
    };
  }
}
