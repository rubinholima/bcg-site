-- Módulo Treinadores — relatório pós-jogo e planejamento de treinos

CREATE TABLE "CoachMatchReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "travelLogisticsId" TEXT,
    "category" TEXT,
    "staffId" TEXT,
    "authorUserId" TEXT,
    "matchDate" TIMESTAMP(3),
    "opponentName" TEXT,
    "teamReport" TEXT,
    "generalNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachMatchReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachMatchReportPlayerRating" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "individualReport" TEXT,

    CONSTRAINT "CoachMatchReportPlayerRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachMatchReportAttachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "label" TEXT,
    "fileUrl" TEXT NOT NULL,
    "kind" TEXT,

    CONSTRAINT "CoachMatchReportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachTrainingSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "staffId" TEXT,
    "authorUserId" TEXT,
    "sessionDate" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "objectives" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachTrainingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachTrainingActivity" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mediaUrl" TEXT,

    CONSTRAINT "CoachTrainingActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachTrainingPlayerEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "unavailableReason" TEXT,
    "rating" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "CoachTrainingPlayerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachMatchReport_travelLogisticsId_key" ON "CoachMatchReport"("travelLogisticsId");
CREATE INDEX "CoachMatchReport_tenantId_category_idx" ON "CoachMatchReport"("tenantId", "category");
CREATE INDEX "CoachMatchReport_tenantId_matchDate_idx" ON "CoachMatchReport"("tenantId", "matchDate");
CREATE INDEX "CoachMatchReport_staffId_idx" ON "CoachMatchReport"("staffId");

CREATE UNIQUE INDEX "CoachMatchReportPlayerRating_reportId_playerId_key" ON "CoachMatchReportPlayerRating"("reportId", "playerId");
CREATE INDEX "CoachMatchReportPlayerRating_playerId_idx" ON "CoachMatchReportPlayerRating"("playerId");

CREATE INDEX "CoachMatchReportAttachment_reportId_idx" ON "CoachMatchReportAttachment"("reportId");

CREATE INDEX "CoachTrainingSession_tenantId_category_idx" ON "CoachTrainingSession"("tenantId", "category");
CREATE INDEX "CoachTrainingSession_tenantId_sessionDate_idx" ON "CoachTrainingSession"("tenantId", "sessionDate");
CREATE INDEX "CoachTrainingSession_staffId_idx" ON "CoachTrainingSession"("staffId");

CREATE INDEX "CoachTrainingActivity_sessionId_sortOrder_idx" ON "CoachTrainingActivity"("sessionId", "sortOrder");

CREATE UNIQUE INDEX "CoachTrainingPlayerEntry_sessionId_playerId_key" ON "CoachTrainingPlayerEntry"("sessionId", "playerId");
CREATE INDEX "CoachTrainingPlayerEntry_playerId_idx" ON "CoachTrainingPlayerEntry"("playerId");

ALTER TABLE "CoachMatchReport" ADD CONSTRAINT "CoachMatchReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachMatchReport" ADD CONSTRAINT "CoachMatchReport_travelLogisticsId_fkey" FOREIGN KEY ("travelLogisticsId") REFERENCES "TravelLogistics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CoachMatchReport" ADD CONSTRAINT "CoachMatchReport_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TechnicalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CoachMatchReportPlayerRating" ADD CONSTRAINT "CoachMatchReportPlayerRating_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CoachMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachMatchReportPlayerRating" ADD CONSTRAINT "CoachMatchReportPlayerRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachMatchReportAttachment" ADD CONSTRAINT "CoachMatchReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CoachMatchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachTrainingSession" ADD CONSTRAINT "CoachTrainingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachTrainingSession" ADD CONSTRAINT "CoachTrainingSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TechnicalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CoachTrainingActivity" ADD CONSTRAINT "CoachTrainingActivity_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachTrainingPlayerEntry" ADD CONSTRAINT "CoachTrainingPlayerEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachTrainingPlayerEntry" ADD CONSTRAINT "CoachTrainingPlayerEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-futebol-treinadores', 'futebol_treinadores', 'Treinadores', 37, 'futebol_tecnico'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_treinadores');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ftre-sa', 'mod-futebol-treinadores', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-treinadores' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ftre-ca', 'mod-futebol-treinadores', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-treinadores' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ftre-ed', 'mod-futebol-treinadores', 'editor', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-treinadores' AND "role" = 'editor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ftre-tr', 'mod-futebol-treinadores', 'treinador', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-treinadores' AND "role" = 'treinador');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ftre-co', 'mod-futebol-treinadores', 'comissao', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-treinadores' AND "role" = 'comissao');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ftre-an', 'mod-futebol-treinadores', 'analista', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-treinadores' AND "role" = 'analista');
