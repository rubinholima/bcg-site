-- Prontuário médico: MedicalEncounter + módulo RBAC `medico`

CREATE TABLE "MedicalEncounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "physicianStaffId" TEXT,
    "physicianName" TEXT,
    "chiefComplaint" TEXT,
    "anamnesis" TEXT,
    "physicalExam" TEXT,
    "diagnosis" TEXT,
    "conduct" TEXT,
    "examsRequested" TEXT,
    "observations" TEXT,
    "restrictTraining" BOOLEAN NOT NULL DEFAULT false,
    "restrictMatch" BOOLEAN NOT NULL DEFAULT false,
    "returnForecastAt" TIMESTAMP(3),
    "referPhysio" BOOLEAN NOT NULL DEFAULT false,
    "referPhysioNotes" TEXT,
    "referPhysioSessionId" TEXT,
    "attachments" JSONB,
    "prescriptions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'finalized',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEncounter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicalEncounter_tenantId_playerId_idx" ON "MedicalEncounter"("tenantId", "playerId");
CREATE INDEX "MedicalEncounter_playerId_occurredAt_idx" ON "MedicalEncounter"("playerId", "occurredAt");
CREATE INDEX "MedicalEncounter_tenantId_occurredAt_idx" ON "MedicalEncounter"("tenantId", "occurredAt");

ALTER TABLE "MedicalEncounter" ADD CONSTRAINT "MedicalEncounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalEncounter" ADD CONSTRAINT "MedicalEncounter_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Módulo clínico Médico (prontuário) — separado de `saude` operacional
INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT 'mod-medico-prontuario', 'medico', 'Médico — Prontuário', 9985, 'saude_dados_sensiveis', NULL
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'medico');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-med-' || pr."slug", m."id", pr."slug", false
FROM "Module" m
CROSS JOIN "PlatformRole" pr
WHERE m."slug" = 'medico'
  AND pr."includeInMatrix" = true
  AND pr."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "ModuleRole" mr
    WHERE mr."moduleId" = m."id" AND mr."role" = pr."slug"
  );

UPDATE "ModuleRole" mr
SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id"
  AND m."slug" = 'medico'
  AND mr."role" IN (
    'medico',
    'diretoria',
    'company_admin',
    'super_admin'
  );
