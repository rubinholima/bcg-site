-- CUP360 Finance Omie read-sync & reconciliation mirror (Prompt 064)

CREATE TABLE "FinanceOmieTenantSyncState" (
    "tenantId" TEXT NOT NULL,
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastSyncAttemptAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "lastSyncBatchId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceOmieTenantSyncState_pkey" PRIMARY KEY ("tenantId")
);

CREATE TABLE "FinanceOmieSyncBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "syncType" TEXT NOT NULL,
    "dateFrom" DATE,
    "dateTo" DATE,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "startedByUserId" TEXT,
    "startedByName" TEXT,
    "pagesProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsNew" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsLinked" INTEGER NOT NULL DEFAULT 0,
    "possibleMatches" INTEGER NOT NULL DEFAULT 0,
    "conflicts" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceOmieSyncBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceOmieMirrorRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "syncBatchId" TEXT,
    "tituloTipo" TEXT NOT NULL,
    "omieExternalId" TEXT NOT NULL,
    "omieLancamentoId" INTEGER,
    "omieIntegracaoCode" TEXT,
    "normalizedData" JSONB NOT NULL,
    "snapshotHash" TEXT,
    "snapshotSanitized" JSONB,
    "omieReconciliationState" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "matchLevel" TEXT NOT NULL DEFAULT 'NO_MATCH',
    "matchReason" TEXT,
    "financeiroLancamentoId" TEXT,
    "supplierOmieId" INTEGER,
    "customerOmieId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeDetectedAt" TIMESTAMP(3),
    "changeSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceOmieMirrorRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceOmieReconciliationDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mirrorRecordId" TEXT NOT NULL,
    "financeiroLancamentoId" TEXT,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceOmieReconciliationDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceOmieEntityMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mappingKind" TEXT NOT NULL,
    "omieKey" TEXT NOT NULL,
    "omieLabel" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceOmieEntityMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceOmieMirrorRecord_tenantId_omieExternalId_key" ON "FinanceOmieMirrorRecord"("tenantId", "omieExternalId");
CREATE INDEX "FinanceOmieMirrorRecord_tenantId_tituloTipo_omieReconciliationState_idx" ON "FinanceOmieMirrorRecord"("tenantId", "tituloTipo", "omieReconciliationState");
CREATE INDEX "FinanceOmieMirrorRecord_tenantId_financeiroLancamentoId_idx" ON "FinanceOmieMirrorRecord"("tenantId", "financeiroLancamentoId");
CREATE INDEX "FinanceOmieMirrorRecord_tenantId_matchLevel_idx" ON "FinanceOmieMirrorRecord"("tenantId", "matchLevel");

CREATE INDEX "FinanceOmieSyncBatch_tenantId_startedAt_idx" ON "FinanceOmieSyncBatch"("tenantId", "startedAt");
CREATE INDEX "FinanceOmieSyncBatch_tenantId_status_idx" ON "FinanceOmieSyncBatch"("tenantId", "status");

CREATE INDEX "FinanceOmieReconciliationDecision_tenantId_mirrorRecordId_idx" ON "FinanceOmieReconciliationDecision"("tenantId", "mirrorRecordId");
CREATE INDEX "FinanceOmieReconciliationDecision_tenantId_decision_idx" ON "FinanceOmieReconciliationDecision"("tenantId", "decision");

CREATE UNIQUE INDEX "FinanceOmieEntityMapping_tenantId_mappingKind_omieKey_key" ON "FinanceOmieEntityMapping"("tenantId", "mappingKind", "omieKey");
CREATE INDEX "FinanceOmieEntityMapping_tenantId_mappingKind_idx" ON "FinanceOmieEntityMapping"("tenantId", "mappingKind");

ALTER TABLE "FinanceOmieTenantSyncState" ADD CONSTRAINT "FinanceOmieTenantSyncState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceOmieSyncBatch" ADD CONSTRAINT "FinanceOmieSyncBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceOmieMirrorRecord" ADD CONSTRAINT "FinanceOmieMirrorRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceOmieMirrorRecord" ADD CONSTRAINT "FinanceOmieMirrorRecord_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES "FinanceOmieSyncBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceOmieReconciliationDecision" ADD CONSTRAINT "FinanceOmieReconciliationDecision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceOmieEntityMapping" ADD CONSTRAINT "FinanceOmieEntityMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
