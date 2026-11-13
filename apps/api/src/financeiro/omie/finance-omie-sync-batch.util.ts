export type FinanceOmieSyncProgressAcc = {
  pagesProcessed: number;
  recordsRead: number;
  recordsNew: number;
  recordsUpdated: number;
  possibleMatches: number;
  conflicts: number;
  errors: number;
  warnings: string[];
  lastPage: number;
  failureStage: string | null;
};

export function createSyncProgressAcc(): FinanceOmieSyncProgressAcc {
  return {
    pagesProcessed: 0,
    recordsRead: 0,
    recordsNew: 0,
    recordsUpdated: 0,
    possibleMatches: 0,
    conflicts: 0,
    errors: 0,
    warnings: [],
    lastPage: 0,
    failureStage: null,
  };
}

/** Remove ruído longo de Prisma/connector; nunca incluir credenciais. */
export function sanitizeOmieSyncErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  const int4 = /Unable to fit integer value '(\d+)' into an INT4/;
  const m = int4.exec(oneLine);
  if (m) {
    return `Falha ao persistir espelho Omie: identificador ${m[1]} excede capacidade INT32 (corrigido em PROMPT 069).`;
  }
  if (oneLine.length > 500) {
    return `${oneLine.slice(0, 497)}…`;
  }
  return oneLine || 'Falha na sincronização Omie';
}

export function fatalSyncBatchWarningsJson(acc: FinanceOmieSyncProgressAcc) {
  return {
    failureStage: acc.failureStage,
    lastPage: acc.lastPage,
    partialWarnings: acc.warnings.slice(0, 50),
  };
}
