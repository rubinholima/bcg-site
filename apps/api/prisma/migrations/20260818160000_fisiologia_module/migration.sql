-- CreateTable
CREATE TABLE "PhysiologyAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" TEXT,
    "assessmentType" TEXT NOT NULL DEFAULT 'rotina',
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "evaluatorRole" TEXT,
    "evaluatorName" TEXT,
    "evaluatorStaffId" TEXT,
    "ageYears" INTEGER,
    "ageMonths" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "skinfolds" JSONB,
    "protocol" TEXT,
    "bodyFatPercent" DOUBLE PRECISION,
    "leanMassKg" DOUBLE PRECISION,
    "bodyMassKg" DOUBLE PRECISION,
    "compositionStatus" TEXT,
    "vo2max" DOUBLE PRECISION,
    "cmjCm" DOUBLE PRECISION,
    "illinoisSec" DOUBLE PRECISION,
    "tTestSec" DOUBLE PRECISION,
    "sprint10m" DOUBLE PRECISION,
    "sprint20m" DOUBLE PRECISION,
    "yoyoDistance" DOUBLE PRECISION,
    "rastPower" DOUBLE PRECISION,
    "mobilityNotes" TEXT,
    "physicalTests" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysiologyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysiologyHydration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "contextType" TEXT NOT NULL,
    "weightBefore" DOUBLE PRECISION,
    "weightAfter" DOUBLE PRECISION,
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysiologyHydration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysiologyLoadSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sessionDate" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "period" TEXT,
    "trainingType" TEXT,
    "staffId" TEXT,
    "staffName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysiologyLoadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysiologyLoadEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "rpe" INTEGER,
    "actualLoad" DOUBLE PRECISION,
    "trainingMinutes" INTEGER,
    "gameMinutes" INTEGER,
    "maxDistanceM" DOUBLE PRECISION,
    "maxSpeedKmh" DOUBLE PRECISION,
    "sprintCount" INTEGER,
    "highIntensityDistanceM" DOUBLE PRECISION,
    "lowIntensityDistanceM" DOUBLE PRECISION,
    "sprintDistanceM" DOUBLE PRECISION,
    "gpsImportLabel" TEXT,
    "gpsData" JSONB,
    "notes" TEXT,

    CONSTRAINT "PhysiologyLoadEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhysiologyAssessment_tenantId_category_idx" ON "PhysiologyAssessment"("tenantId", "category");

-- CreateIndex
CREATE INDEX "PhysiologyAssessment_playerId_assessedAt_idx" ON "PhysiologyAssessment"("playerId", "assessedAt");

-- CreateIndex
CREATE INDEX "PhysiologyAssessment_assessedAt_idx" ON "PhysiologyAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "PhysiologyHydration_tenantId_recordedAt_idx" ON "PhysiologyHydration"("tenantId", "recordedAt");

-- CreateIndex
CREATE INDEX "PhysiologyHydration_playerId_recordedAt_idx" ON "PhysiologyHydration"("playerId", "recordedAt");

-- CreateIndex
CREATE INDEX "PhysiologyLoadSession_tenantId_sessionDate_idx" ON "PhysiologyLoadSession"("tenantId", "sessionDate");

-- CreateIndex
CREATE INDEX "PhysiologyLoadSession_tenantId_category_sessionDate_idx" ON "PhysiologyLoadSession"("tenantId", "category", "sessionDate");

-- CreateIndex
CREATE INDEX "PhysiologyLoadEntry_playerId_idx" ON "PhysiologyLoadEntry"("playerId");

-- CreateIndex
CREATE INDEX "PhysiologyLoadEntry_sessionId_idx" ON "PhysiologyLoadEntry"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PhysiologyLoadEntry_sessionId_playerId_key" ON "PhysiologyLoadEntry"("sessionId", "playerId");

-- AddForeignKey
ALTER TABLE "PhysiologyAssessment" ADD CONSTRAINT "PhysiologyAssessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysiologyAssessment" ADD CONSTRAINT "PhysiologyAssessment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysiologyHydration" ADD CONSTRAINT "PhysiologyHydration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysiologyHydration" ADD CONSTRAINT "PhysiologyHydration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysiologyLoadSession" ADD CONSTRAINT "PhysiologyLoadSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysiologyLoadEntry" ADD CONSTRAINT "PhysiologyLoadEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PhysiologyLoadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysiologyLoadEntry" ADD CONSTRAINT "PhysiologyLoadEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
