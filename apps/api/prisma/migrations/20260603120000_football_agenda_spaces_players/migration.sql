-- Espaços de atividade (campos, salas) + vínculo atleta ↔ agenda

CREATE TABLE IF NOT EXISTS "FootballActivitySpace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballActivitySpace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FootballActivitySpace_tenantId_name_key"
  ON "FootballActivitySpace"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "FootballActivitySpace_tenantId_idx"
  ON "FootballActivitySpace"("tenantId");

ALTER TABLE "FootballActivitySpace"
  ADD CONSTRAINT "FootballActivitySpace_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FootballAgendaEntry"
  ADD COLUMN IF NOT EXISTS "spaceId" TEXT;

CREATE INDEX IF NOT EXISTS "FootballAgendaEntry_spaceId_idx"
  ON "FootballAgendaEntry"("spaceId");
CREATE INDEX IF NOT EXISTS "FootballAgendaEntry_tenantId_spaceId_startAt_idx"
  ON "FootballAgendaEntry"("tenantId", "spaceId", "startAt");

ALTER TABLE "FootballAgendaEntry"
  ADD CONSTRAINT "FootballAgendaEntry_spaceId_fkey"
  FOREIGN KEY ("spaceId") REFERENCES "FootballActivitySpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "FootballAgendaEntryParticipant" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FootballAgendaEntryParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FootballAgendaEntryParticipant_entryId_playerId_key"
  ON "FootballAgendaEntryParticipant"("entryId", "playerId");
CREATE INDEX IF NOT EXISTS "FootballAgendaEntryParticipant_playerId_idx"
  ON "FootballAgendaEntryParticipant"("playerId");

ALTER TABLE "FootballAgendaEntryParticipant"
  ADD CONSTRAINT "FootballAgendaEntryParticipant_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "FootballAgendaEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FootballAgendaEntryParticipant"
  ADD CONSTRAINT "FootballAgendaEntryParticipant_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
