-- CreateTable
CREATE TABLE "InventoryDepartment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryDepartment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "departmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryDepartment_tenantId_name_key" ON "InventoryDepartment"("tenantId", "name");

-- CreateIndex
CREATE INDEX "InventoryDepartment_tenantId_active_idx" ON "InventoryDepartment"("tenantId", "active");

-- CreateIndex
CREATE INDEX "StockMovement_departmentId_idx" ON "StockMovement"("departmentId");

-- AddForeignKey
ALTER TABLE "InventoryDepartment" ADD CONSTRAINT "InventoryDepartment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "InventoryDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
