-- Add psychological assessment and online consultations to Player
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "psychologicalAssessment" JSONB;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "onlineConsultations" JSONB;
