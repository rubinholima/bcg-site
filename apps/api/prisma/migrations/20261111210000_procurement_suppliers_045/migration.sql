-- PROMPT 045 — fornecedores, categorias, documentos, cotação e auditoria

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "personType" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "tradeName" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "addressStructured" JSONB;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "commercial" JSONB;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "supplierCategoryId" TEXT;

CREATE TABLE IF NOT EXISTS "SupplierCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupplierCategory_tenantId_slug_key" ON "SupplierCategory"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "SupplierCategory_tenantId_active_idx" ON "SupplierCategory"("tenantId", "active");

CREATE TABLE IF NOT EXISTS "SupplierDocument" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mediaKey" TEXT,
    "fileUrl" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupplierDocument_supplierId_idx" ON "SupplierDocument"("supplierId");

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_supplierCategoryId_fkey" FOREIGN KEY ("supplierCategoryId") REFERENCES "SupplierCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierCategory" ADD CONSTRAINT "SupplierCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Supplier_tenantId_status_idx" ON "Supplier"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Supplier_supplierCategoryId_idx" ON "Supplier"("supplierCategoryId");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "preferredSupplierId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastSupplierId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "supplierReference" TEXT;

ALTER TABLE "Product" ADD CONSTRAINT "Product_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_lastSupplierId_fkey" FOREIGN KEY ("lastSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseQuote" ADD COLUMN IF NOT EXISTS "pricingBreakdown" JSONB;
ALTER TABLE "PurchaseQuote" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "PurchaseQuote" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);
ALTER TABLE "PurchaseQuote" ADD COLUMN IF NOT EXISTS "winnerJustification" TEXT;

CREATE TABLE IF NOT EXISTS "ProcurementAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcurementAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProcurementAuditLog_tenantId_createdAt_idx" ON "ProcurementAuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProcurementAuditLog_entityType_entityId_idx" ON "ProcurementAuditLog"("entityType", "entityId");
