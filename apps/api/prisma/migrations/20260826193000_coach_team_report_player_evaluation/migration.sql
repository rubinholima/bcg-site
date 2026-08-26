-- Avaliação trimestral obrigatória por atleta (Relatório da equipe)

ALTER TABLE "CoachTeamReport" ADD COLUMN "season" INTEGER;
ALTER TABLE "CoachTeamReport" ADD COLUMN "periodKey" TEXT;

CREATE TABLE "CoachTeamReportPlayerEvaluation" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gamesCount" INTEGER NOT NULL DEFAULT 0,
    "gamesMinutes" INTEGER NOT NULL DEFAULT 0,
    "trainingMinutes" INTEGER NOT NULL DEFAULT 0,
    "avgMatchRating" DOUBLE PRECISION,
    "coachFinalRating" DOUBLE PRECISION,

    CONSTRAINT "CoachTeamReportPlayerEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachTeamReportPlayerEvaluation_reportId_playerId_key" ON "CoachTeamReportPlayerEvaluation"("reportId", "playerId");
CREATE INDEX "CoachTeamReportPlayerEvaluation_playerId_idx" ON "CoachTeamReportPlayerEvaluation"("playerId");

ALTER TABLE "CoachTeamReportPlayerEvaluation" ADD CONSTRAINT "CoachTeamReportPlayerEvaluation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CoachTeamReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachTeamReportPlayerEvaluation" ADD CONSTRAINT "CoachTeamReportPlayerEvaluation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CoachTeamReport_tenantId_category_season_periodKey_key" ON "CoachTeamReport"("tenantId", "category", "season", "periodKey");
CREATE INDEX "CoachTeamReport_tenantId_season_periodKey_idx" ON "CoachTeamReport"("tenantId", "season", "periodKey");
