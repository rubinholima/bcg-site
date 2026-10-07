-- BCH Phase 4.1 — Bar catalog, selling units, prices, inventory locations

CREATE TABLE "BchBarProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchBarProduct_tenantId_sku_key" ON "BchBarProduct"("tenantId", "sku");
CREATE INDEX "BchBarProduct_tenantId_active_idx" ON "BchBarProduct"("tenantId", "active");
CREATE INDEX "BchBarProduct_tenantId_category_idx" ON "BchBarProduct"("tenantId", "category");

CREATE TABLE "BchBarProductPhysicalUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "label" TEXT,
    "volumeMl" INTEGER,
    "quantityBasis" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarProductPhysicalUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchBarProductPhysicalUnit_productId_key" ON "BchBarProductPhysicalUnit"("productId");
CREATE INDEX "BchBarProductPhysicalUnit_tenantId_idx" ON "BchBarProductPhysicalUnit"("tenantId");

CREATE TABLE "BchBarSellingUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "portionAmount" DECIMAL(12,4),
    "portionUnit" TEXT,
    "physicalUnitsConsumedPerSale" DECIMAL(12,6) NOT NULL,
    "expectedPortionsPerPhysical" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarSellingUnit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BchBarSellingUnit_tenantId_productId_idx" ON "BchBarSellingUnit"("tenantId", "productId");
CREATE INDEX "BchBarSellingUnit_productId_sortOrder_idx" ON "BchBarSellingUnit"("productId", "sortOrder");

CREATE TABLE "BchBarSellingUnitPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sellingUnitId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarSellingUnitPrice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BchBarSellingUnitPrice_tenantId_sellingUnitId_idx" ON "BchBarSellingUnitPrice"("tenantId", "sellingUnitId");
CREATE INDEX "BchBarSellingUnitPrice_sellingUnitId_active_idx" ON "BchBarSellingUnitPrice"("sellingUnitId", "active");

CREATE TABLE "BchBarInventoryLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'central',
    "eventId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchBarInventoryLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchBarInventoryLocation_tenantId_code_key" ON "BchBarInventoryLocation"("tenantId", "code");
CREATE INDEX "BchBarInventoryLocation_tenantId_kind_idx" ON "BchBarInventoryLocation"("tenantId", "kind");

CREATE TABLE "BchBarStockBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BchBarStockBalance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchBarStockBalance_productId_locationId_key" ON "BchBarStockBalance"("productId", "locationId");
CREATE INDEX "BchBarStockBalance_tenantId_locationId_idx" ON "BchBarStockBalance"("tenantId", "locationId");

ALTER TABLE "BchBarProduct" ADD CONSTRAINT "BchBarProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BchBarProductPhysicalUnit" ADD CONSTRAINT "BchBarProductPhysicalUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarProductPhysicalUnit" ADD CONSTRAINT "BchBarProductPhysicalUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BchBarSellingUnit" ADD CONSTRAINT "BchBarSellingUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarSellingUnit" ADD CONSTRAINT "BchBarSellingUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BchBarSellingUnitPrice" ADD CONSTRAINT "BchBarSellingUnitPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarSellingUnitPrice" ADD CONSTRAINT "BchBarSellingUnitPrice_sellingUnitId_fkey" FOREIGN KEY ("sellingUnitId") REFERENCES "BchBarSellingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BchBarInventoryLocation" ADD CONSTRAINT "BchBarInventoryLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarInventoryLocation" ADD CONSTRAINT "BchBarInventoryLocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BchBarStockBalance" ADD CONSTRAINT "BchBarStockBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchBarStockBalance" ADD CONSTRAINT "BchBarStockBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BchBarProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchBarStockBalance" ADD CONSTRAINT "BchBarStockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
