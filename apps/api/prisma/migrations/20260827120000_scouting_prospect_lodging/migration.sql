-- Captação: alojamento e data de apresentação do prospect

ALTER TABLE "ScoutingProspect" ADD COLUMN "needsLodging" BOOLEAN;
ALTER TABLE "ScoutingProspect" ADD COLUMN "presentationDate" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN "managerNotifiedAt" TIMESTAMP(3);
