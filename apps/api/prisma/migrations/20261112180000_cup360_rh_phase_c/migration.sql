-- PROMPT 054 — CUP360 RH Phase C (additive, após phase_b)

CREATE TABLE IF NOT EXISTS "RhAthletePayrollImpact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employmentId" TEXT,
    "playerNegotiationId" TEXT NOT NULL,
    "impactType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "contractualSalary" DECIMAL(14,2),
    "ourPercentage" DECIMAL(6,2),
    "otherPercentage" DECIMAL(6,2),
    "ourPayrollAmount" DECIMAL(14,2),
    "effectiveFrom" DATE,
    "effectiveUntil" DATE,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhAthletePayrollImpact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhAthleteHrPendingAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employmentId" TEXT,
    "playerNegotiationId" TEXT,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" TEXT,
    "acknowledgedByName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhAthleteHrPendingAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhAthleteSalaryResponsibility" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "playerNegotiationId" TEXT,
    "mode" TEXT NOT NULL,
    "ourPercentage" DECIMAL(6,2),
    "otherPercentage" DECIMAL(6,2),
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "notes" TEXT,
    "documentRef" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhAthleteSalaryResponsibility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhAthleteSalaryResponsibilityHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "responsibilityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhAthleteSalaryResponsibilityHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhAthleteMovementNotificationDedup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "playerNegotiationId" TEXT,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhAthleteMovementNotificationDedup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhEpiCatalogItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validityNotes" TEXT,
    "replacementInfo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhEpiCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhEpiRequirementGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "departmentId" TEXT,
    "jobRoleId" TEXT,
    "workCategory" TEXT,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhEpiRequirementGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhEpiRequirementItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4),
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhEpiRequirementItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhEpiDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employmentId" TEXT,
    "catalogItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENTREGUE',
    "deliveredByUserId" TEXT,
    "deliveredByName" TEXT,
    "conditionNotes" TEXT,
    "expectedReturnAt" TIMESTAMP(3),
    "notes" TEXT,
    "receiptFileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhEpiDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhEpiAcknowledgement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "acknowledgedAt" TIMESTAMP(3),
    "method" TEXT,
    "signedFileKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhEpiAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayslipBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "bulkFileKey" TEXT NOT NULL,
    "bulkFileName" TEXT NOT NULL,
    "pageCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE_DE_SEPARACAO',
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhPayslipBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayslipPageAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employmentId" TEXT,
    "pageFrom" INTEGER NOT NULL,
    "pageTo" INTEGER NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhPayslipPageAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayslipIndividual" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "employeeId" TEXT NOT NULL,
    "employmentId" TEXT,
    "referenceMonth" DATE NOT NULL,
    "extractedFileKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SEPARADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhPayslipIndividual_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayslipAcknowledgement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CIENCIA_PENDENTE',
    "acknowledgedAt" TIMESTAMP(3),
    "method" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RhPayslipAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RhPayrollDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollClosingId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RhPayrollDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RhAthleteMovementNotificationDedup_tenantId_dedupKey_key" ON "RhAthleteMovementNotificationDedup"("tenantId", "dedupKey");
