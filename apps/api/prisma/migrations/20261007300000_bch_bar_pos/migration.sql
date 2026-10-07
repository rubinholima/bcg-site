-- CreateTable
CREATE TABLE "BchBarSale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "eventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "subtotal" DECIMAL(14,4) NOT NULL,
    "discountTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,4) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "terminalLabel" TEXT,
    "openedByUserId" TEXT,
    "closedByUserId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BchBarSaleItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellingUnitId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sellingUnitName" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "lineSubtotal" DECIMAL(14,4) NOT NULL,
    "lineDiscount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "priceId" TEXT,
    "inventorySourceKey" TEXT NOT NULL,
    "inventoryConsumedAt" TIMESTAMP(3),
    "inventoryMode" TEXT,
    "inventoryRefId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BchBarSalePayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "amountReceived" DECIMAL(14,4),
    "changeDue" DECIMAL(14,4),
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "reference" TEXT,
    "receivedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BchBarSalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BchBarSale_tenantId_saleNumber_key" ON "BchBarSale"("tenantId", "saleNumber");

-- CreateIndex
CREATE INDEX "BchBarSale_tenantId_status_openedAt_idx" ON "BchBarSale"("tenantId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "BchBarSale_tenantId_locationId_openedAt_idx" ON "BchBarSale"("tenantId", "locationId", "openedAt");

-- CreateIndex
CREATE INDEX "BchBarSale_tenantId_eventId_openedAt_idx" ON "BchBarSale"("tenantId", "eventId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BchBarSaleItem_tenantId_inventorySourceKey_key" ON "BchBarSaleItem"("tenantId", "inventorySourceKey");

-- CreateIndex
CREATE INDEX "BchBarSaleItem_saleId_idx" ON "BchBarSaleItem"("saleId");

-- CreateIndex
CREATE INDEX "BchBarSaleItem_tenantId_productId_idx" ON "BchBarSaleItem"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "BchBarSalePayment_saleId_idx" ON "BchBarSalePayment"("saleId");

-- CreateIndex
CREATE INDEX "BchBarSalePayment_tenantId_createdAt_idx" ON "BchBarSalePayment"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "BchBarSale" ADD CONSTRAINT "BchBarSale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSale" ADD CONSTRAINT "BchBarSale_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSale" ADD CONSTRAINT "BchBarSale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSale" ADD CONSTRAINT "BchBarSale_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSale" ADD CONSTRAINT "BchBarSale_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSaleItem" ADD CONSTRAINT "BchBarSaleItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSaleItem" ADD CONSTRAINT "BchBarSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "BchBarSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSaleItem" ADD CONSTRAINT "BchBarSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSaleItem" ADD CONSTRAINT "BchBarSaleItem_sellingUnitId_fkey" FOREIGN KEY ("sellingUnitId") REFERENCES "BchBarSellingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSaleItem" ADD CONSTRAINT "BchBarSaleItem_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "BchBarSellingUnitPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSalePayment" ADD CONSTRAINT "BchBarSalePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSalePayment" ADD CONSTRAINT "BchBarSalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "BchBarSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarSalePayment" ADD CONSTRAINT "BchBarSalePayment_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
