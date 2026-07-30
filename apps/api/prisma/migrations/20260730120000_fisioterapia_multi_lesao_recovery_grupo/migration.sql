-- Multi local de dor / multi diagnóstico + Recovery em grupo

CREATE TABLE "PhysioSessionRegion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "side" TEXT,
    "bodyMapView" TEXT,
    "bodyMapX" DOUBLE PRECISION,
    "bodyMapY" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PhysioSessionRegion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysioSessionDiagnosis" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "regionId" TEXT,
    "diagnosisId" TEXT,
    "diagnosisLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PhysioSessionDiagnosis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysioGroupSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sessionDate" TEXT NOT NULL,
    "description" TEXT,
    "staffId" TEXT,
    "staffName" TEXT,
    "location" TEXT,
    "attendance" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysioGroupSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhysioSessionRegion_sessionId_idx" ON "PhysioSessionRegion"("sessionId");
CREATE INDEX "PhysioSessionRegion_regionId_idx" ON "PhysioSessionRegion"("regionId");
CREATE INDEX "PhysioSessionDiagnosis_sessionId_idx" ON "PhysioSessionDiagnosis"("sessionId");
CREATE INDEX "PhysioGroupSession_tenantId_sessionDate_idx" ON "PhysioGroupSession"("tenantId", "sessionDate");
CREATE INDEX "PhysioGroupSession_tenantId_category_idx" ON "PhysioGroupSession"("tenantId", "category");

ALTER TABLE "PhysioSessionRegion" ADD CONSTRAINT "PhysioSessionRegion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PhysioSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioSessionRegion" ADD CONSTRAINT "PhysioSessionRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "PhysioBodyRegion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysioSessionDiagnosis" ADD CONSTRAINT "PhysioSessionDiagnosis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PhysioSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysioSessionDiagnosis" ADD CONSTRAINT "PhysioSessionDiagnosis_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "PhysioDiagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PhysioGroupSession" ADD CONSTRAINT "PhysioGroupSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: copiar região/diagnóstico únicos existentes
INSERT INTO "PhysioSessionRegion" ("id", "sessionId", "regionId", "side", "bodyMapView", "bodyMapX", "bodyMapY", "sortOrder")
SELECT
  'psr_' || "id",
  "id",
  "regionId",
  "side",
  "bodyMapView",
  "bodyMapX",
  "bodyMapY",
  0
FROM "PhysioSession";

INSERT INTO "PhysioSessionDiagnosis" ("id", "sessionId", "regionId", "diagnosisId", "diagnosisLabel", "sortOrder")
SELECT
  'psd_' || "id",
  "id",
  "regionId",
  "diagnosisId",
  "diagnosisLabel",
  0
FROM "PhysioSession"
WHERE "diagnosisId" IS NOT NULL OR ("diagnosisLabel" IS NOT NULL AND TRIM("diagnosisLabel") <> '');
