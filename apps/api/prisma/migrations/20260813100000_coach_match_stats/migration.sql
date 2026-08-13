-- Treinadores: vínculo súmula + estatísticas complementares manuais

ALTER TABLE "CoachMatchReport" ADD COLUMN "fmfMatchReportId" TEXT;

CREATE UNIQUE INDEX "CoachMatchReport_fmfMatchReportId_key" ON "CoachMatchReport"("fmfMatchReportId");

ALTER TABLE "CoachMatchReport" ADD CONSTRAINT "CoachMatchReport_fmfMatchReportId_fkey"
  FOREIGN KEY ("fmfMatchReportId") REFERENCES "FmfMatchReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CoachMatchStatOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "fmfMatchReportId" TEXT,
    "travelLogisticsId" TEXT,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "opponentName" TEXT,
    "possessionPct" INTEGER,
    "setPiecesFor" INTEGER,
    "setPiecesAgainst" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachMatchStatOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachMatchStatOverride_fmfMatchReportId_key" ON "CoachMatchStatOverride"("fmfMatchReportId");

CREATE INDEX "CoachMatchStatOverride_tenantId_category_idx" ON "CoachMatchStatOverride"("tenantId", "category");

CREATE INDEX "CoachMatchStatOverride_tenantId_matchDate_idx" ON "CoachMatchStatOverride"("tenantId", "matchDate");

ALTER TABLE "CoachMatchStatOverride" ADD CONSTRAINT "CoachMatchStatOverride_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachMatchStatOverride" ADD CONSTRAINT "CoachMatchStatOverride_fmfMatchReportId_fkey"
  FOREIGN KEY ("fmfMatchReportId") REFERENCES "FmfMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
