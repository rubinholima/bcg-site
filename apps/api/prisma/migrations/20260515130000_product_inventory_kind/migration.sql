-- AlterTable
ALTER TABLE "Product" ADD COLUMN "inventoryKind" TEXT NOT NULL DEFAULT 'geral';
ALTER TABLE "Product" ADD COLUMN "squadTags" JSONB;

-- CreateIndex
CREATE INDEX "Product_tenantId_inventoryKind_idx" ON "Product"("tenantId", "inventoryKind");
