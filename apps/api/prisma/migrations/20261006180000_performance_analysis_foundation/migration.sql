-- Análise de desempenho — fundação (sessões, vídeos, tags, eventos, clips)

CREATE TABLE "AnalysisSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "category" TEXT,
    "season" INTEGER,
    "authorUserId" TEXT,
    "fmfMatchReportId" TEXT,
    "travelLogisticsId" TEXT,
    "trainingSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisVideoSource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cameraLabel" TEXT,
    "storageKey" TEXT,
    "externalUrl" TEXT,
    "durationMs" INTEGER,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisVideoSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisTagDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "outcomes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisTagDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "videoSourceId" TEXT,
    "tagDefinitionId" TEXT NOT NULL,
    "playerId" TEXT,
    "relatedPlayerId" TEXT,
    "teamSide" TEXT,
    "outcome" TEXT,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER,
    "matchPeriod" TEXT,
    "matchClockSeconds" INTEGER,
    "fieldX" DOUBLE PRECISION,
    "fieldY" DOUBLE PRECISION,
    "notes" TEXT,
    "authorUserId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "reviewStatus" TEXT NOT NULL DEFAULT 'confirmed',
    "clientEventKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisClip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "videoSourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "notes" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisClip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisClipEvent" (
    "clipId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "AnalysisClipEvent_pkey" PRIMARY KEY ("clipId","eventId")
);

CREATE TABLE "AnalysisClipPlayer" (
    "clipId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "AnalysisClipPlayer_pkey" PRIMARY KEY ("clipId","playerId")
);

CREATE UNIQUE INDEX "AnalysisTagDefinition_tenantId_key_key" ON "AnalysisTagDefinition"("tenantId", "key");
CREATE INDEX "AnalysisTagDefinition_tenantId_active_idx" ON "AnalysisTagDefinition"("tenantId", "active");
CREATE INDEX "AnalysisSession_tenantId_kind_idx" ON "AnalysisSession"("tenantId", "kind");
CREATE INDEX "AnalysisSession_tenantId_status_idx" ON "AnalysisSession"("tenantId", "status");
CREATE INDEX "AnalysisSession_tenantId_category_idx" ON "AnalysisSession"("tenantId", "category");
CREATE INDEX "AnalysisSession_fmfMatchReportId_idx" ON "AnalysisSession"("fmfMatchReportId");
CREATE INDEX "AnalysisSession_travelLogisticsId_idx" ON "AnalysisSession"("travelLogisticsId");
CREATE INDEX "AnalysisSession_trainingSessionId_idx" ON "AnalysisSession"("trainingSessionId");
CREATE INDEX "AnalysisVideoSource_tenantId_analysisSessionId_idx" ON "AnalysisVideoSource"("tenantId", "analysisSessionId");
CREATE UNIQUE INDEX "AnalysisEvent_analysisSessionId_clientEventKey_key" ON "AnalysisEvent"("analysisSessionId", "clientEventKey");
CREATE INDEX "AnalysisEvent_tenantId_analysisSessionId_idx" ON "AnalysisEvent"("tenantId", "analysisSessionId");
CREATE INDEX "AnalysisEvent_tagDefinitionId_idx" ON "AnalysisEvent"("tagDefinitionId");
CREATE INDEX "AnalysisEvent_playerId_idx" ON "AnalysisEvent"("playerId");
CREATE INDEX "AnalysisClip_tenantId_analysisSessionId_idx" ON "AnalysisClip"("tenantId", "analysisSessionId");

ALTER TABLE "AnalysisSession" ADD CONSTRAINT "AnalysisSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisSession" ADD CONSTRAINT "AnalysisSession_fmfMatchReportId_fkey" FOREIGN KEY ("fmfMatchReportId") REFERENCES "FmfMatchReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisSession" ADD CONSTRAINT "AnalysisSession_travelLogisticsId_fkey" FOREIGN KEY ("travelLogisticsId") REFERENCES "TravelLogistics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisSession" ADD CONSTRAINT "AnalysisSession_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "CoachTrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnalysisVideoSource" ADD CONSTRAINT "AnalysisVideoSource_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "AnalysisSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalysisTagDefinition" ADD CONSTRAINT "AnalysisTagDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalysisEvent" ADD CONSTRAINT "AnalysisEvent_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "AnalysisSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvent" ADD CONSTRAINT "AnalysisEvent_videoSourceId_fkey" FOREIGN KEY ("videoSourceId") REFERENCES "AnalysisVideoSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvent" ADD CONSTRAINT "AnalysisEvent_tagDefinitionId_fkey" FOREIGN KEY ("tagDefinitionId") REFERENCES "AnalysisTagDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvent" ADD CONSTRAINT "AnalysisEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvent" ADD CONSTRAINT "AnalysisEvent_relatedPlayerId_fkey" FOREIGN KEY ("relatedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnalysisClip" ADD CONSTRAINT "AnalysisClip_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "AnalysisSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisClip" ADD CONSTRAINT "AnalysisClip_videoSourceId_fkey" FOREIGN KEY ("videoSourceId") REFERENCES "AnalysisVideoSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalysisClipEvent" ADD CONSTRAINT "AnalysisClipEvent_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "AnalysisClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisClipEvent" ADD CONSTRAINT "AnalysisClipEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AnalysisEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalysisClipPlayer" ADD CONSTRAINT "AnalysisClipPlayer_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "AnalysisClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisClipPlayer" ADD CONSTRAINT "AnalysisClipPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
