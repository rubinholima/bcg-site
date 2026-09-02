-- Agendamento e fluxo de avaliação no CT (captação)

ALTER TABLE "ScoutingProspect" ADD COLUMN "ctScheduleStatus" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN "ctScheduledAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN "ctScheduleNotes" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN "ctEvaluationStartedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN "ctEvaluationCompletedAt" TIMESTAMP(3);

CREATE INDEX "ScoutingProspect_tenantId_ctScheduleStatus_idx" ON "ScoutingProspect"("tenantId", "ctScheduleStatus");
