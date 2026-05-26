-- Fluxo de compras: cotações, aprovações, recebimento, TI, requisições

ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "requestedByUserId" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "requestType" TEXT NOT NULL DEFAULT 'compra';
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "departmentName" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "approvedTotal" DOUBLE PRECISION;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "selectedQuoteId" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "isPatrimonial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "requesterEmail" TEXT;

UPDATE "PurchaseRequisition" SET "status" = 'rascunho' WHERE "status" = 'draft';
UPDATE "PurchaseRequisition" SET "status" = 'enviada' WHERE "status" = 'sent';
UPDATE "PurchaseRequisition" SET "status" = 'em_cotacao' WHERE "status" = 'quotation';
UPDATE "PurchaseRequisition" SET "status" = 'aprovada' WHERE "status" = 'approved';
UPDATE "PurchaseRequisition" SET "status" = 'reprovada' WHERE "status" = 'rejected';
UPDATE "PurchaseRequisition" SET "status" = 'em_compra' WHERE "status" = 'ordered';
UPDATE "PurchaseRequisition" SET "status" = 'recebida_compras' WHERE "status" = 'received';

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "purchaseRequisitionId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;

CREATE TABLE IF NOT EXISTS "PurchaseQuote" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "deliveryDays" INTEGER,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseApproval" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "approverUserId" TEXT,
    "approverName" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvalThresholdBrl" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "minQuotes" INTEGER NOT NULL DEFAULT 2,
    "maxQuotes" INTEGER NOT NULL DEFAULT 4,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedByName" TEXT,
    "signerEmail" TEXT,
    "signerName" TEXT,
    "helloSignRequestId" TEXT,
    "signatureStatus" TEXT NOT NULL DEFAULT 'pending',
    "signedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TiSupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "requestedByName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "assignedToName" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TiSupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseRequisition_selectedQuoteId_key" ON "PurchaseRequisition"("selectedQuoteId");
CREATE INDEX IF NOT EXISTS "PurchaseRequisition_requestedByUserId_idx" ON "PurchaseRequisition"("requestedByUserId");
CREATE INDEX IF NOT EXISTS "PurchaseRequisition_requestType_idx" ON "PurchaseRequisition"("requestType");
CREATE INDEX IF NOT EXISTS "PurchaseQuote_requisitionId_idx" ON "PurchaseQuote"("requisitionId");
CREATE INDEX IF NOT EXISTS "PurchaseQuote_supplierId_idx" ON "PurchaseQuote"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseApproval_requisitionId_idx" ON "PurchaseApproval"("requisitionId");
CREATE INDEX IF NOT EXISTS "PurchaseApproval_role_idx" ON "PurchaseApproval"("role");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseSetting_tenantId_key" ON "PurchaseSetting"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseReceipt_requisitionId_key" ON "PurchaseReceipt"("requisitionId");
CREATE INDEX IF NOT EXISTS "TiSupportTicket_tenantId_idx" ON "TiSupportTicket"("tenantId");
CREATE INDEX IF NOT EXISTS "TiSupportTicket_status_idx" ON "TiSupportTicket"("status");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_quoteId_idx" ON "PurchaseOrder"("quoteId");

ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_selectedQuoteId_fkey" FOREIGN KEY ("selectedQuoteId") REFERENCES "PurchaseQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseQuote" ADD CONSTRAINT "PurchaseQuote_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseQuote" ADD CONSTRAINT "PurchaseQuote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseApproval" ADD CONSTRAINT "PurchaseApproval_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseSetting" ADD CONSTRAINT "PurchaseSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TiSupportTicket" ADD CONSTRAINT "TiSupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PurchaseQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_purchaseRequisitionId_fkey" FOREIGN KEY ("purchaseRequisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Módulos requisições e TI
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-requisicoes', 'requisicoes', 'Minhas requisições', 22
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'requisicoes');

INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-adm-ti', 'adm_ti', 'TI — Atendimento', 23
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'adm_ti');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-sa', m."id", 'super_admin', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-ca', m."id", 'company_admin', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-ed', m."id", 'editor', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'editor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-ge', m."id", 'gerente', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'gerente');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-ad', m."id", 'administrativo', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'administrativo');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-di', m."id", 'diretoria', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'diretoria');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ti-sa', m."id", 'super_admin', true FROM "Module" m WHERE m."slug" = 'adm_ti'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ti-ca', m."id", 'company_admin', true FROM "Module" m WHERE m."slug" = 'adm_ti'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ti-ed', m."id", 'editor', true FROM "Module" m WHERE m."slug" = 'adm_ti'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'editor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ti-ge', m."id", 'gerente', true FROM "Module" m WHERE m."slug" = 'adm_ti'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'gerente');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ti-ad', m."id", 'administrativo', true FROM "Module" m WHERE m."slug" = 'adm_ti'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'administrativo');
