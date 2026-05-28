-- Códigos temporários de acesso à página de imprensa (modo menu)
CREATE TABLE "TenantPressPageAccessCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPressPageAccessCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantPressPageAccessCode_tenantId_code_key" ON "TenantPressPageAccessCode"("tenantId", "code");
CREATE INDEX "TenantPressPageAccessCode_tenantId_idx" ON "TenantPressPageAccessCode"("tenantId");
CREATE INDEX "TenantPressPageAccessCode_expiresAt_idx" ON "TenantPressPageAccessCode"("expiresAt");

ALTER TABLE "TenantPressPageAccessCode" ADD CONSTRAINT "TenantPressPageAccessCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
