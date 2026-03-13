-- CreateTable
CREATE TABLE "TechnicalStaff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "role" TEXT NOT NULL,
    "categories" JSONB,
    "birthDate" TEXT,
    "nationality" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "licenseType" TEXT,
    "licenseNumber" TEXT,
    "licenseValidUntil" TIMESTAMP(3),
    "contractType" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "bio" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TechnicalStaff_tenantId_idx" ON "TechnicalStaff"("tenantId");

-- CreateIndex
CREATE INDEX "TechnicalStaff_tenantId_role_idx" ON "TechnicalStaff"("tenantId", "role");

-- AddForeignKey
ALTER TABLE "TechnicalStaff" ADD CONSTRAINT "TechnicalStaff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
