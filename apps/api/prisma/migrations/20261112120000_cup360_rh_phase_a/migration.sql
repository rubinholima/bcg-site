-- CUP360 RH Phase A — dados legais do tenant, contratações, auditoria, módulos granulares

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "taxIdType" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "legalAddress" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "legalStatus" TEXT;

CREATE TABLE IF NOT EXISTS "RhHiringRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidateCpf" TEXT,
    "candidateEmail" TEXT,
    "candidatePhone" TEXT,
    "contractType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "jobRoleId" TEXT,
    "departmentId" TEXT,
    "playerId" TEXT,
    "employeeId" TEXT,
    "employmentId" TEXT,
    "proposedSalary" DECIMAL(12,2),
    "proposedStartDate" TIMESTAMP(3),
    "notes" TEXT,
    "requestedByUserId" TEXT,
    "requestedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RhHiringRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhHiringStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hiringRequestId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "notes" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RhHiringStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhHiringMedicalExam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hiringRequestId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" TEXT,
    "fileKey" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RhHiringMedicalExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhHiringAccountingHandoff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hiringRequestId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RhHiringAccountingHandoff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhHiringLegalHandoff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hiringRequestId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RhHiringLegalHandoff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RhAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RhHiringMedicalExam_hiringRequestId_key" ON "RhHiringMedicalExam"("hiringRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "RhHiringAccountingHandoff_hiringRequestId_key" ON "RhHiringAccountingHandoff"("hiringRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "RhHiringLegalHandoff_hiringRequestId_key" ON "RhHiringLegalHandoff"("hiringRequestId");

CREATE INDEX IF NOT EXISTS "RhHiringRequest_tenantId_idx" ON "RhHiringRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "RhHiringRequest_tenantId_status_idx" ON "RhHiringRequest"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "RhHiringRequest_employeeId_idx" ON "RhHiringRequest"("employeeId");
CREATE INDEX IF NOT EXISTS "RhHiringRequest_playerId_idx" ON "RhHiringRequest"("playerId");
CREATE INDEX IF NOT EXISTS "RhHiringStatusHistory_hiringRequestId_idx" ON "RhHiringStatusHistory"("hiringRequestId");
CREATE INDEX IF NOT EXISTS "RhHiringStatusHistory_tenantId_createdAt_idx" ON "RhHiringStatusHistory"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "RhHiringMedicalExam_tenantId_idx" ON "RhHiringMedicalExam"("tenantId");
CREATE INDEX IF NOT EXISTS "RhHiringAccountingHandoff_tenantId_idx" ON "RhHiringAccountingHandoff"("tenantId");
CREATE INDEX IF NOT EXISTS "RhHiringLegalHandoff_tenantId_idx" ON "RhHiringLegalHandoff"("tenantId");
CREATE INDEX IF NOT EXISTS "RhAuditLog_tenantId_createdAt_idx" ON "RhAuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "RhAuditLog_entityType_entityId_idx" ON "RhAuditLog"("entityType", "entityId");

DO $$ BEGIN
 ALTER TABLE "RhHiringRequest" ADD CONSTRAINT "RhHiringRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringRequest" ADD CONSTRAINT "RhHiringRequest_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringRequest" ADD CONSTRAINT "RhHiringRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringRequest" ADD CONSTRAINT "RhHiringRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringRequest" ADD CONSTRAINT "RhHiringRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringRequest" ADD CONSTRAINT "RhHiringRequest_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringStatusHistory" ADD CONSTRAINT "RhHiringStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringStatusHistory" ADD CONSTRAINT "RhHiringStatusHistory_hiringRequestId_fkey" FOREIGN KEY ("hiringRequestId") REFERENCES "RhHiringRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringMedicalExam" ADD CONSTRAINT "RhHiringMedicalExam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringMedicalExam" ADD CONSTRAINT "RhHiringMedicalExam_hiringRequestId_fkey" FOREIGN KEY ("hiringRequestId") REFERENCES "RhHiringRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringAccountingHandoff" ADD CONSTRAINT "RhHiringAccountingHandoff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringAccountingHandoff" ADD CONSTRAINT "RhHiringAccountingHandoff_hiringRequestId_fkey" FOREIGN KEY ("hiringRequestId") REFERENCES "RhHiringRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringLegalHandoff" ADD CONSTRAINT "RhHiringLegalHandoff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringLegalHandoff" ADD CONSTRAINT "RhHiringLegalHandoff_hiringRequestId_fkey" FOREIGN KEY ("hiringRequestId") REFERENCES "RhHiringRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhAuditLog" ADD CONSTRAINT "RhAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT gen_random_uuid()::text, v.slug, v.name, v.ord, 'adm_departamentos', NULL
FROM (VALUES
  ('rh_view', 'RH — visualizar', 221),
  ('rh_manage', 'RH — gerenciar', 222),
  ('rh_hiring_view', 'RH — ver contratações', 223),
  ('rh_hiring_manage', 'RH — gerir contratações', 224),
  ('rh_compensation_view', 'RH — ver compensação', 225),
  ('rh_compensation_manage', 'RH — gerir compensação', 226),
  ('rh_bank_view', 'RH — ver dados bancários', 227),
  ('rh_bank_manage', 'RH — gerir dados bancários', 228),
  ('rh_private_docs_view', 'RH — ver docs privados', 229),
  ('rh_private_docs_manage', 'RH — gerir docs privados', 230),
  ('rh_contracts_view', 'RH — ver contratos', 231),
  ('rh_contracts_manage', 'RH — gerir contratos', 232)
) AS v(slug, name, ord)
WHERE NOT EXISTS (SELECT 1 FROM "Module" m WHERE m."slug" = v.slug);

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT DISTINCT ON (m.id, mr.role)
  gen_random_uuid()::text,
  m.id,
  mr.role,
  true
FROM "Module" m
JOIN "Module" adm ON adm."slug" = 'adm_rh'
JOIN "ModuleRole" mr ON mr."moduleId" = adm.id AND mr."canAccess" = true
WHERE m."slug" IN (
  'rh_view',
  'rh_manage',
  'rh_hiring_view',
  'rh_hiring_manage',
  'rh_compensation_view',
  'rh_compensation_manage',
  'rh_bank_view',
  'rh_bank_manage',
  'rh_private_docs_view',
  'rh_private_docs_manage',
  'rh_contracts_view',
  'rh_contracts_manage'
)
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = mr.role
)
ORDER BY m.id, mr.role;

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT gen_random_uuid()::text, m.id, r.role, true
FROM "Module" m
CROSS JOIN (VALUES ('super_admin'), ('company_admin'), ('editor')) AS r(role)
WHERE m."slug" IN (
  'rh_view',
  'rh_manage',
  'rh_hiring_view',
  'rh_hiring_manage',
  'rh_compensation_view',
  'rh_compensation_manage',
  'rh_bank_view',
  'rh_bank_manage',
  'rh_private_docs_view',
  'rh_private_docs_manage',
  'rh_contracts_view',
  'rh_contracts_manage'
)
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = r.role
);
