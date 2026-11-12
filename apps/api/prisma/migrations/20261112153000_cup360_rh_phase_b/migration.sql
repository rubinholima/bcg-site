-- PROMPT 053 — CUP360 RH Phase B (additive)

-- EmploymentContract — assinatura x arquivo
ALTER TABLE "EmploymentContract" ADD COLUMN IF NOT EXISTS "signatureProviderStatus" TEXT;
ALTER TABLE "EmploymentContract" ADD COLUMN IF NOT EXISTS "signatureCompletedAt" TIMESTAMP(3);
ALTER TABLE "EmploymentContract" ADD COLUMN IF NOT EXISTS "signedFileArchivedAt" TIMESTAMP(3);
ALTER TABLE "EmploymentContract" ADD COLUMN IF NOT EXISTS "signedFileArchiveError" TEXT;

-- Benefícios configuráveis
CREATE TABLE IF NOT EXISTS "RhBenefitCatalog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhBenefitCatalog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmploymentCompensationItem" ADD COLUMN IF NOT EXISTS "benefitCatalogId" TEXT;

CREATE TABLE IF NOT EXISTS "RhHiringDocumentChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hiringRequestId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "employeeDocumentId" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhHiringDocumentChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhHiringAccountingHandoffHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hiringRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "sentByUserId" TEXT,
    "sentByName" TEXT,
    "sentAt" TIMESTAMP(3),
    "recipient" TEXT,
    "notes" TEXT,
    "documentIds" JSONB,
    "receivedByUserId" TEXT,
    "receivedByName" TEXT,
    "receivedAt" TIMESTAMP(3),
    "status" TEXT,
    "correctionRequired" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhHiringAccountingHandoffHistory_pkey" PRIMARY KEY ("id")
);

-- Folha de pagamento
CREATE TABLE IF NOT EXISTS "RhPayrollClosing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'em_preparacao',
    "responsibleUserId" TEXT,
    "responsibleName" TEXT,
    "financeLancamentoId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhPayrollClosing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayrollStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollClosingId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "notes" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhPayrollStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayrollEmployeeSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollClosingId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhPayrollEmployeeSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayrollAdjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollClosingId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "quantity" DECIMAL(12,4),
    "hours" DECIMAL(12,4),
    "days" DECIMAL(12,4),
    "amount" DECIMAL(14,2),
    "reason" TEXT,
    "notes" TEXT,
    "fileKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'registrado',
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhPayrollAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayrollAccountingPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollClosingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "packageData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhPayrollAccountingPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayrollAccountingPackageHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollClosingId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "sentByUserId" TEXT,
    "sentByName" TEXT,
    "sentAt" TIMESTAMP(3),
    "recipient" TEXT,
    "notes" TEXT,
    "documentIds" JSONB,
    "receivedAt" TIMESTAMP(3),
    "receivedByUserId" TEXT,
    "receivedByName" TEXT,
    "correctionRequired" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhPayrollAccountingPackageHistory_pkey" PRIMARY KEY ("id")
);

-- Ponto / banco de horas
CREATE TABLE IF NOT EXISTS "RhWorkRegime" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhWorkRegime_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhEmploymentWorkRegime" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "workRegimeId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhEmploymentWorkRegime_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhTimeOccurrence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "occurrenceType" TEXT NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "hours" DECIMAL(12,4),
    "days" DECIMAL(12,4),
    "reason" TEXT,
    "notes" TEXT,
    "fileKey" TEXT,
    "treatment" TEXT,
    "processedAt" TIMESTAMP(3),
    "timeBankMovementId" TEXT,
    "payrollAdjustmentId" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhTimeOccurrence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhTimeBankMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "movementDate" DATE NOT NULL,
    "hours" DECIMAL(12,4) NOT NULL,
    "origin" TEXT,
    "reason" TEXT,
    "timeOccurrenceId" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhTimeBankMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhTimeClockBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recebido',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhTimeClockBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhTimeClockBatchEmployee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employmentId" TEXT,
    "employeeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhTimeClockBatchEmployee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RhBenefitCatalog_tenantId_code_key" ON "RhBenefitCatalog"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "RhBenefitCatalog_tenantId_idx" ON "RhBenefitCatalog"("tenantId");

CREATE INDEX IF NOT EXISTS "RhHiringDocumentChecklistItem_hiringRequestId_idx" ON "RhHiringDocumentChecklistItem"("hiringRequestId");
CREATE INDEX IF NOT EXISTS "RhHiringDocumentChecklistItem_tenantId_idx" ON "RhHiringDocumentChecklistItem"("tenantId");

