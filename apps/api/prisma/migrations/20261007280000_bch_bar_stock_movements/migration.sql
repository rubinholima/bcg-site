-- BCH Phase 4.2 — Bar stock movement ledger

CREATE TABLE "BchBarStockMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitBasis" TEXT,
    "eventId" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "sourceKey" TEXT,
    "transferGroupId" TEXT,
    "reversesMovementId" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BchBarStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchBarStockMovement_tenantId_sourceKey_key" ON "BchBarStockMovement"("tenantId", "sourceKey");
CREATE INDEX "BchBarStockMovement_tenantId_locationId_createdAt_idx" ON "BchBarStockMovement"("tenantId", "locationId", "createdAt");
CREATE INDEX "BchBarStockMovement_tenantId_productId_createdAt_idx" ON "BchBarStockMovement"("tenantId", "productId", "createdAt");
CREATE INDEX "BchBarStockMovement_tenantId_movementType_createdAt_idx" ON "BchBarStockMovement"("tenantId", "movementType", "createdAt");
CREATE INDEX "BchBarStockMovement_tenantId_eventId_idx" ON "BchBarStockMovement"("tenantId", "eventId");
CREATE INDEX "BchBarStockMovement_transferGroupId_idx" ON "BchBarStockMovement"("transferGroupId");

ALTER TABLE "BchBarStockMovement" ADD CONSTRAINT "BchBarStockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarStockMovement" ADD CONSTRAINT "BchBarStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarStockMovement" ADD CONSTRAINT "BchBarStockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarStockMovement" ADD CONSTRAINT "BchBarStockMovement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BchBarStockMovement" ADD CONSTRAINT "BchBarStockMovement_reversesMovementId_fkey" FOREIGN KEY ("reversesMovementId") REFERENCES "BchBarStockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarStockMovement" ADD CONSTRAINT "BchBarStockMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