CREATE UNIQUE INDEX IF NOT EXISTS "RhEpiCatalogItem_tenantId_code_key" ON "RhEpiCatalogItem"("tenantId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "RhPayslipIndividual_assignmentId_key" ON "RhPayslipIndividual"("assignmentId");

CREATE INDEX IF NOT EXISTS "RhAthletePayrollImpact_tenantId_playerId_idx" ON "RhAthletePayrollImpact"("tenantId", "playerId");
CREATE INDEX IF NOT EXISTS "RhAthleteHrPendingAction_tenantId_status_idx" ON "RhAthleteHrPendingAction"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "RhPayslipBatch_tenantId_referenceMonth_idx" ON "RhPayslipBatch"("tenantId", "referenceMonth");
CREATE INDEX IF NOT EXISTS "RhPayrollDocument_payrollClosingId_idx" ON "RhPayrollDocument"("payrollClosingId");

ALTER TABLE "RhAthletePayrollImpact" ADD CONSTRAINT "RhAthletePayrollImpact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhAthletePayrollImpact" ADD CONSTRAINT "RhAthletePayrollImpact_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhAthletePayrollImpact" ADD CONSTRAINT "RhAthletePayrollImpact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RhAthletePayrollImpact" ADD CONSTRAINT "RhAthletePayrollImpact_playerNegotiationId_fkey" FOREIGN KEY ("playerNegotiationId") REFERENCES "PlayerNegotiation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RhAthleteHrPendingAction" ADD CONSTRAINT "RhAthleteHrPendingAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhAthleteHrPendingAction" ADD CONSTRAINT "RhAthleteHrPendingAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhAthleteHrPendingAction" ADD CONSTRAINT "RhAthleteHrPendingAction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RhAthleteHrPendingAction" ADD CONSTRAINT "RhAthleteHrPendingAction_playerNegotiationId_fkey" FOREIGN KEY ("playerNegotiationId") REFERENCES "PlayerNegotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RhAthleteSalaryResponsibility" ADD CONSTRAINT "RhAthleteSalaryResponsibility_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhAthleteSalaryResponsibility" ADD CONSTRAINT "RhAthleteSalaryResponsibility_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhAthleteSalaryResponsibility" ADD CONSTRAINT "RhAthleteSalaryResponsibility_playerNegotiationId_fkey" FOREIGN KEY ("playerNegotiationId") REFERENCES "PlayerNegotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RhAthleteSalaryResponsibilityHistory" ADD CONSTRAINT "RhAthleteSalaryResponsibilityHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhAthleteSalaryResponsibilityHistory" ADD CONSTRAINT "RhAthleteSalaryResponsibilityHistory_responsibilityId_fkey" FOREIGN KEY ("responsibilityId") REFERENCES "RhAthleteSalaryResponsibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RhAthleteMovementNotificationDedup" ADD CONSTRAINT "RhAthleteMovementNotificationDedup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RhEpiCatalogItem" ADD CONSTRAINT "RhEpiCatalogItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhEpiRequirementGroup" ADD CONSTRAINT "RhEpiRequirementGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhEpiRequirementGroup" ADD CONSTRAINT "RhEpiRequirementGroup_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RhEpiRequirementGroup" ADD CONSTRAINT "RhEpiRequirementGroup_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RhEpiRequirementItem" ADD CONSTRAINT "RhEpiRequirementItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhEpiRequirementItem" ADD CONSTRAINT "RhEpiRequirementItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RhEpiRequirementGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhEpiRequirementItem" ADD CONSTRAINT "RhEpiRequirementItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "RhEpiCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RhEpiDelivery" ADD CONSTRAINT "RhEpiDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhEpiDelivery" ADD CONSTRAINT "RhEpiDelivery_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhEpiDelivery" ADD CONSTRAINT "RhEpiDelivery_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RhEpiDelivery" ADD CONSTRAINT "RhEpiDelivery_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "RhEpiCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RhEpiAcknowledgement" ADD CONSTRAINT "RhEpiAcknowledgement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhEpiAcknowledgement" ADD CONSTRAINT "RhEpiAcknowledgement_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "RhEpiDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RhPayslipBatch" ADD CONSTRAINT "RhPayslipBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayslipPageAssignment" ADD CONSTRAINT "RhPayslipPageAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayslipPageAssignment" ADD CONSTRAINT "RhPayslipPageAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RhPayslipBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayslipPageAssignment" ADD CONSTRAINT "RhPayslipPageAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayslipIndividual" ADD CONSTRAINT "RhPayslipIndividual_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayslipIndividual" ADD CONSTRAINT "RhPayslipIndividual_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RhPayslipBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayslipIndividual" ADD CONSTRAINT "RhPayslipIndividual_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "RhPayslipPageAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RhPayslipIndividual" ADD CONSTRAINT "RhPayslipIndividual_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayslipIndividual" ADD CONSTRAINT "RhPayslipIndividual_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RhPayslipAcknowledgement" ADD CONSTRAINT "RhPayslipAcknowledgement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayslipAcknowledgement" ADD CONSTRAINT "RhPayslipAcknowledgement_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "RhPayslipIndividual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RhPayrollDocument" ADD CONSTRAINT "RhPayrollDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RhPayrollDocument" ADD CONSTRAINT "RhPayrollDocument_payrollClosingId_fkey" FOREIGN KEY ("payrollClosingId") REFERENCES "RhPayrollClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT gen_random_uuid()::text, v.slug, v.name, v.ord, 'adm_departamentos', NULL
FROM (VALUES
  ('rh_athlete_payroll', 'RH — impacto folha atleta', 242),
  ('rh_epi_catalog', 'RH — catálogo EPI', 243),
  ('rh_epi_manage', 'RH — gerir EPI', 244),
  ('rh_epi_view', 'RH — ver EPI', 245),
  ('rh_epi_delivery', 'RH — entrega EPI', 246),
  ('rh_payslip_batch', 'RH — lote contracheque', 247),
  ('rh_payslip_individual', 'RH — contracheque individual', 248),
  ('rh_payslip_ack', 'RH — ciência contracheque', 249)
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
  'rh_athlete_payroll','rh_epi_catalog','rh_epi_manage','rh_epi_view',
  'rh_epi_delivery','rh_payslip_batch','rh_payslip_individual','rh_payslip_ack'
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
  'rh_athlete_payroll','rh_epi_catalog','rh_epi_manage','rh_epi_view',
  'rh_epi_delivery','rh_payslip_batch','rh_payslip_individual','rh_payslip_ack'
)
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = r.role
);
