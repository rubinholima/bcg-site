-- Try Out workflow (ScoutingProspect canônico + avaliação treinador)

ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutWorkflowStage" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "arrivalReferralSource" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "supervisionDocsValidatedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "supervisionDocsValidatedBy" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "supervisionDocsNotes" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutPeriodStartedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutPeriodEndsAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRenewalCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRenewalHistory" JSONB;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutEarlyApprovedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRegDocumentation" TEXT DEFAULT 'pendente';
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRegCbf" TEXT DEFAULT 'pendente';
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRegFederation" TEXT DEFAULT 'na';
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRegBid" TEXT DEFAULT 'pendente';
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRejectedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRejectedBy" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutRejectedReason" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutCompletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ScoutingProspect_tenantId_tryoutWorkflowStage_idx"
  ON "ScoutingProspect"("tenantId", "tryoutWorkflowStage");

CREATE TABLE IF NOT EXISTS "TryoutCoachEvaluation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "prospectId" TEXT NOT NULL,
  "staffId" TEXT,
  "staffName" TEXT,
  "technicalRating" DOUBLE PRECISION NOT NULL,
  "physicalRating" DOUBLE PRECISION NOT NULL,
  "tacticalRating" DOUBLE PRECISION NOT NULL,
  "cognitiveRating" DOUBLE PRECISION NOT NULL,
  "descriptiveObservation" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TryoutCoachEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TryoutCoachEvaluation_tenantId_prospectId_idx"
  ON "TryoutCoachEvaluation"("tenantId", "prospectId");
CREATE INDEX IF NOT EXISTS "TryoutCoachEvaluation_prospectId_evaluatedAt_idx"
  ON "TryoutCoachEvaluation"("prospectId", "evaluatedAt");

ALTER TABLE "TryoutCoachEvaluation" DROP CONSTRAINT IF EXISTS "TryoutCoachEvaluation_tenantId_fkey";
ALTER TABLE "TryoutCoachEvaluation" ADD CONSTRAINT "TryoutCoachEvaluation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TryoutCoachEvaluation" DROP CONSTRAINT IF EXISTS "TryoutCoachEvaluation_prospectId_fkey";
ALTER TABLE "TryoutCoachEvaluation" ADD CONSTRAINT "TryoutCoachEvaluation_prospectId_fkey"
  FOREIGN KEY ("prospectId") REFERENCES "ScoutingProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
