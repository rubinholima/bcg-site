-- Boston City Hall — catálogo comercial (serviços e pacotes)

CREATE TABLE "VenueCatalogService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "defaultPrice" DECIMAL(12,2) NOT NULL,
    "billingUnit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueCatalogService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueCatalogPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPrice" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueCatalogPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueCatalogPackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,

    CONSTRAINT "VenueCatalogPackageItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VenueCatalogService_tenantId_idx" ON "VenueCatalogService"("tenantId");
CREATE INDEX "VenueCatalogService_tenantId_active_idx" ON "VenueCatalogService"("tenantId", "active");
CREATE INDEX "VenueCatalogService_tenantId_category_idx" ON "VenueCatalogService"("tenantId", "category");

CREATE INDEX "VenueCatalogPackage_tenantId_idx" ON "VenueCatalogPackage"("tenantId");
CREATE INDEX "VenueCatalogPackage_tenantId_active_idx" ON "VenueCatalogPackage"("tenantId", "active");

CREATE INDEX "VenueCatalogPackageItem_packageId_idx" ON "VenueCatalogPackageItem"("packageId");
CREATE INDEX "VenueCatalogPackageItem_serviceId_idx" ON "VenueCatalogPackageItem"("serviceId");

CREATE UNIQUE INDEX "VenueCatalogPackageItem_packageId_serviceId_key" ON "VenueCatalogPackageItem"("packageId", "serviceId");

ALTER TABLE "VenueCatalogService" ADD CONSTRAINT "VenueCatalogService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VenueCatalogPackage" ADD CONSTRAINT "VenueCatalogPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VenueCatalogPackageItem" ADD CONSTRAINT "VenueCatalogPackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "VenueCatalogPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VenueCatalogPackageItem" ADD CONSTRAINT "VenueCatalogPackageItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "VenueCatalogService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
