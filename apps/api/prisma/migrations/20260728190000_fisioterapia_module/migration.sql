-- Fisioterapia: regiões, diagnósticos, tratamentos e atendimentos

CREATE TABLE "PhysioBodyRegion" (
    "id" TEXT NOT NULL,
    "namePt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "bilateral" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PhysioBodyRegion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysioDiagnosis" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhysioDiagnosis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysioTreatment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT,
    "equipment" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhysioTreatment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysioSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" TEXT,
    "regionId" TEXT NOT NULL,
    "side" TEXT,
    "bodyMapView" TEXT,
    "bodyMapX" DOUBLE PRECISION,
    "bodyMapY" DOUBLE PRECISION,
    "symptoms" TEXT,
    "painScore" INTEGER,
    "diagnosisId" TEXT,
    "diagnosisLabel" TEXT,
    "treatmentId" TEXT,
    "treatmentLabel" TEXT,
    "treatmentNotes" TEXT,
    "estimatedDays" INTEGER,
    "estimatedEndDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "staffId" TEXT,
    "staffName" TEXT,
    "attachments" JSONB,
    "evolutionNotes" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PhysioSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhysioDiagnosis_regionId_name_key" ON "PhysioDiagnosis"("regionId", "name");
CREATE INDEX "PhysioDiagnosis_regionId_active_idx" ON "PhysioDiagnosis"("regionId", "active");
CREATE INDEX "PhysioTreatment_regionId_active_idx" ON "PhysioTreatment"("regionId", "active");
CREATE INDEX "PhysioTreatment_active_idx" ON "PhysioTreatment"("active");
CREATE INDEX "PhysioSession_tenantId_status_idx" ON "PhysioSession"("tenantId", "status");
CREATE INDEX "PhysioSession_playerId_status_idx" ON "PhysioSession"("playerId", "status");
CREATE INDEX "PhysioSession_regionId_idx" ON "PhysioSession"("regionId");
CREATE INDEX "PhysioSession_startedAt_idx" ON "PhysioSession"("startedAt");

ALTER TABLE "PhysioDiagnosis" ADD CONSTRAINT "PhysioDiagnosis_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "PhysioBodyRegion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioTreatment" ADD CONSTRAINT "PhysioTreatment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "PhysioBodyRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PhysioSession" ADD CONSTRAINT "PhysioSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioSession" ADD CONSTRAINT "PhysioSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioSession" ADD CONSTRAINT "PhysioSession_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "PhysioBodyRegion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysioSession" ADD CONSTRAINT "PhysioSession_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "PhysioDiagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PhysioSession" ADD CONSTRAINT "PhysioSession_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "PhysioTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
