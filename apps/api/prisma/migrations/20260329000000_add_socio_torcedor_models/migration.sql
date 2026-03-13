-- Sócio Torcedor: Planos e Membros por clube (tenant)

CREATE TABLE IF NOT EXISTS "SocioPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "perks" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocioPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SocioPlan_tenantId_slug_key" UNIQUE ("tenantId", "slug"),
    CONSTRAINT "SocioPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SocioMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cpf" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL DEFAULT 0,
    "loyaltyTier" INTEGER NOT NULL DEFAULT 1,
    "externalId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocioMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SocioMember_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SocioPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SocioMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SocioPlan_tenantId_idx" ON "SocioPlan"("tenantId");
CREATE INDEX IF NOT EXISTS "SocioMember_tenantId_idx" ON "SocioMember"("tenantId");
CREATE INDEX IF NOT EXISTS "SocioMember_planId_idx" ON "SocioMember"("planId");
CREATE INDEX IF NOT EXISTS "SocioMember_status_idx" ON "SocioMember"("status");
CREATE INDEX IF NOT EXISTS "SocioMember_tenantId_email_idx" ON "SocioMember"("tenantId", "email");
