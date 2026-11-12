import { BadRequestException } from '@nestjs/common';
import { PIVOT_PAGAMENTOS_ADAPTER_ID } from './finance-import-pivot-pagamentos.parser';

export type PivotSafetyBatch = {
  originalFilename: string;
  sourceType: string;
  fileHash?: string;
};

export function isPivotWorkbookBatch(batch: Pick<PivotSafetyBatch, 'originalFilename'>): boolean {
  const name = batch.originalFilename.trim().toLowerCase();
  return name === 'pivot.xlsx' || name.endsWith('/pivot.xlsx') || name.endsWith('\\pivot.xlsx');
}

export function isPivotAdapterBatch(batch: Pick<PivotSafetyBatch, 'sourceType'>): boolean {
  return batch.sourceType === PIVOT_PAGAMENTOS_ADAPTER_ID;
}

/**
 * Bloqueio de segurança Prompt 063 — pivot.xlsx e adapter Omie pivot permanecem sem escrita canônica
 * até autorização explícita (env FINANCE_IMPORT_ALLOW_PIVOT=1).
 */
export function assertCanonicalImportAllowed(
  batch: PivotSafetyBatch,
  opts: { allowCanonicalWrite?: boolean; allowPivotOverride?: boolean },
): void {
  if (!opts.allowCanonicalWrite) {
    throw new BadRequestException(
      'Execução canônica desabilitada nesta fase. Use simulação e revisão antes de importar.',
    );
  }
  const pivotFile = isPivotWorkbookBatch(batch);
  const pivotAdapter = isPivotAdapterBatch(batch);
  const allowPivot =
    opts.allowPivotOverride === true || process.env.FINANCE_IMPORT_ALLOW_PIVOT === '1';
  if ((pivotFile || pivotAdapter) && !allowPivot) {
    throw new BadRequestException(
      'Importação canônica do pivot.xlsx está bloqueada. Aguarde autorização controlada.',
    );
  }
}

export function pivotSafetyLockActive(batch: PivotSafetyBatch): boolean {
  const allowPivot = process.env.FINANCE_IMPORT_ALLOW_PIVOT === '1';
  if (allowPivot) return false;
  return isPivotWorkbookBatch(batch) || isPivotAdapterBatch(batch);
}
