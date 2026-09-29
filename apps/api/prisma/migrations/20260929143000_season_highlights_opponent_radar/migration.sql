-- Destaque explícito da comissão no pós-jogo
ALTER TABLE "CoachMatchReportPlayerRating" ADD COLUMN "isStaffStandout" BOOLEAN NOT NULL DEFAULT false;

-- Radar adversário persistente
CREATE TABLE "OpponentHighlightProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cbfRegistration" TEXT,
    "displayName" TEXT NOT NULL,
    "normalizedNameKey" TEXT NOT NULL,
    "position" TEXT,
    "lastKnownClub" TEXT,
    "category" TEXT,
    "identitySource" TEXT NOT NULL,
    "identityConfidence" TEXT NOT NULL,
    "fallbackIdentityKey" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "highlightCount" INTEGER NOT NULL DEFAULT 0,
    "managementNotes" TEXT,
    "managementStatus" TEXT,
    "scoutingProspectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpponentHighlightProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpponentHighlightEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "opponentHighlightId" TEXT NOT NULL,
    "fmfMatchReportId" TEXT,
    "season" INTEGER NOT NULL,
    "matchDate" TIMESTAMP(3),
    "opponentClub" TEXT,
    "competition" TEXT,
    "category" TEXT,
    "jerseyNumber" INTEGER,
    "position" TEXT,
    "staffNotes" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "scoreLabel" TEXT,
    "clubWasHome" BOOLEAN,
    "resolvedName" TEXT,
    "cbfRegistration" TEXT,
    "identitySource" TEXT NOT NULL,
    "officialStats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpponentHighlightEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpponentHighlightProfile_scoutingProspectId_key" ON "OpponentHighlightProfile"("scoutingProspectId");
CREATE INDEX "OpponentHighlightProfile_tenantId_lastSeenAt_idx" ON "OpponentHighlightProfile"("tenantId", "lastSeenAt");
CREATE INDEX "OpponentHighlightProfile_tenantId_cbfRegistration_idx" ON "OpponentHighlightProfile"("tenantId", "cbfRegistration");
CREATE INDEX "OpponentHighlightProfile_tenantId_normalizedNameKey_idx" ON "OpponentHighlightProfile"("tenantId", "normalizedNameKey");
CREATE UNIQUE INDEX "OpponentHighlightProfile_tenantId_cbfRegistration_key" ON "OpponentHighlightProfile"("tenantId", "cbfRegistration");
CREATE UNIQUE INDEX "OpponentHighlightProfile_tenantId_fallbackIdentityKey_key" ON "OpponentHighlightProfile"("tenantId", "fallbackIdentityKey");

CREATE UNIQUE INDEX "OpponentHighlightEvent_opponentHighlightId_key" ON "OpponentHighlightEvent"("opponentHighlightId");
CREATE INDEX "OpponentHighlightEvent_profileId_idx" ON "OpponentHighlightEvent"("profileId");
CREATE INDEX "OpponentHighlightEvent_tenantId_season_idx" ON "OpponentHighlightEvent"("tenantId", "season");
CREATE INDEX "OpponentHighlightEvent_reportId_idx" ON "OpponentHighlightEvent"("reportId");

ALTER TABLE "OpponentHighlightProfile" ADD CONSTRAINT "OpponentHighlightProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpponentHighlightProfile" ADD CONSTRAINT "OpponentHighlightProfile_scoutingProspectId_fkey" FOREIGN KEY ("scoutingProspectId") REFERENCES "ScoutingProspect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OpponentHighlightEvent" ADD CONSTRAINT "OpponentHighlightEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpponentHighlightEvent" ADD CONSTRAINT "OpponentHighlightEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "OpponentHighlightProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpponentHighlightEvent" ADD CONSTRAINT "OpponentHighlightEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CoachMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpponentHighlightEvent" ADD CONSTRAINT "OpponentHighlightEvent_opponentHighlightId_fkey" FOREIGN KEY ("opponentHighlightId") REFERENCES "CoachMatchReportOpponentPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
