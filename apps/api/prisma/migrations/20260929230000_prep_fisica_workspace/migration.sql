-- Preparação física: domínio de treino, objetivos, PSE por token, vínculo carga

ALTER TABLE "CoachTrainingSession" ADD COLUMN IF NOT EXISTS "sessionDomain" TEXT NOT NULL DEFAULT 'comissao_tecnica';
ALTER TABLE "CoachTrainingSession" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "CoachTrainingSession" ADD COLUMN IF NOT EXISTS "blockGroupId" TEXT;
ALTER TABLE "CoachTrainingSession" ADD COLUMN IF NOT EXISTS "blockSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CoachTrainingSession" ADD COLUMN IF NOT EXISTS "physiologyLoadSessionId" TEXT;

ALTER TABLE "CoachTrainingPlanTemplate" ADD COLUMN IF NOT EXISTS "planDomain" TEXT;

ALTER TABLE "CoachTrainingActivity" ADD COLUMN IF NOT EXISTS "objectiveId" TEXT;
ALTER TABLE "CoachTrainingActivity" ADD COLUMN IF NOT EXISTS "objectiveText" TEXT;

CREATE TABLE IF NOT EXISTS "TrainingObjective" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingObjective_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrainingObjective_tenantId_active_idx" ON "TrainingObjective"("tenantId", "active");

CREATE TABLE IF NOT EXISTS "PhysiologySessionRpeToken" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "coachTrainingSessionId" TEXT NOT NULL,
  "physiologyLoadSessionId" TEXT,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhysiologySessionRpeToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PhysiologySessionRpeToken_tokenHash_key" ON "PhysiologySessionRpeToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PhysiologySessionRpeToken_coachTrainingSessionId_playerId_idx" ON "PhysiologySessionRpeToken"("coachTrainingSessionId", "playerId");
CREATE INDEX IF NOT EXISTS "PhysiologySessionRpeToken_tenantId_idx" ON "PhysiologySessionRpeToken"("tenantId");

CREATE TABLE IF NOT EXISTS "PhysiologySessionRpeSubmission" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "coachTrainingSessionId" TEXT,
  "physiologyLoadSessionId" TEXT NOT NULL,
  "physiologyLoadEntryId" TEXT,
  "rpe" INTEGER NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'athlete',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importBatchId" TEXT,
  CONSTRAINT "PhysiologySessionRpeSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PhysiologySessionRpeSubmission_physiologyLoadSessionId_playerId_key"
  ON "PhysiologySessionRpeSubmission"("physiologyLoadSessionId", "playerId");
CREATE INDEX IF NOT EXISTS "PhysiologySessionRpeSubmission_coachTrainingSessionId_idx" ON "PhysiologySessionRpeSubmission"("coachTrainingSessionId");
CREATE INDEX IF NOT EXISTS "PhysiologySessionRpeSubmission_tenantId_submittedAt_idx" ON "PhysiologySessionRpeSubmission"("tenantId", "submittedAt");

CREATE INDEX IF NOT EXISTS "CoachTrainingSession_tenantId_sessionDomain_sessionDate_idx"
  ON "CoachTrainingSession"("tenantId", "sessionDomain", "sessionDate");
CREATE INDEX IF NOT EXISTS "CoachTrainingSession_physiologyLoadSessionId_idx" ON "CoachTrainingSession"("physiologyLoadSessionId");
CREATE INDEX IF NOT EXISTS "CoachTrainingSession_blockGroupId_idx" ON "CoachTrainingSession"("blockGroupId");
CREATE INDEX IF NOT EXISTS "CoachTrainingPlanTemplate_tenantId_planDomain_idx" ON "CoachTrainingPlanTemplate"("tenantId", "planDomain");
CREATE INDEX IF NOT EXISTS "CoachTrainingActivity_objectiveId_idx" ON "CoachTrainingActivity"("objectiveId");

ALTER TABLE "TrainingObjective" ADD CONSTRAINT "TrainingObjective_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachTrainingActivity" ADD CONSTRAINT "CoachTrainingActivity_objectiveId_fkey"
  FOREIGN KEY ("objectiveId") REFERENCES "TrainingObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CoachTrainingSession" ADD CONSTRAINT "CoachTrainingSession_physiologyLoadSessionId_fkey"
  FOREIGN KEY ("physiologyLoadSessionId") REFERENCES "PhysiologyLoadSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PhysiologySessionRpeToken" ADD CONSTRAINT "PhysiologySessionRpeToken_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysiologySessionRpeToken" ADD CONSTRAINT "PhysiologySessionRpeToken_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysiologySessionRpeToken" ADD CONSTRAINT "PhysiologySessionRpeToken_coachTrainingSessionId_fkey"
  FOREIGN KEY ("coachTrainingSessionId") REFERENCES "CoachTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysiologySessionRpeToken" ADD CONSTRAINT "PhysiologySessionRpeToken_physiologyLoadSessionId_fkey"
  FOREIGN KEY ("physiologyLoadSessionId") REFERENCES "PhysiologyLoadSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PhysiologySessionRpeSubmission" ADD CONSTRAINT "PhysiologySessionRpeSubmission_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysiologySessionRpeSubmission" ADD CONSTRAINT "PhysiologySessionRpeSubmission_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysiologySessionRpeSubmission" ADD CONSTRAINT "PhysiologySessionRpeSubmission_coachTrainingSessionId_fkey"
  FOREIGN KEY ("coachTrainingSessionId") REFERENCES "CoachTrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PhysiologySessionRpeSubmission" ADD CONSTRAINT "PhysiologySessionRpeSubmission_physiologyLoadSessionId_fkey"
  FOREIGN KEY ("physiologyLoadSessionId") REFERENCES "PhysiologyLoadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "ModuleRole" mr SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id" AND m."slug" = 'futebol_preparacao_fisica'
  AND mr."role" IN ('comissao', 'gerente', 'company_admin');
