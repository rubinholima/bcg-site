import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RhAuditInput = {
  tenantId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class RhAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: RhAuditInput): Promise<void> {
    try {
      await this.prisma.rhAuditLog.create({
        data: {
          tenantId: input.tenantId ?? null,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          actorUserId: input.actorUserId ?? null,
          actorName: input.actorName ?? null,
          metadata: input.metadata ? (input.metadata as object) : undefined,
        },
      });
    } catch {
      /* auditoria não deve quebrar fluxo operacional */
    }
  }
}
