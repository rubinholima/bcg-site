-- Melhor(es) jogador(es) adversário — múltiplos por relatório pós-jogo
CREATE TABLE "CoachMatchReportOpponentPlayer" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "jerseyNumber" INTEGER,
    "position" TEXT,
    "notes" TEXT,

    CONSTRAINT "CoachMatchReportOpponentPlayer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachMatchReportOpponentPlayer_reportId_idx" ON "CoachMatchReportOpponentPlayer"("reportId");

ALTER TABLE "CoachMatchReportOpponentPlayer" ADD CONSTRAINT "CoachMatchReportOpponentPlayer_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CoachMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CoachMatchReportOpponentPlayer" ("id", "reportId", "sortOrder", "jerseyNumber", "position", "notes")
SELECT
  gen_random_uuid()::text,
  "id",
  0,
  "opponentBestJersey",
  "opponentBestPosition",
  "opponentBestNotes"
FROM "CoachMatchReport"
WHERE "opponentBestJersey" IS NOT NULL
   OR ("opponentBestPosition" IS NOT NULL AND btrim("opponentBestPosition") <> '')
   OR ("opponentBestNotes" IS NOT NULL AND btrim("opponentBestNotes") <> '');
