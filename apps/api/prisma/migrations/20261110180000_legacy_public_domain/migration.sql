-- Domínios públicos legados (Nginx → origem Lightsail, fora do fluxo PublicDomain nativo).
CREATE TYPE "LegacyPublicDomainStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "LegacyPublicDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hostnameNormalized" TEXT NOT NULL,
    "status" "LegacyPublicDomainStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyPublicDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegacyPublicDomain_hostnameNormalized_key" ON "LegacyPublicDomain"("hostnameNormalized");
CREATE INDEX "LegacyPublicDomain_tenantId_idx" ON "LegacyPublicDomain"("tenantId");

ALTER TABLE "LegacyPublicDomain" ADD CONSTRAINT "LegacyPublicDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Registro histórico Villa Nova SAF (produção pré–PublicDomain).
INSERT INTO "LegacyPublicDomain" ("id", "tenantId", "hostnameNormalized", "status", "createdAt", "updatedAt")
SELECT
    'legpd_villa_nova_apex',
    t."id",
    'villanovasaf.com',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE t."slug" = 'villa-nova-saf'
  AND NOT EXISTS (
    SELECT 1 FROM "LegacyPublicDomain" ld WHERE ld."hostnameNormalized" = 'villanovasaf.com'
  );

INSERT INTO "LegacyPublicDomain" ("id", "tenantId", "hostnameNormalized", "status", "createdAt", "updatedAt")
SELECT
    'legpd_villa_nova_www',
    t."id",
    'www.villanovasaf.com',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE t."slug" = 'villa-nova-saf'
  AND NOT EXISTS (
    SELECT 1 FROM "LegacyPublicDomain" ld WHERE ld."hostnameNormalized" = 'www.villanovasaf.com'
  );
