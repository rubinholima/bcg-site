import { BadRequestException } from '@nestjs/common';

/**
 * Fase 064 — escrita Omie proibida. Implementações futuras permanecem desabilitadas.
 */
export class FinanceOmieWriteDisabled {
  static assertReadOnly(operation: string): void {
    throw new BadRequestException(
      `Operação Omie "${operation}" desabilitada. Fase atual: somente leitura Omie → CUP360.`,
    );
  }

  createPayable(): void {
    FinanceOmieWriteDisabled.assertReadOnly('createPayable');
  }
  createReceivable(): void {
    FinanceOmieWriteDisabled.assertReadOnly('createReceivable');
  }
  settleTitle(): void {
    FinanceOmieWriteDisabled.assertReadOnly('settleTitle');
  }
}
