import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardStatsDto {
  tenantsCount: number;
  tenantKindsCount: number;
  usersCount: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [tenantsCount, tenantKindsCount, usersCount] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenantKind.count(),
      this.prisma.user.count(),
    ]);
    return {
      tenantsCount,
      tenantKindsCount,
      usersCount,
    };
  }
}
