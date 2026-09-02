-- Avaliações periódicas estruturadas + liberação fisioterapêutica try-out

ALTER TABLE "PhysioPlayerEvaluation" ADD COLUMN "rating" DOUBLE PRECISION;
ALTER TABLE "PhysioPlayerEvaluation" ADD COLUMN "attachments" JSONB;

ALTER TABLE "PhysioPlayerEvaluationTest" ADD COLUMN "protocol" TEXT;
ALTER TABLE "PhysioPlayerEvaluationTest" ADD COLUMN "payload" JSONB;
ALTER TABLE "PhysioPlayerEvaluationTest" ADD COLUMN "classification" TEXT;

CREATE TABLE "PhysioTryoutClearance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "playerId" TEXT,
    "prospectName" TEXT,
    "targetCategory" TEXT,
    "staffId" TEXT,
    "staffName" TEXT,
    "injuryHistory" TEXT,
    "bilateralTests" JSONB NOT NULL,
    "manualStrengthTest" TEXT,
    "observations" TEXT,
    "outcome" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supervisorNotifiedAt" TIMESTAMP(3),
    "managerNotifiedAt" TIMESTAMP(3),
    "emailNotifyError" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysioTryoutClearance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhysioTryoutClearance_tenantId_prospectId_idx" ON "PhysioTryoutClearance"("tenantId", "prospectId");
CREATE INDEX "PhysioTryoutClearance_playerId_idx" ON "PhysioTryoutClearance"("playerId");
CREATE INDEX "PhysioTryoutClearance_prospectId_evaluatedAt_idx" ON "PhysioTryoutClearance"("prospectId", "evaluatedAt");

ALTER TABLE "PhysioTryoutClearance" ADD CONSTRAINT "PhysioTryoutClearance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioTryoutClearance" ADD CONSTRAINT "PhysioTryoutClearance_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "ScoutingProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioTryoutClearance" ADD CONSTRAINT "PhysioTryoutClearance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
