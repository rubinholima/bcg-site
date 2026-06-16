-- Captação: captadores, prospects e relatórios de observação

CREATE TABLE "Scout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "technicalStaffId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "regions" JSONB,
    "categories" JSONB,
    "specialties" JSONB,
    "licenseInfo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoutingProspect" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT,
    "scoutId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'identificado',
    "priority" TEXT NOT NULL DEFAULT 'media',
    "name" TEXT NOT NULL,
    "birthDate" TEXT,
    "nationality" TEXT,
    "position" TEXT,
    "secondaryPositions" JSONB,
    "preferredFoot" TEXT,
    "height" INTEGER,
    "weight" INTEGER,
    "currentClub" TEXT,
    "competition" TEXT,
    "competitionLevel" TEXT,
    "contractSituation" TEXT,
    "contractEndDate" TEXT,
    "agentName" TEXT,
    "agentPhone" TEXT,
    "agentEmail" TEXT,
    "source" TEXT,
    "sourceDetails" TEXT,
    "targetCategory" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObservedAt" TIMESTAMP(3),
    "observationCount" INTEGER NOT NULL DEFAULT 0,
    "overallRating" DOUBLE PRECISION,
    "recommendation" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "risks" TEXT,
    "profileLinks" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingProspect_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoutingReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchName" TEXT,
    "matchDate" TEXT,
    "competition" TEXT,
    "minutesObserved" INTEGER,
    "positionPlayed" TEXT,
    "observationType" TEXT,
    "opponentStrength" TEXT,
    "technical" JSONB,
    "tactical" JSONB,
    "physical" JSONB,
    "mental" JSONB,
    "overallRating" DOUBLE PRECISION,
    "recommendation" TEXT NOT NULL,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "risks" TEXT,
    "scoutNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Scout_technicalStaffId_key" ON "Scout"("technicalStaffId");
CREATE INDEX "Scout_tenantId_idx" ON "Scout"("tenantId");
CREATE INDEX "Scout_tenantId_active_idx" ON "Scout"("tenantId", "active");

CREATE INDEX "ScoutingProspect_tenantId_idx" ON "ScoutingProspect"("tenantId");
CREATE INDEX "ScoutingProspect_tenantId_stage_idx" ON "ScoutingProspect"("tenantId", "stage");
CREATE INDEX "ScoutingProspect_tenantId_priority_idx" ON "ScoutingProspect"("tenantId", "priority");
CREATE INDEX "ScoutingProspect_scoutId_idx" ON "ScoutingProspect"("scoutId");
CREATE INDEX "ScoutingProspect_playerId_idx" ON "ScoutingProspect"("playerId");

CREATE INDEX "ScoutingReport_tenantId_idx" ON "ScoutingReport"("tenantId");
CREATE INDEX "ScoutingReport_prospectId_idx" ON "ScoutingReport"("prospectId");
CREATE INDEX "ScoutingReport_scoutId_idx" ON "ScoutingReport"("scoutId");
CREATE INDEX "ScoutingReport_reportDate_idx" ON "ScoutingReport"("reportDate");

ALTER TABLE "Scout" ADD CONSTRAINT "Scout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scout" ADD CONSTRAINT "Scout_technicalStaffId_fkey" FOREIGN KEY ("technicalStaffId") REFERENCES "TechnicalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScoutingProspect" ADD CONSTRAINT "ScoutingProspect_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutingProspect" ADD CONSTRAINT "ScoutingProspect_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScoutingProspect" ADD CONSTRAINT "ScoutingProspect_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScoutingReport" ADD CONSTRAINT "ScoutingReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutingReport" ADD CONSTRAINT "ScoutingReport_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "ScoutingProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutingReport" ADD CONSTRAINT "ScoutingReport_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
