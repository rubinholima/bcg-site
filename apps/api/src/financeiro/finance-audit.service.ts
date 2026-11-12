import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type FinanceAuditInput = {
  tenantId: string;
  financeiroLancamentoId?: string | null;
  eventType: string;
  actorUserId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class FinanceAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: FinanceAuditInput): Promise<void> {
    await this.prisma.financeAuditEvent.create({
      data: {
        tenantId: input.tenantId,
        financeiroLancamentoId: input.financeiroLancamentoId ?? null,
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
