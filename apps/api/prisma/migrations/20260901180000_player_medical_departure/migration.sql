-- CreateTable
CREATE TABLE "PlayerMedicalDeparture" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" TEXT,
    "departedAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "destination" TEXT NOT NULL,
    "careType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "careSummary" TEXT,
    "transportMode" TEXT NOT NULL,
    "transportNotes" TEXT,
    "companionStaffId" TEXT,
    "companionName" TEXT,
    "companionPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'programada',
    "notes" TEXT,
    "documentIds" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerMedicalDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerMedicalDeparture_tenantId_status_idx" ON "PlayerMedicalDeparture"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PlayerMedicalDeparture_tenantId_departedAt_idx" ON "PlayerMedicalDeparture"("tenantId", "departedAt");

-- CreateIndex
CREATE INDEX "PlayerMedicalDeparture_playerId_departedAt_idx" ON "PlayerMedicalDeparture"("playerId", "departedAt");

-- CreateIndex
CREATE INDEX "PlayerMedicalDeparture_tenantId_category_idx" ON "PlayerMedicalDeparture"("tenantId", "category");

-- CreateIndex
CREATE INDEX "PlayerMedicalDeparture_careType_idx" ON "PlayerMedicalDeparture"("careType");

-- CreateIndex
CREATE INDEX "PlayerMedicalDeparture_transportMode_idx" ON "PlayerMedicalDeparture"("transportMode");

-- AddForeignKey
ALTER TABLE "PlayerMedicalDeparture" ADD CONSTRAINT "PlayerMedicalDeparture_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMedicalDeparture" ADD CONSTRAINT "PlayerMedicalDeparture_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
