-- Campo 3x3 + telestracao em vídeo
ALTER TABLE "AnalysisEvent" ADD COLUMN IF NOT EXISTS "fieldZoneKey" TEXT;
CREATE INDEX IF NOT EXISTS "AnalysisEvent_fieldZoneKey_idx" ON "AnalysisEvent"("fieldZoneKey");

CREATE TABLE IF NOT EXISTS "AnalysisVideoAnnotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "videoSourceId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER,
    "label" TEXT,
    "strokes" JSONB NOT NULL,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisVideoAnnotation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalysisVideoAnnotation_tenantId_analysisSessionId_idx" ON "AnalysisVideoAnnotation"("tenantId", "analysisSessionId");
CREATE INDEX IF NOT EXISTS "AnalysisVideoAnnotation_videoSourceId_startMs_idx" ON "AnalysisVideoAnnotation"("videoSourceId", "startMs");

ALTER TABLE "AnalysisVideoAnnotation" ADD CONSTRAINT "AnalysisVideoAnnotation_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "AnalysisSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisVideoAnnotation" ADD CONSTRAINT "AnalysisVideoAnnotation_videoSourceId_fkey" FOREIGN KEY ("videoSourceId") REFERENCES "AnalysisVideoSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
