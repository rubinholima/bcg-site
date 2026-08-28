-- Fundação: eventos oficiais normalizados da súmula FMF + integridade da partida

ALTER TABLE "FmfMatchReport" ADD COLUMN "integrityStatus" TEXT;
ALTER TABLE "FmfMatchReport" ADD COLUMN "integrityCheckedAt" TIMESTAMP(3);
ALTER TABLE "FmfMatchReport" ADD COLUMN "integritySummary" JSONB;

CREATE TABLE "MatchOfficialEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fmfMatchReportId" TEXT NOT NULL,
    "factType" TEXT NOT NULL,
    "provenance" TEXT NOT NULL DEFAULT 'fmf_official',
    "playerId" TEXT,
    "technicalStaffId" TEXT,
    "resolutionStatus" TEXT NOT NULL,
    "resolutionReason" TEXT,
    "sourceName" TEXT,
    "sourceRegistration" TEXT,
    "sourceJerseyNumber" INTEGER,
    "relatedJerseyNumber" INTEGER,
    "relatedPlayerId" TEXT,
    "sourceRoleLabel" TEXT,
    "sourceTeamSide" TEXT,
    "minute" INTEGER,
    "period" TEXT,
    "goalType" TEXT,
    "sourceExcerpt" TEXT,
    "sourceSections" JSONB,
    "externalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchOfficialEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchOfficialEvent_fmfMatchReportId_externalKey_key" ON "MatchOfficialEvent"("fmfMatchReportId", "externalKey");
CREATE INDEX "MatchOfficialEvent_tenantId_idx" ON "MatchOfficialEvent"("tenantId");
CREATE INDEX "MatchOfficialEvent_fmfMatchReportId_idx" ON "MatchOfficialEvent"("fmfMatchReportId");
CREATE INDEX "MatchOfficialEvent_playerId_idx" ON "MatchOfficialEvent"("playerId");
CREATE INDEX "MatchOfficialEvent_technicalStaffId_idx" ON "MatchOfficialEvent"("technicalStaffId");
CREATE INDEX "MatchOfficialEvent_factType_idx" ON "MatchOfficialEvent"("factType");

ALTER TABLE "MatchOfficialEvent" ADD CONSTRAINT "MatchOfficialEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchOfficialEvent" ADD CONSTRAINT "MatchOfficialEvent_fmfMatchReportId_fkey" FOREIGN KEY ("fmfMatchReportId") REFERENCES "FmfMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchOfficialEvent" ADD CONSTRAINT "MatchOfficialEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchOfficialEvent" ADD CONSTRAINT "MatchOfficialEvent_technicalStaffId_fkey" FOREIGN KEY ("technicalStaffId") REFERENCES "TechnicalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
