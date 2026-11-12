import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceAuditService } from './finance-audit.service';

@Injectable()
export class FinanceReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  async markReconciled(
    tenantId: string,
    lancamentoId: string,
    input: { notes?: string; status?: 'reconciled' | 'exception' },
    actorUserId?: string | null,
  ) {
    const lanc = await this.prisma.financeiroLancamento.findFirst({
      where: { id: lancamentoId, tenantId },
    });
    if (!lanc) throw new NotFoundException('Lançamento não encontrado.');
    if (lanc.status !== 'pago' && lanc.status !== 'parcial') {
      throw new BadRequestException('Somente lançamentos com baixa podem ser conciliados.');
    }

    const status = input.status ?? 'reconciled';
    await this.prisma.financeiroLancamento.update({
      where: { id: lancamentoId },
      data: {
        reconciliationStatus: status,
        reconciledAt: new Date(),
        reconciledByUserId: actorUserId ?? null,
        reconciliationNotes: input.notes?.trim() || null,
      },
    });

    await this.audit.log({
      tenantId,
      financeiroLancamentoId: lancamentoId,
      eventType: 'reconciled',
      actorUserId: actorUserId ?? null,
      metadata: { status },
    });

    return { ok: true, reconciliationStatus: status };
  }
}
