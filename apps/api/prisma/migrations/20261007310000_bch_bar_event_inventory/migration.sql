-- CreateTable
CREATE TABLE "BchBarEventInventory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "openedByUserId" TEXT,
    "closedByUserId" TEXT,
    "closeSnapshot" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarEventInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BchBarEventInventory_tenantId_eventId_idx" ON "BchBarEventInventory"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "BchBarEventInventory_tenantId_status_idx" ON "BchBarEventInventory"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BchBarEventInventory_tenantId_locationId_idx" ON "BchBarEventInventory"("tenantId", "locationId");

-- AddForeignKey
ALTER TABLE "BchBarEventInventory" ADD CONSTRAINT "BchBarEventInventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarEventInventory" ADD CONSTRAINT "BchBarEventInventory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarEventInventory" ADD CONSTRAINT "BchBarEventInventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarEventInventory" ADD CONSTRAINT "BchBarEventInventory_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarEventInventory" ADD CONSTRAINT "BchBarEventInventory_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
