-- Psicologia: atendimento a emprestados e funcionários (RH + comissão)

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "psychologicalAssessment" JSONB;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "onlineConsultations" JSONB;

ALTER TABLE "TechnicalStaff" ADD COLUMN IF NOT EXISTS "psychologicalAssessment" JSONB;
ALTER TABLE "TechnicalStaff" ADD COLUMN IF NOT EXISTS "onlineConsultations" JSONB;

ALTER TABLE "PsychologySession" ADD COLUMN IF NOT EXISTS "personType" TEXT DEFAULT 'player';
ALTER TABLE "PsychologySession" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "PsychologySession" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE "PsychologySession" ADD COLUMN IF NOT EXISTS "personClassification" TEXT;
