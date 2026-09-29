-- Perfil profissional (médico) + disponibilidade operacional + auditoria de prescrição

ALTER TABLE "MedicalStaff" ADD COLUMN IF NOT EXISTS "registryState" TEXT;
ALTER TABLE "MedicalStaff" ADD COLUMN IF NOT EXISTS "institution" TEXT;
ALTER TABLE "MedicalStaff" ADD COLUMN IF NOT EXISTS "signatureImageUrl" TEXT;

ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "medicalOperationalStatus" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "medicalOperationalSummary" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "medicalOperationalUntil" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "medicalOperationalUpdatedAt" TIMESTAMP(3);

ALTER TABLE "MedicalEncounter" ADD COLUMN IF NOT EXISTS "prescriptionIssuanceLog" JSONB;
