-- Relatório pós-jogo: resumo, aspectos, boas ações, adversário e melhor(es) do jogo
ALTER TABLE "CoachMatchReport" ADD COLUMN "matchSummary" TEXT;
ALTER TABLE "CoachMatchReport" ADD COLUMN "aspectsToImprove" TEXT;
ALTER TABLE "CoachMatchReport" ADD COLUMN "goodActions" TEXT;
ALTER TABLE "CoachMatchReport" ADD COLUMN "opponentBestJersey" INTEGER;
ALTER TABLE "CoachMatchReport" ADD COLUMN "opponentBestPosition" TEXT;
ALTER TABLE "CoachMatchReport" ADD COLUMN "opponentBestNotes" TEXT;

ALTER TABLE "CoachMatchReportPlayerRating" ADD COLUMN "isMatchBest" BOOLEAN NOT NULL DEFAULT false;

UPDATE "CoachMatchReport"
SET "matchSummary" = "teamReport"
WHERE "matchSummary" IS NULL AND "teamReport" IS NOT NULL;
