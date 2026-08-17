-- Placar e cartões manuais (amistosos e ajustes analíticos)

ALTER TABLE "CoachMatchStatOverride" ADD COLUMN "goalsFor" INTEGER;
ALTER TABLE "CoachMatchStatOverride" ADD COLUMN "goalsAgainst" INTEGER;
ALTER TABLE "CoachMatchStatOverride" ADD COLUMN "yellowCards" INTEGER;
ALTER TABLE "CoachMatchStatOverride" ADD COLUMN "redCards" INTEGER;

CREATE UNIQUE INDEX "CoachMatchStatOverride_travelLogisticsId_key"
  ON "CoachMatchStatOverride"("travelLogisticsId")
  WHERE "travelLogisticsId" IS NOT NULL;
