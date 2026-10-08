-- AlterTable
ALTER TABLE "BchBarSaleItem" ADD COLUMN "unitCostSnapshot" DECIMAL(14,4),
ADD COLUMN "lineCostSnapshot" DECIMAL(14,4);

-- CreateTable
CREATE TABLE "BchBarProductCost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "physicalUnitId" TEXT,
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarProductCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BchBarClose" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventInventoryId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "snapshot" JSONB,
    "warnings" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BchBarProductCost_tenantId_productId_validFrom_idx" ON "BchBarProductCost"("tenantId", "productId", "validFrom");

-- CreateIndex
CREATE INDEX "BchBarProductCost_tenantId_productId_validTo_idx" ON "BchBarProductCost"("tenantId", "productId", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "BchBarClose_tenantId_eventInventoryId_key" ON "BchBarClose"("tenantId", "eventInventoryId");

-- CreateIndex
CREATE INDEX "BchBarClose_tenantId_eventId_idx" ON "BchBarClose"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "BchBarClose_tenantId_status_idx" ON "BchBarClose"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "BchBarProductCost" ADD CONSTRAINT "BchBarProductCost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarProductCost" ADD CONSTRAINT "BchBarProductCost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarProductCost" ADD CONSTRAINT "BchBarProductCost_physicalUnitId_fkey" FOREIGN KEY ("physicalUnitId") REFERENCES "BchBarProductPhysicalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarClose" ADD CONSTRAINT "BchBarClose_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarClose" ADD CONSTRAINT "BchBarClose_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarClose" ADD CONSTRAINT "BchBarClose_eventInventoryId_fkey" FOREIGN KEY ("eventInventoryId") REFERENCES "BchBarEventInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarClose" ADD CONSTRAINT "BchBarClose_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarClose" ADD CONSTRAINT "BchBarClose_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
