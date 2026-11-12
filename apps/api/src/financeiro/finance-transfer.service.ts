import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceAuditService } from './finance-audit.service';
import { moneyDecimal, moneyToNumber } from './finance-money.util';

@Injectable()
export class FinanceTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  async createInternalTransfer(
    tenantId: string,
    input: {
      sourceAccountId: string;
      destAccountId: string;
      amount: number;
      transferDate: string;
      description?: string;
      idempotencyKey: string;
    },
    actorUserId?: string | null,
  ) {
    if (input.sourceAccountId === input.destAccountId) {
      throw new BadRequestException('Conta origem e destino devem ser diferentes.');
    }

    const existing = await this.prisma.financeInternalTransfer.findFirst({
      where: { tenantId, transferGroupId: input.idempotencyKey.trim() },
    });
    if (existing) return existing;

    const [source, dest] = await Promise.all([
      this.prisma.financeAccount.findFirst({
        where: { id: input.sourceAccountId, tenantId, active: true },
      }),
      this.prisma.financeAccount.findFirst({
        where: { id: input.destAccountId, tenantId, active: true },
      }),
    ]);
    if (!source || !dest) throw new BadRequestException('Contas inválidas ou inativas.');
    if (source.currency !== dest.currency) {
      throw new BadRequestException('Transferência entre moedas diferentes não suportada.');
    }

    const amount = moneyDecimal(input.amount);
    if (amount.lte(0)) throw new BadRequestException('Valor inválido.');

    const groupId = input.idempotencyKey.trim() || randomUUID();

    const transfer = await this.prisma.$transaction(async (tx) => {
      const header = await tx.financeInternalTransfer.create({
        data: {
          tenantId,
          transferGroupId: groupId,
          sourceAccountId: source.id,
          destAccountId: dest.id,
          amount,
          currency: source.currency,
          transferDate: new Date(input.transferDate),
          description: input.description?.trim() || null,
          createdByUserId: actorUserId ?? null,
        },
      });

      await tx.financeTransferLeg.create({
        data: {
          tenantId,
          transferGroupId: groupId,
          sourceAccountId: source.id,
          destAccountId: dest.id,
          amount,
          transferDate: new Date(input.transferDate),
          internalTransferId: header.id,
          legSide: 'outbound',
          notes: input.description?.trim() || null,
        },
      });
      await tx.financeTransferLeg.create({
        data: {
          tenantId,
          transferGroupId: groupId,
          sourceAccountId: source.id,
          destAccountId: dest.id,
          amount,
          transferDate: new Date(input.transferDate),
          internalTransferId: header.id,
          legSide: 'inbound',
          notes: input.description?.trim() || null,
        },
      });

      return header;
    });

    await this.audit.log({
      tenantId,
      eventType: 'internal_transfer',
      actorUserId: actorUserId ?? null,
      metadata: {
        transferId: transfer.id,
        sourceAccountId: source.id,
        destAccountId: dest.id,
        amount: moneyToNumber(amount),
      },
    });

    return transfer;
  }
}
