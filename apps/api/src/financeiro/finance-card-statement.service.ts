import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { moneyDecimal, moneyToNumber } from './finance-money.util';

@Injectable()
export class FinanceCardStatementService {
  constructor(private readonly prisma: PrismaService) {}

  async createStatement(
    tenantId: string,
    input: {
      financeAccountId: string;
      periodStart: string;
      periodEnd: string;
      dueDate?: string;
    },
  ) {
    const account = await this.prisma.financeAccount.findFirst({
      where: { id: input.financeAccountId, tenantId, accountType: 'CREDIT_CARD', active: true },
    });
    if (!account) throw new BadRequestException('Conta de cartão inválida.');

    return this.prisma.financeCardStatement.create({
      data: {
        tenantId,
        financeAccountId: account.id,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        status: 'open',
      },
    });
  }

  async payStatement(
    tenantId: string,
    statementId: string,
    input: { fromFinanceAccountId: string; amount: number; paidAt: string; notes?: string },
  ) {
    const statement = await this.prisma.financeCardStatement.findFirst({
      where: { id: statementId, tenantId },
    });
    if (!statement) throw new NotFoundException('Fatura não encontrada.');

    const fromAccount = await this.prisma.financeAccount.findFirst({
      where: { id: input.fromFinanceAccountId, tenantId, active: true },
    });
    if (!fromAccount) throw new BadRequestException('Conta de pagamento inválida.');

    const payment = await this.prisma.$transaction(async (tx) => {
      const row = await tx.financeCardStatementPayment.create({
        data: {
          tenantId,
          statementId,
          fromFinanceAccountId: fromAccount.id,
          amount: moneyDecimal(input.amount),
          paidAt: new Date(input.paidAt),
          notes: input.notes?.trim() || null,
        },
      });
      await tx.financeCardStatement.update({
        where: { id: statementId },
        data: { status: 'paid' },
      });
      return row;
    });

    return { ...payment, amount: moneyToNumber(payment.amount) };
  }

  async linkSettlementToStatement(
    tenantId: string,
    statementId: string,
    settlementId: string,
    amount: number,
  ) {
    return this.prisma.financeCardStatementItem.create({
      data: {
        tenantId,
        statementId,
        settlementId,
        amount: moneyDecimal(amount),
      },
    });
  }
}
