-- CUP360 Finance Phase 1 — contas, categorias, AP/AR operacional, permissões granulares, folha paymentDueDate

ALTER TABLE "RhPayrollClosing" ADD COLUMN IF NOT EXISTS "paymentDueDate" DATE;

ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "recordOrigin" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "transactionKind" TEXT NOT NULL DEFAULT 'operating_expense';
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "transferPairId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "financeAccountId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "financeAccountSettledId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "financeCategoryId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "financePaymentMethodId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "documentType" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "issueDate" DATE;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "competenceDate" DATE;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "scheduledPaymentDate" DATE;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(14,2);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "interestAmount" DECIMAL(14,2);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "penaltyAmount" DECIMAL(14,2);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(14,2);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "abatementAmount" DECIMAL(14,2);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "otherAdjustmentAmount" DECIMAL(14,2);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "settlementAmount" DECIMAL(14,2);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "boletoBarcode" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "boletoDigitableLine" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "boletoDocumentId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "approvedByUserId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "paymentAuthorizedAt" TIMESTAMP(3);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "paymentAuthorizedByUserId" TEXT;

CREATE TABLE IF NOT EXISTS "FinanceAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "institution" TEXT,
    "agency" TEXT,
    "accountRef" TEXT,
    "externalRef" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinancePaymentMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semanticKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancePaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupplierPaymentDestination" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "label" TEXT,
    "destType" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAgency" TEXT,
    "bankAccount" TEXT,
    "bankAccountType" TEXT,
    "pixKeyType" TEXT,
    "pixKey" TEXT,
    "holderName" TEXT,
    "holderTaxId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierPaymentDestination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceExternalLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalObjectType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "financeiroLancamentoId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceExternalLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinancePaymentDelegation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "grantedToUserId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancePaymentDelegation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceAuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financeiroLancamentoId" TEXT,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceTransferLeg" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transferGroupId" TEXT NOT NULL,
    "sourceAccountId" TEXT NOT NULL,
    "destAccountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "transferDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceTransferLeg_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinanceExternalLink_tenantId_provider_externalObjectType_externalId_key"
ON "FinanceExternalLink"("tenantId", "provider", "externalObjectType", "externalId");

CREATE INDEX IF NOT EXISTS "FinanceAccount_tenantId_active_idx" ON "FinanceAccount"("tenantId", "active");
CREATE INDEX IF NOT EXISTS "FinanceAccount_tenantId_accountType_idx" ON "FinanceAccount"("tenantId", "accountType");
CREATE INDEX IF NOT EXISTS "FinanceCategory_tenantId_active_idx" ON "FinanceCategory"("tenantId", "active");
CREATE INDEX IF NOT EXISTS "FinanceCategory_tenantId_parentId_idx" ON "FinanceCategory"("tenantId", "parentId");
CREATE INDEX IF NOT EXISTS "FinancePaymentMethod_tenantId_active_idx" ON "FinancePaymentMethod"("tenantId", "active");
CREATE INDEX IF NOT EXISTS "SupplierPaymentDestination_tenantId_supplierId_idx" ON "SupplierPaymentDestination"("tenantId", "supplierId");
CREATE INDEX IF NOT EXISTS "FinancePaymentDelegation_tenantId_grantedToUserId_capability_idx" ON "FinancePaymentDelegation"("tenantId", "grantedToUserId", "capability");
CREATE INDEX IF NOT EXISTS "FinanceAuditEvent_tenantId_createdAt_idx" ON "FinanceAuditEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "FinanceiroLancamento_tenantId_recordOrigin_idx" ON "FinanceiroLancamento"("tenantId", "recordOrigin");
CREATE INDEX IF NOT EXISTS "FinanceiroLancamento_tenantId_financeAccountId_idx" ON "FinanceiroLancamento"("tenantId", "financeAccountId");
CREATE INDEX IF NOT EXISTS "FinanceiroLancamento_tenantId_financeCategoryId_idx" ON "FinanceiroLancamento"("tenantId", "financeCategoryId");
CREATE INDEX IF NOT EXISTS "FinanceiroLancamento_tenantId_transactionKind_idx" ON "FinanceiroLancamento"("tenantId", "transactionKind");
CREATE INDEX IF NOT EXISTS "FinanceiroLancamento_employeeId_idx" ON "FinanceiroLancamento"("employeeId");

