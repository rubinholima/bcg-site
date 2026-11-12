import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceDelegationService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(tenantId: string, capability?: string) {
    const now = new Date();
    return this.prisma.financePaymentDelegation.findMany({
      where: {
        tenantId,
        revokedAt: null,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        ...(capability?.trim() ? { capability: capability.trim() } : {}),
      },
      orderBy: { validFrom: 'desc' },
    });
  }

  async grant(
    tenantId: string,
    input: {
      grantedByUserId: string;
      grantedToUserId: string;
      capability: string;
      validFrom?: string;
      validUntil?: string;
      reason?: string;
    },
  ) {
    if (input.grantedByUserId === input.grantedToUserId) {
      throw new BadRequestException('Delegação deve ser para outro usuário.');
    }
    return this.prisma.financePaymentDelegation.create({
      data: {
        tenantId,
        grantedByUserId: input.grantedByUserId,
        grantedToUserId: input.grantedToUserId,
        capability: input.capability.trim(),
        validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        reason: input.reason?.trim() || null,
      },
    });
  }

  async revoke(tenantId: string, id: string, revokedByUserId: string) {
    const row = await this.prisma.financePaymentDelegation.findFirst({
      where: { id, tenantId, revokedAt: null },
    });
    if (!row) throw new BadRequestException('Delegação não encontrada ou já revogada.');
    return this.prisma.financePaymentDelegation.update({
      where: { id },
      data: { revokedAt: new Date(), revokedByUserId },
    });
  }

  async hasActiveDelegation(
    tenantId: string,
    userId: string,
    capability: string,
  ): Promise<boolean> {
    const now = new Date();
    const hit = await this.prisma.financePaymentDelegation.findFirst({
      where: {
        tenantId,
        grantedToUserId: userId,
        capability,
        revokedAt: null,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
    });
    return !!hit;
  }
}
