-- GPS / localização de captadores

ALTER TABLE "Scout" ADD COLUMN "lastLatitude" DOUBLE PRECISION;
ALTER TABLE "Scout" ADD COLUMN "lastLongitude" DOUBLE PRECISION;
ALTER TABLE "Scout" ADD COLUMN "lastLocationLabel" TEXT;
ALTER TABLE "Scout" ADD COLUMN "lastLocationAt" TIMESTAMP(3);
ALTER TABLE "Scout" ADD COLUMN "isTracking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Scout" ADD COLUMN "trackingStartedAt" TIMESTAMP(3);

ALTER TABLE "ScoutingReport" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "ScoutingReport" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "ScoutingReport" ADD COLUMN "locationLabel" TEXT;

CREATE TABLE "ScoutLocationPing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "label" TEXT,
    "source" TEXT NOT NULL DEFAULT 'checkin',
    "reportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutLocationPing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScoutLocationPing_tenantId_createdAt_idx" ON "ScoutLocationPing"("tenantId", "createdAt");
CREATE INDEX "ScoutLocationPing_scoutId_createdAt_idx" ON "ScoutLocationPing"("scoutId", "createdAt");

ALTER TABLE "ScoutLocationPing" ADD CONSTRAINT "ScoutLocationPing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutLocationPing" ADD CONSTRAINT "ScoutLocationPing_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
