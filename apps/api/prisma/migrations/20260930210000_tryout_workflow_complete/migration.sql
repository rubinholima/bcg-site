-- Try Out workflow completo (additive)

ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "arrivalAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutWorkflowActivatedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "tryoutCycleNumber" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "responsibleCoachStaffId" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "responsibleCoachHistory" JSONB;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "athletePhone" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "athleteEmail" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "duplicateCreationConfirmedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "duplicateLinkedProspectId" TEXT;

ALTER TABLE "TryoutCoachEvaluation" ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TryoutCoachEvaluation" ADD COLUMN IF NOT EXISTS "cycleStartedAt" TIMESTAMP(3);
ALTER TABLE "TryoutCoachEvaluation" ADD COLUMN IF NOT EXISTS "cycleEndedAt" TIMESTAMP(3);
ALTER TABLE "TryoutCoachEvaluation" ADD COLUMN IF NOT EXISTS "justification" TEXT;

CREATE INDEX IF NOT EXISTS "TryoutCoachEvaluation_prospectId_cycleNumber_idx"
  ON "TryoutCoachEvaluation"("prospectId", "cycleNumber");

CREATE TABLE IF NOT EXISTS "ScoutingProspectDocument" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "prospectId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "confidentialityCategory" TEXT NOT NULL DEFAULT 'operacional',
  "storageKey" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "uploadedByUserId" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,
  CONSTRAINT "ScoutingProspectDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScoutingProspectDocument_tenantId_prospectId_idx"
  ON "ScoutingProspectDocument"("tenantId", "prospectId");
CREATE INDEX IF NOT EXISTS "ScoutingProspectDocument_prospectId_documentType_idx"
  ON "ScoutingProspectDocument"("prospectId", "documentType");

ALTER TABLE "ScoutingProspectDocument" DROP CONSTRAINT IF EXISTS "ScoutingProspectDocument_tenantId_fkey";
ALTER TABLE "ScoutingProspectDocument" ADD CONSTRAINT "ScoutingProspectDocument_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutingProspectDocument" DROP CONSTRAINT IF EXISTS "ScoutingProspectDocument_prospectId_fkey";
ALTER TABLE "ScoutingProspectDocument" ADD CONSTRAINT "ScoutingProspectDocument_prospectId_fkey"
  FOREIGN KEY ("prospectId") REFERENCES "ScoutingProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TryoutWorkflowEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "prospectId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "previousStage" TEXT,
  "newStage" TEXT,
  "actorUserId" TEXT,
  "staffId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TryoutWorkflowEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TryoutWorkflowEvent_tenantId_prospectId_createdAt_idx"
  ON "TryoutWorkflowEvent"("tenantId", "prospectId", "createdAt");
CREATE INDEX IF NOT EXISTS "TryoutWorkflowEvent_prospectId_createdAt_idx"
  ON "TryoutWorkflowEvent"("prospectId", "createdAt");

ALTER TABLE "TryoutWorkflowEvent" DROP CONSTRAINT IF EXISTS "TryoutWorkflowEvent_tenantId_fkey";
ALTER TABLE "TryoutWorkflowEvent" ADD CONSTRAINT "TryoutWorkflowEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TryoutWorkflowEvent" DROP CONSTRAINT IF EXISTS "TryoutWorkflowEvent_prospectId_fkey";
ALTER TABLE "TryoutWorkflowEvent" ADD CONSTRAINT "TryoutWorkflowEvent_prospectId_fkey"
  FOREIGN KEY ("prospectId") REFERENCES "ScoutingProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
