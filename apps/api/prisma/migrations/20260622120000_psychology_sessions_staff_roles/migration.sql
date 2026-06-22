-- Psicologia: estagiários, supervisão e sessões presenciais/grupo/relatório semanal

ALTER TABLE "Psychologist" ADD COLUMN IF NOT EXISTS "staffRole" TEXT NOT NULL DEFAULT 'psicologo';
ALTER TABLE "Psychologist" ADD COLUMN IF NOT EXISTS "supervisorId" TEXT;
ALTER TABLE "Psychologist" ADD COLUMN IF NOT EXISTS "categories" JSONB;

CREATE INDEX IF NOT EXISTS "Psychologist_staffRole_idx" ON "Psychologist"("staffRole");

ALTER TABLE "Psychologist" DROP CONSTRAINT IF EXISTS "Psychologist_supervisorId_fkey";
ALTER TABLE "Psychologist" ADD CONSTRAINT "Psychologist_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "Psychologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PsychologySession" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sessionType" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "time" TEXT,
  "endTime" TEXT,
  "category" TEXT,
  "playerId" TEXT,
  "psychologistId" TEXT,
  "estagiarioId" TEXT,
  "psychologistName" TEXT,
  "estagiarioName" TEXT,
  "location" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "notes" TEXT,
  "periodStart" TEXT,
  "periodEnd" TEXT,
  "categoriesLabel" TEXT,
  "activities" TEXT,
  "individualDemands" TEXT,
  "weeklyDevelopment" TEXT,
  "identifiedDemands" TEXT,
  "nextWeekPlanning" TEXT,
  "finalSummary" TEXT,
  "generalNotes" TEXT,
  "groupSummary" TEXT,
  "attendance" JSONB,
  "footballAgendaEntryId" TEXT,
  "durationSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PsychologySession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PsychologySession_tenantId_date_idx" ON "PsychologySession"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "PsychologySession_sessionType_idx" ON "PsychologySession"("sessionType");

ALTER TABLE "PsychologySession" DROP CONSTRAINT IF EXISTS "PsychologySession_tenantId_fkey";
ALTER TABLE "PsychologySession" ADD CONSTRAINT "PsychologySession_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
