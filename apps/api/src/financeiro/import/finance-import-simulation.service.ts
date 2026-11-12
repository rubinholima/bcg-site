import { Injectable } from '@nestjs/common';
import type { FinanceImportSimulationSummary } from './finance-import.types';

type StagingLike = {
  rowClassification: string | null;
  validationStatus: string;
  duplicateState: string;
  proposedMappings?: Record<string, unknown> | null;
};

@Injectable()
export class FinanceImportSimulationService {
  simulate(rows: StagingLike[], unresolvedMappings: number): FinanceImportSimulationSummary {
    const rowsByClassification: Record<string, number> = {};
    let skippedDuplicates = 0;
    let blockedRows = 0;
    let obligations = 0;
    let settlements = 0;
    let transfers = 0;

    for (const row of rows) {
      const cls = row.rowClassification ?? 'OTHER_REVIEW';
      rowsByClassification[cls] = (rowsByClassification[cls] ?? 0) + 1;

      if (row.validationStatus === 'invalid') {
        blockedRows++;
        continue;
      }

      if (row.duplicateState === 'exact_in_batch' || row.duplicateState === 'exact_file_reprocess') {
        skippedDuplicates++;
        continue;
      }

      if (cls === 'INTERNAL_TRANSFER') {
        transfers++;
        continue;
      }

      if (cls === 'DIRECT_DEBIT') {
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

    return {
      obligationsWouldCreate: obligations,
      settlementsWouldCreate: settlements,
      transfersWouldCreate: transfers,
      skippedDuplicates,
      unresolvedMappings,
      blockedRows,
      rowsByClassification,
    };
  }
}
