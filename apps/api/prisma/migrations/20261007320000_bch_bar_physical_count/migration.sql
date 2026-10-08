-- CreateTable
CREATE TABLE "BchBarPhysicalCount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "eventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "startedByUserId" TEXT,
    "completedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarPhysicalCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BchBarPhysicalCountItem" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expectedQuantity" DECIMAL(14,4) NOT NULL,
    "countedQuantity" DECIMAL(14,4),
    "divergenceQuantity" DECIMAL(14,4),
    "unitBasis" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "adjustedMovementId" TEXT,
    "countedByUserId" TEXT,
    "countedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarPhysicalCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BchBarPhysicalCount_tenantId_locationId_status_idx" ON "BchBarPhysicalCount"("tenantId", "locationId", "status");

-- CreateIndex
CREATE INDEX "BchBarPhysicalCount_tenantId_eventId_completedAt_idx" ON "BchBarPhysicalCount"("tenantId", "eventId", "completedAt");

-- CreateIndex
CREATE INDEX "BchBarPhysicalCount_tenantId_status_startedAt_idx" ON "BchBarPhysicalCount"("tenantId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "BchBarPhysicalCountItem_countId_idx" ON "BchBarPhysicalCountItem"("countId");

-- CreateIndex
CREATE INDEX "BchBarPhysicalCountItem_productId_idx" ON "BchBarPhysicalCountItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BchBarPhysicalCountItem_countId_productId_key" ON "BchBarPhysicalCountItem"("countId", "productId");

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCount" ADD CONSTRAINT "BchBarPhysicalCount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCount" ADD CONSTRAINT "BchBarPhysicalCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCount" ADD CONSTRAINT "BchBarPhysicalCount_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCount" ADD CONSTRAINT "BchBarPhysicalCount_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCount" ADD CONSTRAINT "BchBarPhysicalCount_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCountItem" ADD CONSTRAINT "BchBarPhysicalCountItem_countId_fkey" FOREIGN KEY ("countId") REFERENCES "BchBarPhysicalCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCountItem" ADD CONSTRAINT "BchBarPhysicalCountItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCountItem" ADD CONSTRAINT "BchBarPhysicalCountItem_adjustedMovementId_fkey" FOREIGN KEY ("adjustedMovementId") REFERENCES "BchBarStockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchBarPhysicalCountItem" ADD CONSTRAINT "BchBarPhysicalCountItem_countedByUserId_fkey" FOREIGN KEY ("countedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
