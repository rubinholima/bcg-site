-- Tratamentos múltiplos por atendimento de fisioterapia
CREATE TABLE "PhysioSessionTreatment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "treatmentId" TEXT,
    "treatmentLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PhysioSessionTreatment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhysioSessionTreatment_sessionId_idx" ON "PhysioSessionTreatment"("sessionId");

ALTER TABLE "PhysioSessionTreatment" ADD CONSTRAINT "PhysioSessionTreatment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PhysioSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhysioSessionTreatment" ADD CONSTRAINT "PhysioSessionTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "PhysioTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: sessões com tratamento singular passam a ter 1 linha N:N
INSERT INTO "PhysioSessionTreatment" ("id", "sessionId", "treatmentId", "treatmentLabel", "sortOrder")
SELECT
  gen_random_uuid()::text,
  s."id",
  s."treatmentId",
  s."treatmentLabel",
  0
FROM "PhysioSession" s
WHERE s."treatmentId" IS NOT NULL OR (s."treatmentLabel" IS NOT NULL AND btrim(s."treatmentLabel") <> '');
