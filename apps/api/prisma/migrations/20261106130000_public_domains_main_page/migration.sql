-- CreateEnum
CREATE TYPE "PublicDomainStatus" AS ENUM ('DISABLED', 'PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "PublicDomainVerificationStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PublicDomainSslStatus" AS ENUM ('PENDING', 'ISSUED', 'FAILED');

-- CreateEnum
CREATE TYPE "PublicDomainProvisioningStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING_VERIFICATION', 'DNS_PENDING', 'CERTIFICATE_PENDING', 'PROVISIONING', 'ACTIVE', 'ERROR', 'DISABLED');

-- AlterTable (FK após backfill — ver abaixo)
ALTER TABLE "Tenant" ADD COLUMN "mainPublicPageId" TEXT;

-- CreateTable
CREATE TABLE "PublicDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hostnameNormalized" TEXT NOT NULL,
    "isCanonical" BOOLEAN NOT NULL DEFAULT true,
    "status" "PublicDomainStatus" NOT NULL DEFAULT 'DISABLED',
    "verificationStatus" "PublicDomainVerificationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "sslStatus" "PublicDomainSslStatus" NOT NULL DEFAULT 'PENDING',
    "provisioningStatus" "PublicDomainProvisioningStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "verificationTokenHash" TEXT,
    "verificationExpiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'aws',
    "hostedZoneId" TEXT,
    "certificateArn" TEXT,
    "distributionId" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicDomain_hostnameNormalized_key" ON "PublicDomain"("hostnameNormalized");

-- CreateIndex
CREATE INDEX "PublicDomain_tenantId_idx" ON "PublicDomain"("tenantId");

-- AddForeignKey
ALTER TABLE "PublicDomain" ADD CONSTRAINT "PublicDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Módulo CUP360: domínio público (empresa — Configurações → Empresa)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT 'mod-cup360-public-domains', 'cup360_public_domains', 'Domínio público (site)', 92, 'empresa_usuarios', 'paginas'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'cup360_public_domains');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-cup360-pd-' || pr."slug", m."id", pr."slug", false
FROM "Module" m
CROSS JOIN "PlatformRole" pr
WHERE m."slug" = 'cup360_public_domains'
  AND pr."includeInMatrix" = true
  AND pr."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "ModuleRole" mr
    WHERE mr."moduleId" = m."id" AND mr."role" = pr."slug"
  );

UPDATE "ModuleRole" mr
SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id"
  AND m."slug" = 'cup360_public_domains'
  AND mr."role" IN ('super_admin', 'company_admin');

-- Backfill: define página principal explícita = primeira "main" por tenant (determinístico)
UPDATE "Tenant" t
SET "mainPublicPageId" = p."id"
FROM (
  SELECT DISTINCT ON ("tenantId") "id", "tenantId"
  FROM "Page"
  WHERE "slug" = 'main'
  ORDER BY "tenantId", "updatedAt" DESC, "id"
) p
WHERE t."id" = p."tenantId" AND t."mainPublicPageId" IS NULL;

UPDATE "Tenant" t
SET "mainPublicPageId" = p."id"
FROM (
  SELECT DISTINCT ON ("tenantId") "id", "tenantId"
  FROM "Page"
  ORDER BY "tenantId", "slug" ASC, "updatedAt" DESC, "id"
) p
WHERE t."id" = p."tenantId" AND t."mainPublicPageId" IS NULL;

-- Unique + FK após backfill (NULLs permitidos no índice único do Postgres 15+: vários NULL ok)
CREATE UNIQUE INDEX "Tenant_mainPublicPageId_key" ON "Tenant"("mainPublicPageId");

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_mainPublicPageId_fkey" FOREIGN KEY ("mainPublicPageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
