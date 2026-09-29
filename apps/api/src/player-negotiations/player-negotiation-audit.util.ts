import { Prisma } from '@prisma/client';

export type NegotiationAuditEntry = {
  at: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
};

export async function appendNegotiationAudit(
  prisma: { playerNegotiationAuditLog: { create: (args: unknown) => Promise<unknown> } },
  negotiationId: string,
  entry: Omit<NegotiationAuditEntry, 'at'> & { at?: string },
) {
  await prisma.playerNegotiationAuditLog.create({
    data: {
      negotiationId,
      at: entry.at ? new Date(entry.at) : new Date(),
      userId: entry.userId ?? null,
      userName: entry.userName ?? null,
      action: entry.action,
      details: (entry.details ?? null) as Prisma.InputJsonValue,
    },
  });
}
