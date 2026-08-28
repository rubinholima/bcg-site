-- Fase 3: relógio oficial, sequência de ordenação e resolução parcial de substituição

ALTER TABLE "MatchOfficialEvent" ADD COLUMN "sourceClock" TEXT;
ALTER TABLE "MatchOfficialEvent" ADD COLUMN "sourceSequence" INTEGER;
ALTER TABLE "MatchOfficialEvent" ADD COLUMN "relatedResolutionStatus" TEXT;

CREATE INDEX "MatchOfficialEvent_fmfMatchReportId_sourceSequence_idx" ON "MatchOfficialEvent"("fmfMatchReportId", "sourceSequence");
