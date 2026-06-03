-- Idempotência import Beatscode → agenda / logística
ALTER TABLE "FootballAgendaEntry" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "FootballAgendaEntry" ADD COLUMN IF NOT EXISTS "beatscodeMeta" JSONB;

ALTER TABLE "TravelLogistics" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "TravelLogistics" ADD COLUMN IF NOT EXISTS "beatscodeMeta" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "FootballAgendaEntry_tenantId_externalId_key"
  ON "FootballAgendaEntry"("tenantId", "externalId")
  WHERE "externalId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "TravelLogistics_tenantId_externalId_key"
  ON "TravelLogistics"("tenantId", "externalId")
  WHERE "externalId" IS NOT NULL;
