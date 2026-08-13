-- Ocorrências e anexos por partida (Depto Futebol — Jogos)

ALTER TABLE "FmfMatchReport" ADD COLUMN IF NOT EXISTS "occurrencesText" TEXT;

CREATE TABLE "FootballMatchIncident" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fmfMatchReportId" TEXT,
    "travelLogisticsId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minute" INTEGER,
    "period" TEXT,
    "externalKey" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballMatchIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FootballMatchAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fmfMatchReportId" TEXT,
    "travelLogisticsId" TEXT,
    "label" TEXT,
    "fileUrl" TEXT NOT NULL,
    "kind" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FootballMatchAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FootballMatchIncident_tenantId_idx" ON "FootballMatchIncident"("tenantId");
CREATE INDEX "FootballMatchIncident_fmfMatchReportId_idx" ON "FootballMatchIncident"("fmfMatchReportId");
CREATE INDEX "FootballMatchIncident_travelLogisticsId_idx" ON "FootballMatchIncident"("travelLogisticsId");
CREATE UNIQUE INDEX "FootballMatchIncident_fmfMatchReportId_externalKey_key" ON "FootballMatchIncident"("fmfMatchReportId", "externalKey");

CREATE INDEX "FootballMatchAttachment_tenantId_idx" ON "FootballMatchAttachment"("tenantId");
CREATE INDEX "FootballMatchAttachment_fmfMatchReportId_idx" ON "FootballMatchAttachment"("fmfMatchReportId");
CREATE INDEX "FootballMatchAttachment_travelLogisticsId_idx" ON "FootballMatchAttachment"("travelLogisticsId");

ALTER TABLE "FootballMatchIncident" ADD CONSTRAINT "FootballMatchIncident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FootballMatchIncident" ADD CONSTRAINT "FootballMatchIncident_fmfMatchReportId_fkey" FOREIGN KEY ("fmfMatchReportId") REFERENCES "FmfMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FootballMatchIncident" ADD CONSTRAINT "FootballMatchIncident_travelLogisticsId_fkey" FOREIGN KEY ("travelLogisticsId") REFERENCES "TravelLogistics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FootballMatchAttachment" ADD CONSTRAINT "FootballMatchAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FootballMatchAttachment" ADD CONSTRAINT "FootballMatchAttachment_fmfMatchReportId_fkey" FOREIGN KEY ("fmfMatchReportId") REFERENCES "FmfMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FootballMatchAttachment" ADD CONSTRAINT "FootballMatchAttachment_travelLogisticsId_fkey" FOREIGN KEY ("travelLogisticsId") REFERENCES "TravelLogistics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
