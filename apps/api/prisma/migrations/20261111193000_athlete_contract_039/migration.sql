-- PROMPT 039 — gestão contratual atleta (complemento user-facing)

ALTER TABLE "AthleteContractAttachment" ADD COLUMN IF NOT EXISTS "federativeProcessId" TEXT;
ALTER TABLE "AthleteContractAttachment" ADD COLUMN IF NOT EXISTS "professionalizationCaseId" TEXT;
ALTER TABLE "AthleteContractAttachment" ADD COLUMN IF NOT EXISTS "uploadedByEmail" TEXT;

ALTER TABLE "AthleteContractFinanceLink" ALTER COLUMN "contractId" DROP NOT NULL;
ALTER TABLE "AthleteContractFinanceLink" ADD COLUMN IF NOT EXISTS "playerId" TEXT;
ALTER TABLE "AthleteContractFinanceLink" ADD COLUMN IF NOT EXISTS "federativeProcessId" TEXT;
ALTER TABLE "AthleteContractFinanceLink" ADD COLUMN IF NOT EXISTS "financeiroLancamentoId" TEXT;
ALTER TABLE "AthleteContractFinanceLink" ADD COLUMN IF NOT EXISTS "omieReference" TEXT;
ALTER TABLE "AthleteContractFinanceLink" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'BRL';
ALTER TABLE "AthleteContractFinanceLink" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AthleteContractFinanceLink" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "AthleteContractAttachment_federativeProcessId_idx" ON "AthleteContractAttachment"("federativeProcessId");
CREATE INDEX IF NOT EXISTS "AthleteContractFinanceLink_playerId_idx" ON "AthleteContractFinanceLink"("playerId");
CREATE INDEX IF NOT EXISTS "AthleteContractFinanceLink_federativeProcessId_idx" ON "AthleteContractFinanceLink"("federativeProcessId");

CREATE TABLE IF NOT EXISTS "AthleteContractNotificationDedup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "targetUserId" TEXT,
    "announcementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AthleteContractNotificationDedup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AthleteContractNotificationDedup_dedupKey_key" ON "AthleteContractNotificationDedup"("dedupKey");
CREATE INDEX IF NOT EXISTS "AthleteContractNotificationDedup_tenantId_kind_idx" ON "AthleteContractNotificationDedup"("tenantId", "kind");

ALTER TABLE "AthleteContractAttachment" ADD CONSTRAINT "AthleteContractAttachment_federativeProcessId_fkey" FOREIGN KEY ("federativeProcessId") REFERENCES "AthleteFederativeProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteContractAttachment" ADD CONSTRAINT "AthleteContractAttachment_professionalizationCaseId_fkey" FOREIGN KEY ("professionalizationCaseId") REFERENCES "AthleteProfessionalizationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AthleteContractFinanceLink" ADD CONSTRAINT "AthleteContractFinanceLink_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteContractFinanceLink" ADD CONSTRAINT "AthleteContractFinanceLink_federativeProcessId_fkey" FOREIGN KEY ("federativeProcessId") REFERENCES "AthleteFederativeProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteContractNotificationDedup" ADD CONSTRAINT "AthleteContractNotificationDedup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
