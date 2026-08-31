-- Programa de transição (Performance/Fisiologia) separado do ciclo de fisioterapia

CREATE TABLE "PhysioTransitionProgram" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "originSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysioTransitionProgram_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhysioTransitionProgram_originSessionId_key" ON "PhysioTransitionProgram"("originSessionId");
CREATE INDEX "PhysioTransitionProgram_tenantId_status_idx" ON "PhysioTransitionProgram"("tenantId", "status");
CREATE INDEX "PhysioTransitionProgram_playerId_status_idx" ON "PhysioTransitionProgram"("playerId", "status");

CREATE UNIQUE INDEX "PhysioTransitionProgram_playerId_active_key"
  ON "PhysioTransitionProgram"("playerId")
  WHERE "status" = 'active';

ALTER TABLE "PhysioTransitionProgram" ADD CONSTRAINT "PhysioTransitionProgram_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioTransitionProgram" ADD CONSTRAINT "PhysioTransitionProgram_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioTransitionProgram" ADD CONSTRAINT "PhysioTransitionProgram_originSessionId_fkey"
  FOREIGN KEY ("originSessionId") REFERENCES "PhysioSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PhysioTransitionEntry" ADD COLUMN "programId" TEXT;
ALTER TABLE "PhysioTransitionEntry" ADD COLUMN "evolutionNote" TEXT;
ALTER TABLE "PhysioTransitionEntry" ADD COLUMN "needsNewSession" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: um programa por sessão com transição ou com entradas legadas
INSERT INTO "PhysioTransitionProgram" (
    "id",
    "tenantId",
    "playerId",
    "originSessionId",
    "status",
    "startedAt",
    "completedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'ptp_' || s."id",
    s."tenantId",
    s."playerId",
    s."id",
    CASE
        WHEN s."status" = 'cancelled' THEN 'cancelled'
        WHEN s."transitionCompletedAt" IS NOT NULL THEN 'completed'
        WHEN s."status" = 'completed' AND s."disposition" = 'alta' AND s."needsTransition" = true THEN 'completed'
        ELSE 'active'
    END,
    COALESCE(s."transitionStartedAt", s."endedAt", s."startedAt"),
    s."transitionCompletedAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "PhysioSession" s
WHERE s."needsTransition" = true
   OR EXISTS (
       SELECT 1 FROM "PhysioTransitionEntry" e WHERE e."sessionId" = s."id"
   )
ON CONFLICT ("originSessionId") DO NOTHING;

UPDATE "PhysioTransitionEntry" e
SET "programId" = p."id"
FROM "PhysioTransitionProgram" p
WHERE p."originSessionId" = e."sessionId"
  AND e."programId" IS NULL;

ALTER TABLE "PhysioTransitionEntry" ALTER COLUMN "programId" SET NOT NULL;

CREATE INDEX "PhysioTransitionEntry_programId_sessionDate_idx" ON "PhysioTransitionEntry"("programId", "sessionDate");

ALTER TABLE "PhysioTransitionEntry" ADD CONSTRAINT "PhysioTransitionEntry_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "PhysioTransitionProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