DO $$ BEGIN
 ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinancePaymentMethod" ADD CONSTRAINT "FinancePaymentMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "SupplierPaymentDestination" ADD CONSTRAINT "SupplierPaymentDestination_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "SupplierPaymentDestination" ADD CONSTRAINT "SupplierPaymentDestination_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceExternalLink" ADD CONSTRAINT "FinanceExternalLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceExternalLink" ADD CONSTRAINT "FinanceExternalLink_financeiroLancamentoId_fkey" FOREIGN KEY ("financeiroLancamentoId") REFERENCES "FinanceiroLancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinancePaymentDelegation" ADD CONSTRAINT "FinancePaymentDelegation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceAuditEvent" ADD CONSTRAINT "FinanceAuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceAuditEvent" ADD CONSTRAINT "FinanceAuditEvent_financeiroLancamentoId_fkey" FOREIGN KEY ("financeiroLancamentoId") REFERENCES "FinanceiroLancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceTransferLeg" ADD CONSTRAINT "FinanceTransferLeg_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceTransferLeg" ADD CONSTRAINT "FinanceTransferLeg_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceTransferLeg" ADD CONSTRAINT "FinanceTransferLeg_destAccountId_fkey" FOREIGN KEY ("destAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_financeAccountSettledId_fkey" FOREIGN KEY ("financeAccountSettledId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_financeCategoryId_fkey" FOREIGN KEY ("financeCategoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_financePaymentMethodId_fkey" FOREIGN KEY ("financePaymentMethodId") REFERENCES "FinancePaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Módulos granulares Finance (adm_financeiro mantém compatibilidade)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT gen_random_uuid()::text, v.slug, v.name, v.ord, 'adm_departamentos', NULL
FROM (VALUES
  ('finance_view', 'Financeiro — visualizar', 300),
  ('finance_create', 'Financeiro — criar lançamentos', 301),
  ('finance_edit', 'Financeiro — editar lançamentos', 302),
  ('finance_approve', 'Financeiro — aprovar pagamentos', 303),
  ('finance_pay', 'Financeiro — registrar pagamento', 304),
  ('finance_manual_settlement', 'Financeiro — baixa manual', 305),
  ('finance_payment_account_override', 'Financeiro — alterar conta de pagamento', 306),
  ('finance_accounts_manage', 'Financeiro — contas financeiras', 307),
  ('finance_categories_manage', 'Financeiro — categorias', 308),
  ('finance_payment_methods_manage', 'Financeiro — formas de pagamento', 309),
  ('finance_bank_data_view', 'Financeiro — ver dados bancários', 310),
  ('finance_bank_data_manage', 'Financeiro — gerir dados bancários', 311),
  ('finance_reports_view', 'Financeiro — relatórios', 312),
  ('finance_reports_export', 'Financeiro — exportar relatórios', 313)
) AS v(slug, name, ord)
WHERE NOT EXISTS (SELECT 1 FROM "Module" m WHERE m."slug" = v.slug);

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT DISTINCT ON (m.id, mr.role)
  gen_random_uuid()::text,
  m.id,
  mr.role,
  true
FROM "Module" m
JOIN "Module" adm ON adm."slug" = 'adm_financeiro'
JOIN "ModuleRole" mr ON mr."moduleId" = adm.id AND mr."canAccess" = true
WHERE m."slug" IN (
  'finance_view','finance_create','finance_edit','finance_approve','finance_pay',
  'finance_manual_settlement','finance_payment_account_override',
  'finance_accounts_manage','finance_categories_manage','finance_payment_methods_manage',
  'finance_bank_data_view','finance_bank_data_manage','finance_reports_view','finance_reports_export'
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
  'finance_view','finance_create','finance_edit','finance_approve','finance_pay',
  'finance_manual_settlement','finance_payment_account_override',
  'finance_accounts_manage','finance_categories_manage','finance_payment_methods_manage',
  'finance_bank_data_view','finance_bank_data_manage','finance_reports_view','finance_reports_export'
)
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = r.role
);
