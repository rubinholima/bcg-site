-- Campos mensais por atleta no Relatório da Equipe (observação e pontos fortes)

ALTER TABLE "CoachTeamReportPlayerEvaluation" ADD COLUMN "individualObservation" TEXT;
ALTER TABLE "CoachTeamReportPlayerEvaluation" ADD COLUMN "playerStrengths" TEXT;
