-- Treinador de goleiros — workspace CUP360

ALTER TABLE "CoachTrainingSession" ADD COLUMN IF NOT EXISTS "characteristics" TEXT;
ALTER TABLE "CoachTrainingSession" ADD COLUMN IF NOT EXISTS "physicalQualities" TEXT;

ALTER TABLE "CoachTrainingPlayerEntry" ADD COLUMN IF NOT EXISTS "playerCategoryAtEntry" TEXT;
ALTER TABLE "CoachTrainingPlayerEntry" ADD COLUMN IF NOT EXISTS "crossCategory" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "GoalkeeperMatchAnalysis" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "category" TEXT,
  "staffId" TEXT,
  "authorUserId" TEXT,
  "coachMatchReportId" TEXT,
  "travelLogisticsId" TEXT,
  "fmfMatchReportId" TEXT,
  "matchDate" TIMESTAMP(3),
  "opponentName" TEXT,
  "observations" TEXT,
  "highlightsVideoUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'rascunho',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoalkeeperMatchAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GoalkeeperMatchAnalysisPlayer" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "playerCategoryAtEntry" TEXT,
  CONSTRAINT "GoalkeeperMatchAnalysisPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GoalkeeperMatchAnalysisAttachment" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "label" TEXT,
  "fileUrl" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'keeper_scout',
  CONSTRAINT "GoalkeeperMatchAnalysisAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GoalkeeperReportDistribution" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentByUserId" TEXT,
  "recipients" JSONB NOT NULL,
  "subject" TEXT,
  CONSTRAINT "GoalkeeperReportDistribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoalkeeperMatchAnalysisPlayer_analysisId_playerId_key"
  ON "GoalkeeperMatchAnalysisPlayer"("analysisId", "playerId");
CREATE INDEX IF NOT EXISTS "GoalkeeperMatchAnalysis_tenantId_category_idx" ON "GoalkeeperMatchAnalysis"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "GoalkeeperMatchAnalysis_tenantId_matchDate_idx" ON "GoalkeeperMatchAnalysis"("tenantId", "matchDate");
CREATE INDEX IF NOT EXISTS "GoalkeeperMatchAnalysisPlayer_playerId_idx" ON "GoalkeeperMatchAnalysisPlayer"("playerId");
CREATE INDEX IF NOT EXISTS "GoalkeeperReportDistribution_tenantId_kind_referenceId_idx"
  ON "GoalkeeperReportDistribution"("tenantId", "kind", "referenceId");

ALTER TABLE "GoalkeeperMatchAnalysis" ADD CONSTRAINT "GoalkeeperMatchAnalysis_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalkeeperMatchAnalysis" ADD CONSTRAINT "GoalkeeperMatchAnalysis_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "TechnicalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GoalkeeperMatchAnalysis" ADD CONSTRAINT "GoalkeeperMatchAnalysis_coachMatchReportId_fkey"
  FOREIGN KEY ("coachMatchReportId") REFERENCES "CoachMatchReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GoalkeeperMatchAnalysis" ADD CONSTRAINT "GoalkeeperMatchAnalysis_travelLogisticsId_fkey"
  FOREIGN KEY ("travelLogisticsId") REFERENCES "TravelLogistics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GoalkeeperMatchAnalysis" ADD CONSTRAINT "GoalkeeperMatchAnalysis_fmfMatchReportId_fkey"
  FOREIGN KEY ("fmfMatchReportId") REFERENCES "FmfMatchReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GoalkeeperMatchAnalysisPlayer" ADD CONSTRAINT "GoalkeeperMatchAnalysisPlayer_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "GoalkeeperMatchAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalkeeperMatchAnalysisPlayer" ADD CONSTRAINT "GoalkeeperMatchAnalysisPlayer_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalkeeperMatchAnalysisAttachment" ADD CONSTRAINT "GoalkeeperMatchAnalysisAttachment_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "GoalkeeperMatchAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalkeeperReportDistribution" ADD CONSTRAINT "GoalkeeperReportDistribution_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-futebol-treinador-goleiros', 'futebol_treinador_goleiros', 'Treinador de goleiros', 39, 'futebol_tecnico'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_treinador_goleiros');

UPDATE "ModuleRole" mr SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id" AND m."slug" = 'futebol_treinador_goleiros'
  AND mr."role" IN ('comissao', 'treinador', 'gerente', 'company_admin');
