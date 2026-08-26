-- Transição de retorno ao jogo na fisioterapia

ALTER TABLE "PhysioSession" ADD COLUMN "needsTransition" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PhysioSession" ADD COLUMN "transitionStartedAt" TIMESTAMP(3);
ALTER TABLE "PhysioSession" ADD COLUMN "transitionCompletedAt" TIMESTAMP(3);

CREATE TABLE "PhysioTransitionEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionDate" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "workTypeLabel" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "objective" TEXT,
    "activities" TEXT,
    "stillFeelsPain" BOOLEAN NOT NULL DEFAULT false,
    "evolutionScore" INTEGER,
    "staffId" TEXT,
    "staffName" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysioTransitionEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhysioTransitionEntry_sessionId_sessionDate_idx" ON "PhysioTransitionEntry"("sessionId", "sessionDate");

ALTER TABLE "PhysioTransitionEntry" ADD CONSTRAINT "PhysioTransitionEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PhysioSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
