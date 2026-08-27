-- Avaliação individual do jogador (independente do relatório da equipe)
-- Assistências no pós-jogo

ALTER TABLE "CoachMatchReportPlayerRating" ADD COLUMN IF NOT EXISTS "assists" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CoachPlayerEvaluation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "periodKey" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "gamesListed" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesStarted" INTEGER NOT NULL DEFAULT 0,
    "gamesListedHigherCategory" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayedHigherCategory" INTEGER NOT NULL DEFAULT 0,
    "matchMinutes" INTEGER NOT NULL DEFAULT 0,
    "trainingMinutes" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "techIndividualSkill" DOUBLE PRECISION,
    "techBilaterality" DOUBLE PRECISION,
    "techNonDominantLeg" DOUBLE PRECISION,
    "techAverage" DOUBLE PRECISION,
    "tacCollective" DOUBLE PRECISION,
    "tacIndividual" DOUBLE PRECISION,
    "tacGameVision" DOUBLE PRECISION,
    "tacDecisionMaking" DOUBLE PRECISION,
    "tacAverage" DOUBLE PRECISION,
    "physStrength" DOUBLE PRECISION,
    "physSpeed" DOUBLE PRECISION,
    "physPotential" DOUBLE PRECISION,
    "physMaturity" DOUBLE PRECISION,
    "physAverage" DOUBLE PRECISION,
    "behEmotionalControl" DOUBLE PRECISION,
    "behPersonality" DOUBLE PRECISION,
    "behDetermination" DOUBLE PRECISION,
    "behIntelligence" DOUBLE PRECISION,
    "behAverage" DOUBLE PRECISION,
    "offBuildUp" DOUBLE PRECISION,
    "offOrganization" DOUBLE PRECISION,
    "offPositioning" DOUBLE PRECISION,
    "offAverage" DOUBLE PRECISION,
    "defOrganization" DOUBLE PRECISION,
    "defRecovery" DOUBLE PRECISION,
    "defPositioning" DOUBLE PRECISION,
    "defAverage" DOUBLE PRECISION,
    "competitiveness" DOUBLE PRECISION,
    "overallAverage" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "classification" TEXT,
    "technicalAssessment" TEXT,
    "finalResult" TEXT,
    "authorUserId" TEXT,
    "staffId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachPlayerEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachPlayerEvaluation_tenantId_season_category_playerId_periodKey_key"
ON "CoachPlayerEvaluation"("tenantId", "season", "category", "playerId", "periodKey");

CREATE INDEX "CoachPlayerEvaluation_tenantId_category_season_idx"
ON "CoachPlayerEvaluation"("tenantId", "category", "season");

CREATE INDEX "CoachPlayerEvaluation_playerId_season_idx"
ON "CoachPlayerEvaluation"("playerId", "season");

ALTER TABLE "CoachPlayerEvaluation" ADD CONSTRAINT "CoachPlayerEvaluation_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachPlayerEvaluation" ADD CONSTRAINT "CoachPlayerEvaluation_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
