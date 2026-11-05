-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "address" TEXT;

-- CreateTable
CREATE TABLE "PurchaseQuoteInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "supplierEmail" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "itemsSnapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "purchaseQuoteId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseQuoteInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseQuoteInvite_token_key" ON "PurchaseQuoteInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseQuoteInvite_purchaseQuoteId_key" ON "PurchaseQuoteInvite"("purchaseQuoteId");

-- CreateIndex
CREATE INDEX "PurchaseQuoteInvite_requisitionId_idx" ON "PurchaseQuoteInvite"("requisitionId");

-- CreateIndex
CREATE INDEX "PurchaseQuoteInvite_tenantId_idx" ON "PurchaseQuoteInvite"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseQuoteInvite_status_idx" ON "PurchaseQuoteInvite"("status");

-- AddForeignKey
ALTER TABLE "PurchaseQuoteInvite" ADD CONSTRAINT "PurchaseQuoteInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseQuoteInvite" ADD CONSTRAINT "PurchaseQuoteInvite_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseQuoteInvite" ADD CONSTRAINT "PurchaseQuoteInvite_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseQuoteInvite" ADD CONSTRAINT "PurchaseQuoteInvite_purchaseQuoteId_fkey" FOREIGN KEY ("purchaseQuoteId") REFERENCES "PurchaseQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
