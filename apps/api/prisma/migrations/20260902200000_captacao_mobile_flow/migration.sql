-- Captação mobile-first: responsável, fluxo direto, filas supervisor/gerente
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "guardianName" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "guardianPhone" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "guardianEmail" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "guardianAddress" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "flowPath" TEXT DEFAULT 'tryout';
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "proposedCtAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "ctRoom" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "supervisorCtConfirmedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "supervisorCtConfirmedBy" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "managerDecision" TEXT DEFAULT 'pendente';
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "managerDecisionAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "managerDecisionBy" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "managerDecisionNotes" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN IF NOT EXISTS "workflowLog" JSONB;
