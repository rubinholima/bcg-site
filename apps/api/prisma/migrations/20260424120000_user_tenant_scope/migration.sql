-- Escopo por empresa/clube: utilizadores com linhas em UserTenant só veem esses tenants (exceto super_admin).
CREATE TABLE "UserTenant" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("userId","tenantId"),
    CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserTenant_userId_idx" ON "UserTenant"("userId");
CREATE INDEX "UserTenant_tenantId_idx" ON "UserTenant"("tenantId");
