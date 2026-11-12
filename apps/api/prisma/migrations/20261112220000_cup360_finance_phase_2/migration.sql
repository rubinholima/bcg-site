-- CUP360 Finance Phase 2 — liquidação estruturada, rateio, parcelas, documentos, desconto em folha, transferências, cartão

ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "installmentGroupId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "installmentNumber" INTEGER;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "installmentCount" INTEGER;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "amountSettledTotal" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "reconciliationStatus" TEXT NOT NULL DEFAULT 'not_reconciled';
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "reconciledAt" TIMESTAMP(3);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "reconciledByUserId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "reconciliationNotes" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "payrollDeductionStatus" TEXT NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS "FinanceInstallmentGroup" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "reference" TEXT,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "installmentCount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "tipo" TEXT NOT NULL,
  "employeeId" TEXT,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceInstallmentGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceSettlement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeiroLancamentoId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "settledAt" TIMESTAMP(3) NOT NULL,
  "amountSettled" DECIMAL(14,2) NOT NULL,
  "interestAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "penaltyAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "abatementAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "otherAdjustmentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "finalAmount" DECIMAL(14,2) NOT NULL,
  "financePaymentMethodId" TEXT,
  "plannedFinanceAccountId" TEXT,
  "actualFinanceAccountId" TEXT NOT NULL,
  "manualSettlement" BOOLEAN NOT NULL DEFAULT false,
  "manualReason" TEXT,
  "accountOverride" BOOLEAN NOT NULL DEFAULT false,
  "accountOverrideReason" TEXT,
  "delegationId" TEXT,
  "referenceNotes" TEXT,
  "performedByUserId" TEXT,
  "performedByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceSettlementProof" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "fileKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "uploadedByUserId" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceSettlementProof_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceAllocationLine" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeiroLancamentoId" TEXT NOT NULL,
  "financeCategoryId" TEXT,
  "description" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceAllocationLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceLancamentoDocument" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeiroLancamentoId" TEXT NOT NULL,
  "docType" TEXT NOT NULL,
  "fileKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "replacedByDocumentId" TEXT,
  "notes" TEXT,
  "uploadedByUserId" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceLancamentoDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinancePayrollDeductionLink" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeiroLancamentoId" TEXT NOT NULL,
  "employmentId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "competenceMonth" DATE NOT NULL,
  "rhPayrollAdjustmentId" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "idempotencyKey" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancePayrollDeductionLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceInternalTransfer" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "transferGroupId" TEXT NOT NULL,
  "sourceAccountId" TEXT NOT NULL,
  "destAccountId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "transferDate" DATE NOT NULL,
  "description" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceInternalTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceCardStatement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeAccountId" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "dueDate" DATE,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceCardStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceCardStatementItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "statementId" TEXT NOT NULL,
  "financeiroLancamentoId" TEXT,
  "settlementId" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "description" TEXT,
  CONSTRAINT "FinanceCardStatementItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FinanceCardStatementPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "statementId" TEXT NOT NULL,
  "fromFinanceAccountId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "settlementId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceCardStatementPayment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FinanceTransferLeg" ADD COLUMN IF NOT EXISTS "internalTransferId" TEXT;
ALTER TABLE "FinanceTransferLeg" ADD COLUMN IF NOT EXISTS "legSide" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "FinanceSettlement_tenantId_idempotencyKey_key" ON "FinanceSettlement"("tenantId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "FinancePayrollDeductionLink_financeiroLancamentoId_key" ON "FinancePayrollDeductionLink"("financeiroLancamentoId");
CREATE UNIQUE INDEX IF NOT EXISTS "FinancePayrollDeductionLink_rhPayrollAdjustmentId_key" ON "FinancePayrollDeductionLink"("rhPayrollAdjustmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "FinancePayrollDeductionLink_tenantId_idempotencyKey_key" ON "FinancePayrollDeductionLink"("tenantId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceInternalTransfer_transferGroupId_key" ON "FinanceInternalTransfer"("transferGroupId");

-- FKs (idempotent pattern)
DO $$ BEGIN ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_installmentGroupId_fkey" FOREIGN KEY ("installmentGroupId") REFERENCES "FinanceInstallmentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceInstallmentGroup" ADD CONSTRAINT "FinanceInstallmentGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceInstallmentGroup" ADD CONSTRAINT "FinanceInstallmentGroup_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceSettlement" ADD CONSTRAINT "FinanceSettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceSettlement" ADD CONSTRAINT "FinanceSettlement_financeiroLancamentoId_fkey" FOREIGN KEY ("financeiroLancamentoId") REFERENCES "FinanceiroLancamento"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceSettlement" ADD CONSTRAINT "FinanceSettlement_actualFinanceAccountId_fkey" FOREIGN KEY ("actualFinanceAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceSettlement" ADD CONSTRAINT "FinanceSettlement_plannedFinanceAccountId_fkey" FOREIGN KEY ("plannedFinanceAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceSettlement" ADD CONSTRAINT "FinanceSettlement_financePaymentMethodId_fkey" FOREIGN KEY ("financePaymentMethodId") REFERENCES "FinancePaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceAllocationLine" ADD CONSTRAINT "FinanceAllocationLine_financeiroLancamentoId_fkey" FOREIGN KEY ("financeiroLancamentoId") REFERENCES "FinanceiroLancamento"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinancePayrollDeductionLink" ADD CONSTRAINT "FinancePayrollDeductionLink_financeiroLancamentoId_fkey" FOREIGN KEY ("financeiroLancamentoId") REFERENCES "FinanceiroLancamento"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinancePayrollDeductionLink" ADD CONSTRAINT "FinancePayrollDeductionLink_rhPayrollAdjustmentId_fkey" FOREIGN KEY ("rhPayrollAdjustmentId") REFERENCES "RhPayrollAdjustment"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FinanceTransferLeg" ADD CONSTRAINT "FinanceTransferLeg_internalTransferId_fkey" FOREIGN KEY ("internalTransferId") REFERENCES "FinanceInternalTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
