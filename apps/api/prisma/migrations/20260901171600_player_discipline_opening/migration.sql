-- Saldo disciplinar de entrada por competição/temporada (transferidos)

CREATE TABLE "PlayerDisciplineOpening" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "competitionKey" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "yellowAccum" INTEGER NOT NULL DEFAULT 0,
    "suspensionRoundsLeft" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerDisciplineOpening_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerDisciplineOpening_tenantId_playerId_competitionKey_season_key"
    ON "PlayerDisciplineOpening"("tenantId", "playerId", "competitionKey", "season");

CREATE INDEX "PlayerDisciplineOpening_tenantId_competitionKey_season_idx"
    ON "PlayerDisciplineOpening"("tenantId", "competitionKey", "season");

CREATE INDEX "PlayerDisciplineOpening_playerId_idx"
    ON "PlayerDisciplineOpening"("playerId");

ALTER TABLE "PlayerDisciplineOpening"
    ADD CONSTRAINT "PlayerDisciplineOpening_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerDisciplineOpening"
    ADD CONSTRAINT "PlayerDisciplineOpening_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
