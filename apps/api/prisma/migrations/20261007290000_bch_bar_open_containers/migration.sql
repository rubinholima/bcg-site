-- BCH Phase 4.3 — Open containers and portion consumption ledger

CREATE TABLE "BchBarOpenContainer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "physicalUnitId" TEXT NOT NULL,
    "eventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "contentUnit" TEXT NOT NULL,
    "originalContent" DECIMAL(14,4) NOT NULL,
    "remainingContent" DECIMAL(14,4) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedByUserId" TEXT,
    "closedByUserId" TEXT,
    "openStockMovementId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarOpenContainer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BchBarOpenContainer_tenantId_productId_locationId_status_idx" ON "BchBarOpenContainer"("tenantId", "productId", "locationId", "status");
CREATE INDEX "BchBarOpenContainer_tenantId_locationId_openedAt_idx" ON "BchBarOpenContainer"("tenantId", "locationId", "openedAt");

CREATE TABLE "BchBarOpenContainerLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "openContainerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sellingUnitId" TEXT,
    "recordType" TEXT NOT NULL,
    "consumptionType" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "contentDelta" DECIMAL(14,4),
    "remainingAfter" DECIMAL(14,4) NOT NULL,
    "eventId" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "sourceKey" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BchBarOpenContainerLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchBarOpenContainerLedger_tenantId_sourceKey_key" ON "BchBarOpenContainerLedger"("tenantId", "sourceKey");
CREATE INDEX "BchBarOpenContainerLedger_openContainerId_createdAt_idx" ON "BchBarOpenContainerLedger"("openContainerId", "createdAt");
CREATE INDEX "BchBarOpenContainerLedger_tenantId_productId_locationId_createdAt_idx" ON "BchBarOpenContainerLedger"("tenantId", "productId", "locationId", "createdAt");

ALTER TABLE "BchBarOpenContainer" ADD CONSTRAINT "BchBarOpenContainer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainer" ADD CONSTRAINT "BchBarOpenContainer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainer" ADD CONSTRAINT "BchBarOpenContainer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainer" ADD CONSTRAINT "BchBarOpenContainer_physicalUnitId_fkey" FOREIGN KEY ("physicalUnitId") REFERENCES "BchBarProductPhysicalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainer" ADD CONSTRAINT "BchBarOpenContainer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainer" ADD CONSTRAINT "BchBarOpenContainer_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainer" ADD CONSTRAINT "BchBarOpenContainer_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BchBarOpenContainerLedger" ADD CONSTRAINT "BchBarOpenContainerLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainerLedger" ADD CONSTRAINT "BchBarOpenContainerLedger_openContainerId_fkey" FOREIGN KEY ("openContainerId") REFERENCES "BchBarOpenContainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainerLedger" ADD CONSTRAINT "BchBarOpenContainerLedger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainerLedger" ADD CONSTRAINT "BchBarOpenContainerLedger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainerLedger" ADD CONSTRAINT "BchBarOpenContainerLedger_sellingUnitId_fkey" FOREIGN KEY ("sellingUnitId") REFERENCES "BchBarSellingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainerLedger" ADD CONSTRAINT "BchBarOpenContainerLedger_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BchBarOpenContainerLedger" ADD CONSTRAINT "BchBarOpenContainerLedger_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