CREATE INDEX IF NOT EXISTS "RhHiringAccountingHandoffHistory_hiringRequestId_idx" ON "RhHiringAccountingHandoffHistory"("hiringRequestId");
CREATE INDEX IF NOT EXISTS "RhHiringAccountingHandoffHistory_tenantId_idx" ON "RhHiringAccountingHandoffHistory"("tenantId");

CREATE INDEX IF NOT EXISTS "EmploymentCompensationItem_benefitCatalogId_idx" ON "EmploymentCompensationItem"("benefitCatalogId");

CREATE UNIQUE INDEX IF NOT EXISTS "RhPayrollClosing_tenantId_referenceMonth_key" ON "RhPayrollClosing"("tenantId", "referenceMonth");
CREATE INDEX IF NOT EXISTS "RhPayrollClosing_tenantId_status_idx" ON "RhPayrollClosing"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "RhPayrollStatusHistory_payrollClosingId_idx" ON "RhPayrollStatusHistory"("payrollClosingId");
CREATE UNIQUE INDEX IF NOT EXISTS "RhPayrollEmployeeSnapshot_payrollClosingId_employmentId_key" ON "RhPayrollEmployeeSnapshot"("payrollClosingId", "employmentId");
CREATE INDEX IF NOT EXISTS "RhPayrollAdjustment_payrollClosingId_idx" ON "RhPayrollAdjustment"("payrollClosingId");
CREATE UNIQUE INDEX IF NOT EXISTS "RhPayrollAccountingPackage_payrollClosingId_key" ON "RhPayrollAccountingPackage"("payrollClosingId");
CREATE INDEX IF NOT EXISTS "RhPayrollAccountingPackageHistory_payrollClosingId_idx" ON "RhPayrollAccountingPackageHistory"("payrollClosingId");

CREATE UNIQUE INDEX IF NOT EXISTS "RhWorkRegime_tenantId_code_key" ON "RhWorkRegime"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "RhEmploymentWorkRegime_employmentId_idx" ON "RhEmploymentWorkRegime"("employmentId");

CREATE INDEX IF NOT EXISTS "RhTimeOccurrence_employmentId_idx" ON "RhTimeOccurrence"("employmentId", "occurrenceDate");
CREATE INDEX IF NOT EXISTS "RhTimeBankMovement_employmentId_idx" ON "RhTimeBankMovement"("employmentId", "movementDate");
CREATE INDEX IF NOT EXISTS "RhTimeClockBatch_tenantId_referenceMonth_idx" ON "RhTimeClockBatch"("tenantId", "referenceMonth");
CREATE INDEX IF NOT EXISTS "RhTimeClockBatchEmployee_batchId_idx" ON "RhTimeClockBatchEmployee"("batchId");

