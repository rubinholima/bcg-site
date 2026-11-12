import { Injectable } from '@nestjs/common';
import type { FinanceImportSimulationSummary } from './finance-import.types';
import { aggregateControlTotals } from './finance-import-control-totals.util';
import { shouldSkipExecution, type ExecutionRowContext } from './finance-import-execution.engine';
import { rowStructuralConflicts, mappingKey, type MappingRowLike } from './finance-import-readiness.util';
import { parseReconciliation } from './finance-import-validate.util';

type StagingLike = {
  id?: string;
  rowClassification: string | null;
  validationStatus: string;
  duplicateState: string;
  duplicateDecision?: string | null;
  rowDecision?: string | null;
  normalizedValues?: unknown;
  possibleDuplicateLancamentoId?: string | null;
};

@Injectable()
export class FinanceImportSimulationService {
  simulate(
    rows: StagingLike[],
    unresolvedMappings: number,
    mappingVersion: number,
    simulationVersion: number,
    mappings: MappingRowLike[] = [],
  ): FinanceImportSimulationSummary {
    const rowsByClassification: Record<string, number> = {};
    let skippedDuplicates = 0;
    let linkedExisting = 0;
    let excludedRows = 0;
    let blockedRows = 0;
    let conflictRows = 0;
    let obligations = 0;
    let settlements = 0;
    let directDebits = 0;
    let transfers = 0;
    let reconciled = 0;
    let notReconciled = 0;
    let warningsCount = 0;

    const map = new Map<string, MappingRowLike>();
    for (const m of mappings) map.set(mappingKey(m.mappingKind, m.sourceValueNormalized), m);

    for (const row of rows) {
      const cls = row.rowClassification ?? 'OTHER_REVIEW';
      rowsByClassification[cls] = (rowsByClassification[cls] ?? 0) + 1;

      const conflicts = rowStructuralConflicts(
        {
          id: row.id ?? '',
          validationStatus: row.validationStatus,
          rowClassification: row.rowClassification,
          duplicateState: row.duplicateState,
          duplicateDecision: row.duplicateDecision ?? null,
          rowDecision: row.rowDecision ?? null,
          normalizedValues: row.normalizedValues,
          possibleDuplicateLancamentoId: row.possibleDuplicateLancamentoId ?? null,
        },
        map,
      );
      if (conflicts.length) conflictRows++;
      if (row.validationStatus === 'warning') warningsCount++;

      const ctx: ExecutionRowContext = {
        stagingRowId: row.id ?? '',
        batchId: '',
        tenantId: '',
        sheetName: '',
        sourceRowNumber: 0,
        fingerprint: null,
        classification: row.rowClassification,
        duplicateState: row.duplicateState,
        duplicateDecision: row.duplicateDecision ?? null,
        rowDecision: row.rowDecision ?? null,
        validationStatus: row.validationStatus,
        normalizedValues: (row.normalizedValues ?? {}) as Record<string, unknown>,
        possibleDuplicateLancamentoId: row.possibleDuplicateLancamentoId ?? null,
      };

      const skip = shouldSkipExecution(ctx);
      if (skip.skip) {
        if (skip.reason === 'confirmed_duplicate') skippedDuplicates++;
        else if (skip.reason === 'link_and_skip') linkedExisting++;
        else if (skip.reason === 'row_excluded') excludedRows++;
        else blockedRows++;
        continue;
      }

      const sem = (row.normalizedValues ?? {}) as Record<string, unknown>;
      const rec = parseReconciliation(sem.conciliado);
      if (rec === 'reconciled') reconciled++;
      else notReconciled++;

      if (cls === 'INTERNAL_TRANSFER') {
        transfers++;
        continue;
      }
      if (cls === 'DIRECT_DEBIT') {
        directDebits++;
        settlements++;
        continue;
      }
      if (cls === 'PAYABLE_SETTLEMENT') {
        obligations++;
        settlements++;
        continue;
      }
      blockedRows++;
    }

    const controlTotals = aggregateControlTotals(
      rows.map((r) => ({
        normalizedValues: r.normalizedValues,
        rowDecision: r.rowDecision,
        validationStatus: r.validationStatus,
      })),
    );

    return {
      simulationVersion,
      mappingVersion,
      obligationsWouldCreate: obligations,
      settlementsWouldCreate: settlements,
      directDebitsWouldCreate: directDebits,
      transfersWouldCreate: transfers,
      reconciledWouldCreate: reconciled,
      notReconciledWouldCreate: notReconciled,
      skippedDuplicates,
      linkedExisting,
      excludedRows,
      unresolvedMappings,
      blockedRows,
      conflictRows,
      warningsCount,
      rowsByClassification,
      controlTotals,
    };
  }
}
