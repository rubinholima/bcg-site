-- CUP360 Finance historical import framework (staging only)

CREATE TABLE "FinanceImportBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileKey" TEXT,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "conflictRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastSimulationAt" TIMESTAMP(3),
    "simulationSummary" JSONB,
    "failureReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceImportStagingRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "rawValues" JSONB NOT NULL,
    "normalizedValues" JSONB,
    "proposedMappings" JSONB,
    "rowClassification" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'valid',
    "warnings" JSONB,
    "errors" JSONB,
    "duplicateState" TEXT NOT NULL DEFAULT 'none',
    "possibleDuplicateLancamentoId" TEXT,
    "importedFinanceiroLancamentoId" TEXT,
    "sourceRowFingerprint" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceImportStagingRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceImportBatchMapping" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mappingKind" TEXT NOT NULL,
    "sourceValue" TEXT NOT NULL,
    "sourceValueNormalized" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'review_required',
    "targetType" TEXT,
    "targetId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceImportBatchMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceImportBatch_tenantId_fileHash_key" ON "FinanceImportBatch"("tenantId", "fileHash");
CREATE INDEX "FinanceImportBatch_tenantId_status_idx" ON "FinanceImportBatch"("tenantId", "status");
CREATE INDEX "FinanceImportBatch_tenantId_uploadedAt_idx" ON "FinanceImportBatch"("tenantId", "uploadedAt");

CREATE UNIQUE INDEX "FinanceImportStagingRow_batchId_sheetName_sourceRowNumber_key" ON "FinanceImportStagingRow"("batchId", "sheetName", "sourceRowNumber");
CREATE INDEX "FinanceImportStagingRow_tenantId_batchId_idx" ON "FinanceImportStagingRow"("tenantId", "batchId");
CREATE INDEX "FinanceImportStagingRow_tenantId_validationStatus_idx" ON "FinanceImportStagingRow"("tenantId", "validationStatus");
CREATE INDEX "FinanceImportStagingRow_tenantId_rowClassification_idx" ON "FinanceImportStagingRow"("tenantId", "rowClassification");
CREATE INDEX "FinanceImportStagingRow_sourceRowFingerprint_idx" ON "FinanceImportStagingRow"("sourceRowFingerprint");

CREATE UNIQUE INDEX "FinanceImportBatchMapping_batchId_mappingKind_sourceValueNormalized_key" ON "FinanceImportBatchMapping"("batchId", "mappingKind", "sourceValueNormalized");
CREATE INDEX "FinanceImportBatchMapping_tenantId_batchId_idx" ON "FinanceImportBatchMapping"("tenantId", "batchId");

ALTER TABLE "FinanceImportBatch" ADD CONSTRAINT "FinanceImportBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceImportStagingRow" ADD CONSTRAINT "FinanceImportStagingRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "FinanceImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceImportStagingRow" ADD CONSTRAINT "FinanceImportStagingRow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceImportBatchMapping" ADD CONSTRAINT "FinanceImportBatchMapping_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "FinanceImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceImportBatchMapping" ADD CONSTRAINT "FinanceImportBatchMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
