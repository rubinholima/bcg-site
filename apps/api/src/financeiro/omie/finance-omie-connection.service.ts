import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OmieService } from '../../integrations/omie/omie.service';
import type { FinanceOmieConnectionStatusDto } from './finance-omie.types';

@Injectable()
export class FinanceOmieConnectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly omie: OmieService,
  ) {}

  async getConnectionStatus(tenantId: string): Promise<FinanceOmieConnectionStatusDto> {
    const omieStatus = await this.omie.getStatusForTenant(tenantId);
    const syncState = await this.prisma.financeOmieTenantSyncState.findUnique({
      where: { tenantId },
    });

    return {
      configured: omieStatus.configured,
      ok: omieStatus.ok,
      message: omieStatus.message,
      lastSuccessfulSyncAt: syncState?.lastSuccessfulSyncAt?.toISOString() ?? null,
      lastSyncAttemptAt: syncState?.lastSyncAttemptAt?.toISOString() ?? null,
      lastSyncStatus: syncState?.lastSyncStatus ?? null,
      lastSyncError: syncState?.lastSyncError ?? null,
    };
  }
}
