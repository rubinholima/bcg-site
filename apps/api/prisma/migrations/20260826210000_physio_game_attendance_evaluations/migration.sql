-- Atendimentos de jogo e avaliações fisioterapêuticas

CREATE TABLE "PhysioGameAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" TEXT,
    "gameDate" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "careCategory" TEXT NOT NULL,
    "procedureKey" TEXT NOT NULL,
    "procedureLabel" TEXT,
    "treatmentReason" TEXT,
    "bodyLocation" TEXT NOT NULL,
    "bodyLocationLabel" TEXT,
    "notes" TEXT,
    "staffId" TEXT,
    "staffName" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysioGameAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysioPlayerEvaluation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" TEXT,
    "context" TEXT NOT NULL,
    "finalObservations" TEXT,
    "outcome" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffId" TEXT,
    "staffName" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysioPlayerEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysioPlayerEvaluationTest" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "testTypeLabel" TEXT,
    "bodyLocation" TEXT NOT NULL,
    "bodyLocationLabel" TEXT,
    "score" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PhysioPlayerEvaluationTest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhysioGameAttendance_tenantId_gameDate_idx" ON "PhysioGameAttendance"("tenantId", "gameDate");
CREATE INDEX "PhysioGameAttendance_playerId_gameDate_idx" ON "PhysioGameAttendance"("playerId", "gameDate");
CREATE INDEX "PhysioGameAttendance_tenantId_category_gameDate_idx" ON "PhysioGameAttendance"("tenantId", "category", "gameDate");

CREATE INDEX "PhysioPlayerEvaluation_tenantId_context_idx" ON "PhysioPlayerEvaluation"("tenantId", "context");
CREATE INDEX "PhysioPlayerEvaluation_playerId_evaluatedAt_idx" ON "PhysioPlayerEvaluation"("playerId", "evaluatedAt");

CREATE INDEX "PhysioPlayerEvaluationTest_evaluationId_idx" ON "PhysioPlayerEvaluationTest"("evaluationId");

ALTER TABLE "PhysioGameAttendance" ADD CONSTRAINT "PhysioGameAttendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioGameAttendance" ADD CONSTRAINT "PhysioGameAttendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhysioPlayerEvaluation" ADD CONSTRAINT "PhysioPlayerEvaluation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioPlayerEvaluation" ADD CONSTRAINT "PhysioPlayerEvaluation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhysioPlayerEvaluationTest" ADD CONSTRAINT "PhysioPlayerEvaluationTest_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PhysioPlayerEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
