-- Prontuário médico — evoluções, exames, RTP, auditoria, atendimento de origem

ALTER TABLE "MedicalEncounter" ADD COLUMN IF NOT EXISTS "originEncounterId" TEXT;
ALTER TABLE "MedicalEncounter" ADD COLUMN IF NOT EXISTS "evolutionNotes" JSONB;
ALTER TABLE "MedicalEncounter" ADD COLUMN IF NOT EXISTS "examRecords" JSONB;
ALTER TABLE "MedicalEncounter" ADD COLUMN IF NOT EXISTS "rtpDecision" TEXT;
ALTER TABLE "MedicalEncounter" ADD COLUMN IF NOT EXISTS "medicalRtpReleasedAt" TIMESTAMP(3);
ALTER TABLE "MedicalEncounter" ADD COLUMN IF NOT EXISTS "medicalRtpNotes" TEXT;
ALTER TABLE "MedicalEncounter" ADD COLUMN IF NOT EXISTS "editLog" JSONB;

CREATE INDEX IF NOT EXISTS "MedicalEncounter_originEncounterId_idx" ON "MedicalEncounter"("originEncounterId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MedicalEncounter_originEncounterId_fkey'
  ) THEN
    ALTER TABLE "MedicalEncounter"
      ADD CONSTRAINT "MedicalEncounter_originEncounterId_fkey"
      FOREIGN KEY ("originEncounterId") REFERENCES "MedicalEncounter"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
