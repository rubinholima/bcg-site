import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { moneyDecimal, moneyEquals, moneyToNumber, obligationAmount } from './finance-money.util';
import { FinanceAuditService } from './finance-audit.service';

export type AllocationLineInput = {
  financeCategoryId?: string;
  description?: string;
  amount: number;
};

@Injectable()
export class FinanceAllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  async replaceLines(
    tenantId: string,
    lancamentoId: string,
    lines: AllocationLineInput[],
    actorUserId?: string | null,
  ) {
    const lanc = await this.prisma.financeiroLancamento.findFirst({
      where: { id: lancamentoId, tenantId },
    });
    if (!lanc) throw new NotFoundException('Lançamento não encontrado.');

    const target = obligationAmount(lanc);
    const total = lines.reduce((acc, l) => acc.add(moneyDecimal(l.amount)), moneyDecimal(0));
    if (!moneyEquals(total, target)) {
      throw new BadRequestException(
        `Rateio deve totalizar ${moneyToNumber(target)} (informado ${moneyToNumber(total)}).`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.financeAllocationLine.deleteMany({
        where: { tenantId, financeiroLancamentoId: lancamentoId },
      });
      let order = 0;
      for (const line of lines) {
        await tx.financeAllocationLine.create({
          data: {
            tenantId,
            financeiroLancamentoId: lancamentoId,
            financeCategoryId: line.financeCategoryId ?? null,
            description: line.description?.trim() || null,
            amount: moneyDecimal(line.amount),
            sortOrder: order++,
          },
        });
      }
    });

    await this.audit.log({
      tenantId,
      financeiroLancamentoId: lancamentoId,
      eventType: 'classification_changed',
      actorUserId: actorUserId ?? null,
      metadata: { lineCount: lines.length },
    });

    return this.list(tenantId, lancamentoId);
  }

  async list(tenantId: string, lancamentoId: string) {
    return this.prisma.financeAllocationLine.findMany({
      where: { tenantId, financeiroLancamentoId: lancamentoId },
      orderBy: { sortOrder: 'asc' },
      include: { financeCategory: { select: { id: true, name: true, parentId: true } } },
    });
  }
}
