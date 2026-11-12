import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceAuditService } from '../finance-audit.service';

export type FinanceImportExecuteOptions = {
  allowCanonicalWrite?: boolean;
  actorUserId?: string | null;
  actorName?: string | null;
};

@Injectable()
export class FinanceImportExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  /**
   * Fundação transacional/idempotente — gravação canônica bloqueada até revisão explícita (Prompt 062).
   */
  async executeBatch(tenantId: string, batchId: string, opts: FinanceImportExecuteOptions) {
    const batch = await this.prisma.financeImportBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    if (!batch) throw new NotFoundException('Lote de importação não encontrado.');
    if (batch.status !== 'APPROVED') {
      throw new BadRequestException('Lote precisa estar aprovado antes da execução.');
    }

    if (!opts.allowCanonicalWrite) {
      await this.audit.log({
        tenantId,
        eventType: 'finance_import_execute_blocked',
        actorUserId: opts.actorUserId,
        actorName: opts.actorName,
        metadata: { batchId, reason: 'canonical_write_disabled' },
      });
      throw new BadRequestException(
        'Execução canônica desabilitada nesta fase. Use simulação e revisão antes de importar.',
      );
    }

    // Implementação futura: transação + idempotência por staging row + provenance FinanceExternalLink (spreadsheet_import)
    throw new BadRequestException('Execução canônica ainda não habilitada neste ambiente.');
  }
}
