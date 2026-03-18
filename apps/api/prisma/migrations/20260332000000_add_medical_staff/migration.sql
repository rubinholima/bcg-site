-- CreateTable
CREATE TABLE "MedicalStaff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "crmCoren" TEXT,
    "specialty" TEXT,
    "photoUrl" TEXT,
    "birthDate" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "bio" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalStaff_tenantId_idx" ON "MedicalStaff"("tenantId");

-- CreateIndex
CREATE INDEX "MedicalStaff_tenantId_role_idx" ON "MedicalStaff"("tenantId", "role");

-- AddForeignKey
ALTER TABLE "MedicalStaff" ADD CONSTRAINT "MedicalStaff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
