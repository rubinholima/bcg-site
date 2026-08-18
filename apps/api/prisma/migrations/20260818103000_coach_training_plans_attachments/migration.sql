-- Biblioteca de planos de treino + anexos por sessão + vínculo com agenda

CREATE TABLE "CoachTrainingPlanTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "notes" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachTrainingPlanTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachTrainingSessionAttachment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "label" TEXT,
    "fileUrl" TEXT NOT NULL,
    "kind" TEXT,

    CONSTRAINT "CoachTrainingSessionAttachment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CoachTrainingSession" ADD COLUMN "agendaEntryId" TEXT;
ALTER TABLE "CoachTrainingSession" ADD COLUMN "planTemplateId" TEXT;

CREATE INDEX "CoachTrainingPlanTemplate_tenantId_category_idx" ON "CoachTrainingPlanTemplate"("tenantId", "category");
CREATE INDEX "CoachTrainingSessionAttachment_sessionId_idx" ON "CoachTrainingSessionAttachment"("sessionId");
CREATE INDEX "CoachTrainingSession_agendaEntryId_idx" ON "CoachTrainingSession"("agendaEntryId");
CREATE INDEX "CoachTrainingSession_planTemplateId_idx" ON "CoachTrainingSession"("planTemplateId");

ALTER TABLE "CoachTrainingPlanTemplate" ADD CONSTRAINT "CoachTrainingPlanTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachTrainingSessionAttachment" ADD CONSTRAINT "CoachTrainingSessionAttachment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachTrainingSession" ADD CONSTRAINT "CoachTrainingSession_agendaEntryId_fkey" FOREIGN KEY ("agendaEntryId") REFERENCES "FootballAgendaEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CoachTrainingSession" ADD CONSTRAINT "CoachTrainingSession_planTemplateId_fkey" FOREIGN KEY ("planTemplateId") REFERENCES "CoachTrainingPlanTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
