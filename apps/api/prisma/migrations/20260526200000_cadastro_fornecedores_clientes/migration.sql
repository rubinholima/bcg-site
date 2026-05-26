-- Clientes (contas a receber) + vínculo em lançamentos financeiros
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "document" TEXT;

ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN IF NOT EXISTS "customerId" TEXT;

CREATE INDEX IF NOT EXISTS "FinanceiroLancamento_supplierId_idx" ON "FinanceiroLancamento"("supplierId");
CREATE INDEX IF NOT EXISTS "FinanceiroLancamento_customerId_idx" ON "FinanceiroLancamento"("customerId");

ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
