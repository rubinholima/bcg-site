-- Live Tag 2.0 — aditivo (PROMPT 048)

ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "tagGroup" TEXT;
ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "qualifiers" JSONB;
ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "requiresRelatedPlayer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "requiresFieldLocation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "stateBehavior" TEXT;
ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

ALTER TABLE "AnalysisVideoAnnotation" ADD COLUMN IF NOT EXISTS "analysisEventId" TEXT;
ALTER TABLE "AnalysisVideoAnnotation" ADD COLUMN IF NOT EXISTS "analysisClipId" TEXT;
ALTER TABLE "AnalysisVideoAnnotation" ADD COLUMN IF NOT EXISTS "vectorJson" JSONB;
ALTER TABLE "AnalysisVideoAnnotation" ADD COLUMN IF NOT EXISTS "schemaVersion" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "AnalysisVideoAnnotation_analysisEventId_idx" ON "AnalysisVideoAnnotation"("analysisEventId");
CREATE INDEX IF NOT EXISTS "AnalysisVideoAnnotation_analysisClipId_idx" ON "AnalysisVideoAnnotation"("analysisClipId");
