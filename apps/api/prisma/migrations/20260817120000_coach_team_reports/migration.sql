-- Relatórios periódicos da equipe (Treinadores → Diretoria)

CREATE TABLE "CoachTeamReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "generalDescription" TEXT,
    "weakPoints" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "authorUserId" TEXT,
    "staffId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachTeamReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachTeamReportPlayerAction" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "CoachTeamReportPlayerAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachTeamReport_tenantId_category_idx" ON "CoachTeamReport"("tenantId", "category");
CREATE INDEX "CoachTeamReport_tenantId_periodType_idx" ON "CoachTeamReport"("tenantId", "periodType");
CREATE INDEX "CoachTeamReport_tenantId_status_idx" ON "CoachTeamReport"("tenantId", "status");
CREATE INDEX "CoachTeamReport_staffId_idx" ON "CoachTeamReport"("staffId");

CREATE UNIQUE INDEX "CoachTeamReportPlayerAction_reportId_playerId_key" ON "CoachTeamReportPlayerAction"("reportId", "playerId");
CREATE INDEX "CoachTeamReportPlayerAction_playerId_idx" ON "CoachTeamReportPlayerAction"("playerId");

ALTER TABLE "CoachTeamReport" ADD CONSTRAINT "CoachTeamReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachTeamReport" ADD CONSTRAINT "CoachTeamReport_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TechnicalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CoachTeamReportPlayerAction" ADD CONSTRAINT "CoachTeamReportPlayerAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CoachTeamReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachTeamReportPlayerAction" ADD CONSTRAINT "CoachTeamReportPlayerAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
