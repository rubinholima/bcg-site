-- Adversário, pré-jogo e fluxo de treino (aplicar somente em release autorizado)

ALTER TABLE "AnalysisSession" ADD COLUMN IF NOT EXISTS "opponentProfileId" TEXT;
ALTER TABLE "AnalysisSession" ADD COLUMN IF NOT EXISTS "preMatchVersionId" TEXT;

ALTER TABLE "AnalysisEvent" ADD COLUMN IF NOT EXISTS "observedMatchId" TEXT;
ALTER TABLE "AnalysisEvent" ADD COLUMN IF NOT EXISTS "opponentPlayerId" TEXT;

CREATE TABLE IF NOT EXISTS "AnalysisOpponentProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opponentName" TEXT NOT NULL,
    "visitingTeamId" TEXT,
    "category" TEXT,
    "season" INTEGER,
    "notes" TEXT,
    "preferredFormations" JSONB,
    "alternativeFormations" JSONB,
    "buildUpPatterns" JSONB,
    "attackingPatterns" JSONB,
    "defensiveOrganization" JSONB,
    "pressingBehavior" JSONB,
    "transitions" JSONB,
    "setPiecesSummary" JSONB,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "keyObservations" TEXT,
    "extraProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisOpponentProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisOpponentObservedMatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opponentProfileId" TEXT NOT NULL,
    "facedOpponentName" TEXT,
    "matchDate" TEXT,
    "competition" TEXT,
    "homeAway" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "sourceReference" TEXT,
    "notes" TEXT,
    "fmfMatchReportId" TEXT,
    "travelLogisticsId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisOpponentObservedMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisOpponentObservedMatchVideo" (
    "observedMatchId" TEXT NOT NULL,
    "videoSourceId" TEXT NOT NULL,
    CONSTRAINT "AnalysisOpponentObservedMatchVideo_pkey" PRIMARY KEY ("observedMatchId","videoSourceId")
);

