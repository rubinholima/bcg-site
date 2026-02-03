-- AlterTable: Tenant - campos WorkMail
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "workmailOrganizationId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "domain" TEXT;

-- CreateTable: WorkMailAccount
CREATE TABLE "WorkMailAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "localPart" TEXT NOT NULL,
    "displayName" TEXT,
    "workmailUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkMailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkMailAuditLog
CREATE TABLE "WorkMailAuditLog" (
    "id" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkMailAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkMailAccount_organizationId_email_key" ON "WorkMailAccount"("organizationId", "email");

-- AddForeignKey
ALTER TABLE "WorkMailAccount" ADD CONSTRAINT "WorkMailAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: módulo Emails (só se não existir)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-emails', 'emails', 'Emails', 5
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'emails');

-- Seed: permissões Emails
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ema-sa', 'mod-emails', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-emails' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ema-ca', 'mod-emails', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-emails' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ema-ed', 'mod-emails', 'editor', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-emails' AND "role" = 'editor');