DO $$ BEGIN
 ALTER TABLE "RhBenefitCatalog" ADD CONSTRAINT "RhBenefitCatalog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "EmploymentCompensationItem" ADD CONSTRAINT "EmploymentCompensationItem_benefitCatalogId_fkey" FOREIGN KEY ("benefitCatalogId") REFERENCES "RhBenefitCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringDocumentChecklistItem" ADD CONSTRAINT "RhHiringDocumentChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringDocumentChecklistItem" ADD CONSTRAINT "RhHiringDocumentChecklistItem_hiringRequestId_fkey" FOREIGN KEY ("hiringRequestId") REFERENCES "RhHiringRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringAccountingHandoffHistory" ADD CONSTRAINT "RhHiringAccountingHandoffHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhHiringAccountingHandoffHistory" ADD CONSTRAINT "RhHiringAccountingHandoffHistory_hiringRequestId_fkey" FOREIGN KEY ("hiringRequestId") REFERENCES "RhHiringRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollClosing" ADD CONSTRAINT "RhPayrollClosing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollStatusHistory" ADD CONSTRAINT "RhPayrollStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollStatusHistory" ADD CONSTRAINT "RhPayrollStatusHistory_payrollClosingId_fkey" FOREIGN KEY ("payrollClosingId") REFERENCES "RhPayrollClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollEmployeeSnapshot" ADD CONSTRAINT "RhPayrollEmployeeSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollEmployeeSnapshot" ADD CONSTRAINT "RhPayrollEmployeeSnapshot_payrollClosingId_fkey" FOREIGN KEY ("payrollClosingId") REFERENCES "RhPayrollClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollEmployeeSnapshot" ADD CONSTRAINT "RhPayrollEmployeeSnapshot_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollEmployeeSnapshot" ADD CONSTRAINT "RhPayrollEmployeeSnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollAdjustment" ADD CONSTRAINT "RhPayrollAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollAdjustment" ADD CONSTRAINT "RhPayrollAdjustment_payrollClosingId_fkey" FOREIGN KEY ("payrollClosingId") REFERENCES "RhPayrollClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollAdjustment" ADD CONSTRAINT "RhPayrollAdjustment_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollAccountingPackage" ADD CONSTRAINT "RhPayrollAccountingPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollAccountingPackage" ADD CONSTRAINT "RhPayrollAccountingPackage_payrollClosingId_fkey" FOREIGN KEY ("payrollClosingId") REFERENCES "RhPayrollClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollAccountingPackageHistory" ADD CONSTRAINT "RhPayrollAccountingPackageHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollAccountingPackageHistory" ADD CONSTRAINT "RhPayrollAccountingPackageHistory_payrollClosingId_fkey" FOREIGN KEY ("payrollClosingId") REFERENCES "RhPayrollClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhPayrollAccountingPackageHistory" ADD CONSTRAINT "RhPayrollAccountingPackageHistory_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "RhPayrollAccountingPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhWorkRegime" ADD CONSTRAINT "RhWorkRegime_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhEmploymentWorkRegime" ADD CONSTRAINT "RhEmploymentWorkRegime_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhEmploymentWorkRegime" ADD CONSTRAINT "RhEmploymentWorkRegime_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhEmploymentWorkRegime" ADD CONSTRAINT "RhEmploymentWorkRegime_workRegimeId_fkey" FOREIGN KEY ("workRegimeId") REFERENCES "RhWorkRegime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhTimeOccurrence" ADD CONSTRAINT "RhTimeOccurrence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhTimeOccurrence" ADD CONSTRAINT "RhTimeOccurrence_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhTimeBankMovement" ADD CONSTRAINT "RhTimeBankMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhTimeBankMovement" ADD CONSTRAINT "RhTimeBankMovement_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhTimeClockBatch" ADD CONSTRAINT "RhTimeClockBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhTimeClockBatchEmployee" ADD CONSTRAINT "RhTimeClockBatchEmployee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "RhTimeClockBatchEmployee" ADD CONSTRAINT "RhTimeClockBatchEmployee_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RhTimeClockBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Normaliza status legados de contratação (CLT)
UPDATE "RhHiringRequest" SET status = 'solicitacao_recebida' WHERE status = 'enviado';
UPDATE "RhHiringRequest" SET status = 'docs_conferencia' WHERE status = 'analise_rh';
UPDATE "RhHiringRequest" SET status = 'docs_pendentes' WHERE status = 'documentacao_pendente';
UPDATE "RhHiringRequest" SET status = 'exame_pendente' WHERE status IN ('exame_agendado') AND "contractType" ILIKE 'CLT' AND id NOT IN (SELECT "hiringRequestId" FROM "RhHiringMedicalExam" WHERE "scheduledAt" IS NOT NULL);
UPDATE "RhHiringRequest" SET status = 'exame_realizado' WHERE status = 'exame_concluido';
UPDATE "RhHiringRequest" SET status = 'pronto_contabilidade' WHERE status = 'juridico' AND "contractType" ILIKE 'CLT';
UPDATE "RhHiringRequest" SET status = 'enviado_contabilidade' WHERE status = 'contabilidade';
UPDATE "RhHiringRequest" SET status = 'pronto_admissao' WHERE status = 'contrato_pendente';
UPDATE "RhHiringRequest" SET status = 'concluido' WHERE status = 'admitido';

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT gen_random_uuid()::text, v.slug, v.name, v.ord, 'adm_departamentos', NULL
FROM (VALUES
  ('rh_payroll_view', 'RH — ver folha', 233),
  ('rh_payroll_manage', 'RH — gerir folha', 234),
  ('rh_payroll_sensitive', 'RH — valores sensíveis folha', 235),
  ('rh_time_view', 'RH — ver ponto/ocorrências', 236),
  ('rh_time_manage', 'RH — gerir ponto/ocorrências', 237),
  ('rh_time_bank_view', 'RH — ver banco de horas', 238),
  ('rh_time_bank_manage', 'RH — gerir banco de horas', 239),
  ('rh_work_regime_manage', 'RH — jornadas', 240),
  ('rh_time_clock_docs', 'RH — espelhos PDF ponto', 241)
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
  'rh_payroll_view','rh_payroll_manage','rh_payroll_sensitive',
  'rh_time_view','rh_time_manage','rh_time_bank_view','rh_time_bank_manage',
  'rh_work_regime_manage','rh_time_clock_docs'
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
  'rh_payroll_view','rh_payroll_manage','rh_payroll_sensitive',
  'rh_time_view','rh_time_manage','rh_time_bank_view','rh_time_bank_manage',
  'rh_work_regime_manage','rh_time_clock_docs'
)
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = r.role
);