CREATE TABLE IF NOT EXISTS "AnalysisOpponentPlayer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opponentProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shirtNumber" INTEGER,
    "position" TEXT,
    "likelyStarter" BOOLEAN NOT NULL DEFAULT false,
    "tacticalRole" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "observations" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisOpponentPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisOpponentLineup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opponentProfileId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Provável',
    "formation" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisOpponentLineup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisOpponentLineupEntry" (
    "id" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "opponentPlayerId" TEXT,
    "name" TEXT NOT NULL,
    "shirtNumber" INTEGER,
    "position" TEXT,
    "fieldX" DOUBLE PRECISION,
    "fieldY" DOUBLE PRECISION,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "confidence" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AnalysisOpponentLineupEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisOpponentSetPiece" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opponentProfileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "fieldX" DOUBLE PRECISION,
    "fieldY" DOUBLE PRECISION,
    "eventId" TEXT,
    "clipId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisOpponentSetPiece_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisClipCollection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisSessionId" TEXT,
    "opponentProfileId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Clips curados',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisClipCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisClipCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AnalysisClipCollectionItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisPreMatchPreparation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "opponentName" TEXT,
    "category" TEXT,
    "matchDate" TEXT,
    "travelLogisticsId" TEXT,
    "fmfMatchReportId" TEXT,
    "opponentProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisPreMatchPreparation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalysisPreMatchVersion" (
    "id" TEXT NOT NULL,
    "preparationId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" TEXT NOT NULL DEFAULT 'DRAFT',
    "hiddenSections" JSONB,
    "sections" JSONB,
    "tacticalBoard" JSONB,
    "selectedClipIds" JSONB,
    "analystNotes" TEXT,
    "staffNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "presentedAt" TIMESTAMP(3),
    "presentedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisPreMatchVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisClipCollectionItem_collectionId_clipId_key" ON "AnalysisClipCollectionItem"("collectionId", "clipId");
CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisPreMatchVersion_preparationId_versionNumber_key" ON "AnalysisPreMatchVersion"("preparationId", "versionNumber");

CREATE INDEX IF NOT EXISTS "AnalysisOpponentProfile_tenantId_opponentName_idx" ON "AnalysisOpponentProfile"("tenantId", "opponentName");
CREATE INDEX IF NOT EXISTS "AnalysisSession_opponentProfileId_idx" ON "AnalysisSession"("opponentProfileId");
CREATE INDEX IF NOT EXISTS "AnalysisSession_preMatchVersionId_idx" ON "AnalysisSession"("preMatchVersionId");

ALTER TABLE "AnalysisSession" ADD CONSTRAINT "AnalysisSession_opponentProfileId_fkey" FOREIGN KEY ("opponentProfileId") REFERENCES "AnalysisOpponentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisSession" ADD CONSTRAINT "AnalysisSession_preMatchVersionId_fkey" FOREIGN KEY ("preMatchVersionId") REFERENCES "AnalysisPreMatchVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvent" ADD CONSTRAINT "AnalysisEvent_observedMatchId_fkey" FOREIGN KEY ("observedMatchId") REFERENCES "AnalysisOpponentObservedMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvent" ADD CONSTRAINT "AnalysisEvent_opponentPlayerId_fkey" FOREIGN KEY ("opponentPlayerId") REFERENCES "AnalysisOpponentPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnalysisOpponentProfile" ADD CONSTRAINT "AnalysisOpponentProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisOpponentProfile" ADD CONSTRAINT "AnalysisOpponentProfile_visitingTeamId_fkey" FOREIGN KEY ("visitingTeamId") REFERENCES "VisitingTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnalysisOpponentObservedMatch" ADD CONSTRAINT "AnalysisOpponentObservedMatch_opponentProfileId_fkey" FOREIGN KEY ("opponentProfileId") REFERENCES "AnalysisOpponentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisOpponentObservedMatchVideo" ADD CONSTRAINT "AnalysisOpponentObservedMatchVideo_observedMatchId_fkey" FOREIGN KEY ("observedMatchId") REFERENCES "AnalysisOpponentObservedMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisOpponentObservedMatchVideo" ADD CONSTRAINT "AnalysisOpponentObservedMatchVideo_videoSourceId_fkey" FOREIGN KEY ("videoSourceId") REFERENCES "AnalysisVideoSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalysisOpponentPlayer" ADD CONSTRAINT "AnalysisOpponentPlayer_opponentProfileId_fkey" FOREIGN KEY ("opponentProfileId") REFERENCES "AnalysisOpponentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisOpponentLineup" ADD CONSTRAINT "AnalysisOpponentLineup_opponentProfileId_fkey" FOREIGN KEY ("opponentProfileId") REFERENCES "AnalysisOpponentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisOpponentLineupEntry" ADD CONSTRAINT "AnalysisOpponentLineupEntry_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "AnalysisOpponentLineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisOpponentLineupEntry" ADD CONSTRAINT "AnalysisOpponentLineupEntry_opponentPlayerId_fkey" FOREIGN KEY ("opponentPlayerId") REFERENCES "AnalysisOpponentPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisOpponentSetPiece" ADD CONSTRAINT "AnalysisOpponentSetPiece_opponentProfileId_fkey" FOREIGN KEY ("opponentProfileId") REFERENCES "AnalysisOpponentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalysisClipCollection" ADD CONSTRAINT "AnalysisClipCollection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisClipCollection" ADD CONSTRAINT "AnalysisClipCollection_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "AnalysisSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisClipCollection" ADD CONSTRAINT "AnalysisClipCollection_opponentProfileId_fkey" FOREIGN KEY ("opponentProfileId") REFERENCES "AnalysisOpponentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisClipCollectionItem" ADD CONSTRAINT "AnalysisClipCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "AnalysisClipCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisClipCollectionItem" ADD CONSTRAINT "AnalysisClipCollectionItem_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "AnalysisClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalysisPreMatchPreparation" ADD CONSTRAINT "AnalysisPreMatchPreparation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisPreMatchPreparation" ADD CONSTRAINT "AnalysisPreMatchPreparation_travelLogisticsId_fkey" FOREIGN KEY ("travelLogisticsId") REFERENCES "TravelLogistics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisPreMatchPreparation" ADD CONSTRAINT "AnalysisPreMatchPreparation_opponentProfileId_fkey" FOREIGN KEY ("opponentProfileId") REFERENCES "AnalysisOpponentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisPreMatchVersion" ADD CONSTRAINT "AnalysisPreMatchVersion_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "AnalysisPreMatchPreparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
