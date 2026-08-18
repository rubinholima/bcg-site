-- Assistência Social / Pedagogia

CREATE TABLE "PlayerGuardian" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "cpf" TEXT,
    "address" JSONB,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerGuardian_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerSchoolEnrollment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "grade" TEXT,
    "period" TEXT,
    "shift" TEXT,
    "city" TEXT,
    "coordinatorName" TEXT,
    "coordinatorEmail" TEXT,
    "coordinatorPhone" TEXT,
    "schoolYear" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSchoolEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialPedagogyCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerLabel" TEXT,
    "triggerRefType" TEXT,
    "triggerRefId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'coleta',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "contactValidation" JSONB,
    "agendaSnapshot" JSONB,
    "schoolNotificationText" TEXT,
    "schoolNotificationSentAt" TIMESTAMP(3),
    "schoolNotificationChannel" TEXT,
    "schoolResponseNotes" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPedagogyCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialPedagogyDocument" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "caseId" TEXT,
    "documentType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "schoolYear" TEXT,
    "period" TEXT,
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPedagogyDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerGuardian_playerId_idx" ON "PlayerGuardian"("playerId");
CREATE INDEX "PlayerSchoolEnrollment_playerId_idx" ON "PlayerSchoolEnrollment"("playerId");
CREATE INDEX "PlayerSchoolEnrollment_status_idx" ON "PlayerSchoolEnrollment"("status");
CREATE INDEX "SocialPedagogyCase_tenantId_idx" ON "SocialPedagogyCase"("tenantId");
CREATE INDEX "SocialPedagogyCase_playerId_idx" ON "SocialPedagogyCase"("playerId");
CREATE INDEX "SocialPedagogyCase_status_idx" ON "SocialPedagogyCase"("status");
CREATE INDEX "SocialPedagogyCase_triggerType_idx" ON "SocialPedagogyCase"("triggerType");
CREATE INDEX "SocialPedagogyDocument_playerId_idx" ON "SocialPedagogyDocument"("playerId");
CREATE INDEX "SocialPedagogyDocument_caseId_idx" ON "SocialPedagogyDocument"("caseId");
CREATE INDEX "SocialPedagogyDocument_documentType_idx" ON "SocialPedagogyDocument"("documentType");

ALTER TABLE "PlayerGuardian" ADD CONSTRAINT "PlayerGuardian_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerSchoolEnrollment" ADD CONSTRAINT "PlayerSchoolEnrollment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialPedagogyCase" ADD CONSTRAINT "SocialPedagogyCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialPedagogyCase" ADD CONSTRAINT "SocialPedagogyCase_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialPedagogyDocument" ADD CONSTRAINT "SocialPedagogyDocument_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialPedagogyDocument" ADD CONSTRAINT "SocialPedagogyDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SocialPedagogyCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-futebol-assistencia-social', 'futebol_assistencia_social', 'Assistência Social / Pedagogia', 37, 'futebol_tecnico'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_assistencia_social');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fas-sa', 'mod-futebol-assistencia-social', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-assistencia-social' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fas-ca', 'mod-futebol-assistencia-social', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-assistencia-social' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fas-ed', 'mod-futebol-assistencia-social', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-assistencia-social' AND "role" = 'editor');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fas-co', 'mod-futebol-assistencia-social', 'comissao', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-assistencia-social' AND "role" = 'comissao');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fas-an', 'mod-futebol-assistencia-social', 'analista', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-assistencia-social' AND "role" = 'analista');
