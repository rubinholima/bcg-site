-- CUP360 Finance Import — execução controlada, revisão e versionamento de simulação (Prompt 063)

ALTER TABLE "FinanceImportBatch" ADD COLUMN "mappingVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FinanceImportBatch" ADD COLUMN "simulationVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FinanceImportBatch" ADD COLUMN "simulationStale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FinanceImportBatch" ADD COLUMN "executionLockAt" TIMESTAMP(3);
ALTER TABLE "FinanceImportBatch" ADD COLUMN "executionLockByUserId" TEXT;
ALTER TABLE "FinanceImportBatch" ADD COLUMN "executionApprovedAt" TIMESTAMP(3);
ALTER TABLE "FinanceImportBatch" ADD COLUMN "executionApprovedByUserId" TEXT;
ALTER TABLE "FinanceImportBatch" ADD COLUMN "executionApprovedByName" TEXT;
ALTER TABLE "FinanceImportBatch" ADD COLUMN "executionResult" JSONB;
ALTER TABLE "FinanceImportBatch" ADD COLUMN "controlTotals" JSONB;

ALTER TABLE "FinanceImportStagingRow" ADD COLUMN "rowDecision" TEXT;
ALTER TABLE "FinanceImportStagingRow" ADD COLUMN "rowDecisionReason" TEXT;
ALTER TABLE "FinanceImportStagingRow" ADD COLUMN "duplicateDecision" TEXT;
ALTER TABLE "FinanceImportStagingRow" ADD COLUMN "duplicateDecisionReason" TEXT;
ALTER TABLE "FinanceImportStagingRow" ADD COLUMN "duplicateFlagReason" TEXT;
ALTER TABLE "FinanceImportStagingRow" ADD COLUMN "executionStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "FinanceImportStagingRow" ADD COLUMN "executionError" TEXT;

ALTER TABLE "FinanceImportBatchMapping" ADD COLUMN "metadata" JSONB;

CREATE INDEX "FinanceImportStagingRow_tenantId_batchId_executionStatus_idx"
  ON "FinanceImportStagingRow"("tenantId", "batchId", "executionStatus");
