-- AlterTable: Tenant - substituir coluna kind por kindId (FK) e adicionar location
ALTER TABLE "Tenant" DROP COLUMN IF EXISTS "kind";
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "kindId" TEXT NOT NULL;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AddForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_kindId_fkey";
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_kindId_fkey" FOREIGN KEY ("kindId") REFERENCES "TenantKind"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
