-- Registro CBF tipado para integração com súmulas oficiais.
ALTER TABLE "Player" ADD COLUMN "cbfRegistration" TEXT;

-- Backfill a partir do perfil de cadastro já existente.
UPDATE "Player"
SET "cbfRegistration" = NULLIF(
  regexp_replace(COALESCE("registrationProfile"->'sports'->>'cbf', ''), '[^0-9]', '', 'g'),
  ''
);

CREATE INDEX "Player_tenantId_cbfRegistration_idx"
ON "Player"("tenantId", "cbfRegistration");

CREATE TABLE "FmfMatchReport" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "externalMatchId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "competition" TEXT NOT NULL,
  "phase" TEXT,
  "round" INTEGER,
  "category" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "matchDate" TIMESTAMP(3) NOT NULL,
  "kickoffTime" TEXT,
  "homeTeam" TEXT NOT NULL,
  "awayTeam" TEXT NOT NULL,
  "homeScore" INTEGER,
  "awayScore" INTEGER,
  "firstHalfMinutes" INTEGER,
  "secondHalfMinutes" INTEGER,
  "totalMinutes" INTEGER,
  "rawParsed" JSONB,
  "unresolvedPlayers" JSONB,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FmfMatchReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FmfPlayerMatchStat" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "cbfRegistration" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "jerseyNumber" INTEGER,
  "starter" BOOLEAN NOT NULL DEFAULT false,
  "listed" BOOLEAN NOT NULL DEFAULT true,
  "played" BOOLEAN NOT NULL DEFAULT false,
  "enteredMinute" INTEGER,
  "exitedMinute" INTEGER,
  "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
  "goals" INTEGER NOT NULL DEFAULT 0,
  "ownGoals" INTEGER NOT NULL DEFAULT 0,
  "penaltyGoals" INTEGER NOT NULL DEFAULT 0,
  "yellowCards" INTEGER NOT NULL DEFAULT 0,
  "redCards" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FmfPlayerMatchStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FmfMatchReport_tenantId_externalMatchId_key"
ON "FmfMatchReport"("tenantId", "externalMatchId");
CREATE INDEX "FmfMatchReport_tenantId_season_category_idx"
ON "FmfMatchReport"("tenantId", "season", "category");
CREATE INDEX "FmfMatchReport_tenantId_matchDate_idx"
ON "FmfMatchReport"("tenantId", "matchDate");

CREATE UNIQUE INDEX "FmfPlayerMatchStat_matchId_playerId_key"
ON "FmfPlayerMatchStat"("matchId", "playerId");
CREATE INDEX "FmfPlayerMatchStat_playerId_idx"
ON "FmfPlayerMatchStat"("playerId");
CREATE INDEX "FmfPlayerMatchStat_playerId_matchId_idx"
ON "FmfPlayerMatchStat"("playerId", "matchId");
CREATE INDEX "FmfPlayerMatchStat_cbfRegistration_idx"
ON "FmfPlayerMatchStat"("cbfRegistration");

ALTER TABLE "FmfMatchReport"
ADD CONSTRAINT "FmfMatchReport_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FmfPlayerMatchStat"
ADD CONSTRAINT "FmfPlayerMatchStat_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "FmfMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FmfPlayerMatchStat"
ADD CONSTRAINT "FmfPlayerMatchStat_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
