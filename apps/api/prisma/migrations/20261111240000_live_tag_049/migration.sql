-- Live Tag 049 — descrição de tag (aditivo)

ALTER TABLE "AnalysisTagDefinition" ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "AnalysisEvent" ADD COLUMN IF NOT EXISTS "eventQualifier" TEXT;
