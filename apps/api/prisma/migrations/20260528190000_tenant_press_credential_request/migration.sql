-- Solicitações de credencial de imprensa
CREATE TABLE "TenantPressCredentialRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "outlet" TEXT,
    "document" TEXT,
    "eventLabel" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPressCredentialRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantPressCredentialRequest_tenantId_idx" ON "TenantPressCredentialRequest"("tenantId");
CREATE INDEX "TenantPressCredentialRequest_status_idx" ON "TenantPressCredentialRequest"("status");

ALTER TABLE "TenantPressCredentialRequest" ADD CONSTRAINT "TenantPressCredentialRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
