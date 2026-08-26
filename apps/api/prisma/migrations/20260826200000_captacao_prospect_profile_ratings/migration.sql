-- Perfil completo do observado + notas 0-10 + encaminhamento

ALTER TABLE "ScoutingProspect" ADD COLUMN "evaluationOutcome" TEXT DEFAULT 'pendente';
ALTER TABLE "ScoutingProspect" ADD COLUMN "technicalRating" DOUBLE PRECISION;
ALTER TABLE "ScoutingProspect" ADD COLUMN "tacticalRating" DOUBLE PRECISION;
ALTER TABLE "ScoutingProspect" ADD COLUMN "physicalRating" DOUBLE PRECISION;
ALTER TABLE "ScoutingProspect" ADD COLUMN "cognitiveRating" DOUBLE PRECISION;
ALTER TABLE "ScoutingProspect" ADD COLUMN "descriptiveObservation" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN "schedulerNotifiedAt" TIMESTAMP(3);

ALTER TABLE "ScoutingReport" ADD COLUMN "technicalRating" DOUBLE PRECISION;
ALTER TABLE "ScoutingReport" ADD COLUMN "tacticalRating" DOUBLE PRECISION;
ALTER TABLE "ScoutingReport" ADD COLUMN "physicalRating" DOUBLE PRECISION;
ALTER TABLE "ScoutingReport" ADD COLUMN "cognitiveRating" DOUBLE PRECISION;
ALTER TABLE "ScoutingReport" ADD COLUMN "evaluationOutcome" TEXT DEFAULT 'pendente';
